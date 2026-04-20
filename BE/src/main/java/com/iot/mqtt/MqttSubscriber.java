package com.iot.mqtt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.config.MqttConfig;
import com.iot.entity.ActionHistory;
import com.iot.entity.DataSensor;
import com.iot.entity.Device;
import com.iot.entity.Sensor;
import com.iot.repository.actionHistoryRepository;
import com.iot.repository.dataSensorRepository;
import com.iot.repository.deviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class MqttSubscriber {

    private static final int ADC_MAX = 4095;
    private static final double LIGHT_VREF = 3.3;
    private static final double LIGHT_K = 12518931.0;
    private static final double LIGHT_R = 10000.0;
    private static final double LIGHT_GAMMA = 1.405;
    private static final double LIGHT_MAX_LUX = 100000.0;
    private static final int RECONNECT_SYNC_DEBOUNCE_SECONDS = 10;
    private static final double WIND_WARNING_THRESHOLD = 60.0;
    private static final List<String> RECONNECT_TARGET_DEVICES = List.of("fan", "air_condition", "light_bulb");

    private final dataSensorRepository dataSensorRepo;
    private final actionHistoryRepository actionHistoryRepo;
    private final deviceRepository deviceRepo;
    private final MqttConfig.MqttGateway mqttGateway;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private LocalDateTime lastReconnectSyncAt;
    private boolean warningLightActive;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(String payload, @Header("mqtt_receivedTopic") String topic) {
        try {
            //XỬ LÝ DỮ LIỆU SENSOR
            if ("sensor/data".equals(topic)) {
                JsonNode json = objectMapper.readTree(payload);
                LocalDateTime now = LocalDateTime.now();

                // Chẻ dữ liệu và lưu vào DB (Khớp với các ID Sensor: 1-Nhiệt độ, 2-Độ ẩm, 3-Ánh sáng, 4-Gió)
                if (json.has("temperature")) {
                    saveSensorToDb(json.get("temperature").asDouble(), 1L, now);
                }
                if (json.has("humidity")) {
                    saveSensorToDb(json.get("humidity").asDouble(), 2L, now);
                }
                if (json.has("light")) {
                    double lightLux = convertLightRawToLux(json.get("light").asDouble());
                    saveSensorToDb(lightLux, 3L, now);

                    if (json.isObject()) {
                        ((com.fasterxml.jackson.databind.node.ObjectNode) json).put("light", lightLux);
                    }
                }

                if (json.has("windspeed")) {
                    double windSpeed = json.get("windspeed").asDouble();
                    saveSensorToDb(windSpeed, 4L, now);
                    handleWindWarning(windSpeed, now);
                }

                // Đẩy dữ liệu JSON gộp lên Dashboard qua WebSocket
                messagingTemplate.convertAndSend("/topic/sensor", json.toString());
            }

            //  XỬ LÝ PHẢN HỒI THIẾT BỊ
            else if ("device/status".equals(topic)) {
                if (isReconnectSignal(payload)) {
                    syncDeviceStatesFromDbOnReconnect();
                }

    
                String[] parts = payload.split(" ");
                if (parts.length >= 3) {
                    String ledName = parts[0];  
                    String statusResult = parts[2]; 

                    // 1. Tìm thiết bị theo tên ("do", "xanh", "vang")
                    deviceRepo.findByNameDevice(ledName).ifPresent(device -> {
                        actionHistoryRepo.findTopByDeviceOrderByIdDesc(device).ifPresent(history -> {
                            if ("Pending".equalsIgnoreCase(history.getStatus())) {
                                history.setStatus(statusResult.toUpperCase()); // Thành SUCCESS hoặc FAILED
                                actionHistoryRepo.save(history);
                            }
                        });
                    });
                }
                messagingTemplate.convertAndSend("/topic/device-status", payload);
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý MQTT message: " + e.getMessage());
            e.printStackTrace();
        }
    }
    private void saveSensorToDb(double value, Long sensorId, LocalDateTime time) {
        DataSensor ds = new DataSensor();
        ds.setValue(value);
        ds.setDateTime(time);

        Sensor s = new Sensor();
        s.setIdSensor(sensorId);
        ds.setSensor(s);

        dataSensorRepo.save(ds);
    }

    private boolean isReconnectSignal(String payload) {
        String normalized = payload == null
                ? ""
                : payload.trim().toLowerCase(Locale.ROOT);

        return normalized.equals("online")
                || normalized.equals("reconnect")
                || normalized.equals("boot")
                || normalized.equals("device online")
                || normalized.equals("esp32 online");
    }

    private void syncDeviceStatesFromDbOnReconnect() {
        LocalDateTime now = LocalDateTime.now();

        if (lastReconnectSyncAt != null
                && lastReconnectSyncAt.plusSeconds(RECONNECT_SYNC_DEBOUNCE_SECONDS).isAfter(now)) {
            return;
        }

        lastReconnectSyncAt = now;

        RECONNECT_TARGET_DEVICES.forEach(targetDeviceName -> {
            deviceRepo.findByNameDevice(targetDeviceName).ifPresent(device -> {
                String action = resolveActionForReconnect(device);
                String ledForEsp = toEspLedName(device.getNameDevice());
                mqttGateway.sendToMqtt(ledForEsp + " " + action, "device/control");

                // Keep dashboard aligned with the exact reconnect state chosen from SUCCESS history.
                messagingTemplate.convertAndSend("/topic/device-status", ledForEsp + " " + action + " success");
            });
        });

        System.out.println("[MQTT] ESP reconnected. Synced latest SUCCESS states for fan/air_condition/light_bulb.");
    }

    private String toEspLedName(String deviceName) {
        if (deviceName == null) {
            return "";
        }

        String normalized = deviceName.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "light_bulb", "lightbulb", "do" -> "do";
            case "air_condition", "aircondition", "xanh" -> "xanh";
            case "fan", "vang" -> "vang";
            default -> normalized;
        };
    }

    private String resolveActionForReconnect(Device device) {
        return actionHistoryRepo
                .findTopByDeviceAndStatusOrderByIdDesc(device, "SUCCESS")
                .map(history -> history.getAction() == null ? "off" : history.getAction().toLowerCase(Locale.ROOT))
                .filter(savedAction -> "on".equals(savedAction) || "off".equals(savedAction))
                .orElse("off");
    }

    private void handleWindWarning(double windSpeed, LocalDateTime now) {
        deviceRepo.findByNameDevice("warning_light").ifPresent(device -> {
            if (windSpeed > WIND_WARNING_THRESHOLD) {
                if (!warningLightActive) {
                    warningLightActive = true;
                    persistWarningLightWarning(device, now);
                }
                return;
            }

            if (warningLightActive) {
                warningLightActive = false;
                publishWarningLightOff();
            }
        });
    }

    private void persistWarningLightWarning(Device device, LocalDateTime now) {
        ActionHistory history = new ActionHistory();
        history.setDevice(device);
        history.setAction("WARNING");
        history.setStatus("WARNING");
        history.setDateTime(now);
        actionHistoryRepo.save(history);

        mqttGateway.sendToMqtt("warning_light on", "device/control");
        messagingTemplate.convertAndSend("/topic/device-status", "warning_light on warning");
    }

    private void publishWarningLightOff() {
        mqttGateway.sendToMqtt("warning_light off", "device/control");
        messagingTemplate.convertAndSend("/topic/device-status", "warning_light off success");
    }

    private double convertLightRawToLux(double rawValue) {
        if (!Double.isFinite(rawValue) || rawValue <= 0) {
            return 0;
        }

        if (rawValue > ADC_MAX) {
            return Math.round(rawValue);
        }

        double adc = rawValue <= LIGHT_VREF
                ? (rawValue / LIGHT_VREF) * ADC_MAX
                : rawValue;

        adc = Math.max(1, Math.min(ADC_MAX, Math.round(adc)));
        double inside = LIGHT_R * ((ADC_MAX / adc) - 1);

        if (!Double.isFinite(inside) || inside <= 0) {
            return Math.round(LIGHT_MAX_LUX);
        }

        double lux = LIGHT_K * Math.pow(inside, -LIGHT_GAMMA);
        double boundedLux = Math.max(0, Math.min(LIGHT_MAX_LUX, lux));
        return Math.round(boundedLux);
    }
}