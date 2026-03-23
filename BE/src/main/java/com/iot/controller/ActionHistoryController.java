package com.iot.controller;

import com.iot.dto.actionHistoryFilterRequest;
import com.iot.dto.actionHistoryResponse;
import com.iot.service.ActionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/action-history")
@RequiredArgsConstructor
public class ActionHistoryController {
    private final ActionHistoryService actionHistoryService;

    @GetMapping("/search")
    public Page<actionHistoryResponse> search(
            @RequestParam(required = false) String nameDevice,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String date,
            @RequestParam(required = false, name = "dateTime") String dateTimeParam,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        String resolvedDateTime = (dateTimeParam != null && !dateTimeParam.isBlank()) ? dateTimeParam : date;
        LocalDateTime dateTime = parseDateParam(resolvedDateTime);
        actionHistoryFilterRequest request = new actionHistoryFilterRequest(nameDevice, status, action, dateTime);
        return actionHistoryService.search(request,page,size,sortBy,direction);
    }

    private LocalDateTime parseDateParam(String date) {
        if (date == null || date.isBlank()) {
            return null;
        }

        String value = date.trim()
                .replace('+', ' ')
                .replaceAll("\\s+", " ");

        // Support datetime-local values without seconds by defaulting to :00.
        if (value.matches("^\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}$")) {
            value = value + ":00";
        }

        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE_TIME,
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDateTime.parse(value, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid date format. Use yyyy-MM-dd'T'HH:mm:ss or yyyy-MM-dd HH:mm:ss"
        );
    }
}
