package com.iot.controller;

import com.iot.dto.dataSensorFilterRequest;
import com.iot.dto.dataSensorResponse;
import com.iot.service.DataSensorService;
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
@RequestMapping("/api/data-sensor")
@RequiredArgsConstructor
public class DataSensorController {
    private final DataSensorService dataSensorService;

    @GetMapping("/search")
    public Page<dataSensorResponse> search(
            @RequestParam(required = false) String nameSensor,
            @RequestParam(required = false) Double value,
            @RequestParam(required = false) String dateTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
            )
    {
        LocalDateTime parsedDateTime = parseDateTimeParam(dateTime);
        dataSensorFilterRequest request = new dataSensorFilterRequest(nameSensor, value, parsedDateTime);
        return dataSensorService.search(request,page,size,sortBy,direction);
    }

    private LocalDateTime parseDateTimeParam(String dateTime) {
        if (dateTime == null || dateTime.isBlank()) {
            return null;
        }

        String value = dateTime.trim()
                .replace('+', ' ')
                .replaceAll("\\s+", " ");

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
                "Invalid dateTime format. Use yyyy-MM-dd'T'HH:mm:ss or yyyy-MM-dd HH:mm:ss"
        );
    }
}
