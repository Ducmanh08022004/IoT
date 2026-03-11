package com.iot.service;

import com.iot.repository.actionHistoryRepository;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class ActionHistoryTimeoutService {

    private final actionHistoryRepository actionHistoryRepo;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public void schedulePendingToFailed(Long historyId, long timeoutSeconds) {
        scheduler.schedule(() -> actionHistoryRepo.findById(historyId).ifPresent(history -> {
            if ("Pending".equalsIgnoreCase(history.getStatus())) {
                history.setStatus("FAILED");
                actionHistoryRepo.save(history);
            }
        }), timeoutSeconds, TimeUnit.SECONDS);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}
