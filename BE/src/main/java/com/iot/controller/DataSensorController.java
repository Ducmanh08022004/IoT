package com.iot.controller;

import com.iot.dto.dataSensorFilterRequest;
import com.iot.dto.dataSensorResponse;
import com.iot.service.DataSensorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data-sensor")
@RequiredArgsConstructor
public class DataSensorController {
    private final DataSensorService dataSensorService;

    @PostMapping("/search")
    public Page<dataSensorResponse> search(
            @RequestBody dataSensorFilterRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
            )
    {
        return dataSensorService.search(request,page,size,sortBy,direction);
    }
}
