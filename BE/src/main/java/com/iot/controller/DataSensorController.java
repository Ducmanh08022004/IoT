package com.iot.controller;

import com.iot.dto.dataSensorFilterRequest;
import com.iot.dto.dataSensorResponse;
import com.iot.service.DataSensorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/data-sensor")
@RequiredArgsConstructor
public class DataSensorController {
    private final DataSensorService dataSensorService;

    @GetMapping("/search")
    public Page<dataSensorResponse> search(
            @RequestParam(required = false) String nameSensor,
            @RequestParam(required = false) Double value,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
            )
    {
        dataSensorFilterRequest request = new dataSensorFilterRequest(nameSensor, value, dateTime);
        return dataSensorService.search(request,page,size,sortBy,direction);
    }
}
