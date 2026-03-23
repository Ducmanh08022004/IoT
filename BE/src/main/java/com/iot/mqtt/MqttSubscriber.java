package com.iot.mqtt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iot.entity.DataSensor;
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

@Service
@RequiredArgsConstructor
public class MqttSubscriber {

    private static final int ADC_MAX = 4095;
    private static final double LIGHT_VREF = 3.3;
    private static final double LIGHT_K = 12518931.0;
    private static final double LIGHT_R = 10000.0;
    private static final double LIGHT_GAMMA = 1.405;
    private static final double LIGHT_MAX_LUX = 100000.0;

    private final dataSensorRepository dataSensorRepo;
    private final actionHistoryRepository actionHistoryRepo;
    private final deviceRepository deviceRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(String payload, @Header("mqtt_receivedTopic") String topic) {
        try {
            //XỬ LÝ DỮ LIỆU SENSOR
            if ("sensor/data".equals(topic)) {
                // Parse JSON gộp từ ESP32
                JsonNode json = objectMapper.readTree(payload);
                LocalDateTime now = LocalDateTime.now();

                // Chẻ dữ liệu và lưu vào DB (Khớp với các ID Sensor: 1-Nhiệt độ, 2-Độ ẩm, 3-Ánh sáng)
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

                // Đẩy dữ liệu JSON gộp lên Dashboard qua WebSocket
                messagingTemplate.convertAndSend("/topic/sensor", json.toString());
            }

            //  XỬ LÝ PHẢN HỒI THIẾT BỊ
            else if ("device/status".equals(topic)) {
                // Giả định payload từ ESP32 gửi về là: "do on success"
                String[] parts = payload.split(" ");
                if (parts.length >= 3) {
                    String ledName = parts[0];   // "do"
                    String statusResult = parts[2]; // "success" hoặc "failed"

                    // 1. Tìm thiết bị theo tên ("do", "xanh", "vang")
                    deviceRepo.findByNameDevice(ledName).ifPresent(device -> {
                        // 2. Tìm bản ghi hành động "Pending" mới nhất của thiết bị đó để cập nhật
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