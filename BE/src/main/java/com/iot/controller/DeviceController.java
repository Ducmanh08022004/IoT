package com.iot.controller;

import com.iot.config.MqttConfig;
import com.iot.entity.ActionHistory;
import com.iot.entity.Device;
import com.iot.repository.actionHistoryRepository;
import com.iot.repository.deviceRepository;
import com.iot.service.ActionHistoryTimeoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/device")
@RequiredArgsConstructor
public class DeviceController {

    private final MqttConfig.MqttGateway mqttGateway;
    private final actionHistoryRepository actionHistoryRepo;
    private final deviceRepository deviceRepo;
    private final ActionHistoryTimeoutService actionHistoryTimeoutService;

    @PostMapping("/control")
    public String control(@RequestParam String led, @RequestParam String action) {
        Device device = deviceRepo.findByNameDevice(led)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thiết bị: " + led));

        ActionHistory history = new ActionHistory();
        history.setDevice(device);
        history.setAction(action);
        history.setStatus("Pending");
        history.setDateTime(LocalDateTime.now());
        actionHistoryRepo.save(history);

        actionHistoryTimeoutService.schedulePendingToFailed(history.getId(), 5);

        String payload = led + " " + action;
        mqttGateway.sendToMqtt(payload, "device/control");

        return "Sent " + payload + " (Status: Pending)";
    }
}
