package com.iot.controller;

import com.iot.dto.actionHistoryFilterRequest;
import com.iot.dto.actionHistoryResponse;
import com.iot.service.ActionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        actionHistoryFilterRequest request = new actionHistoryFilterRequest(nameDevice, status, action, date);
        return actionHistoryService.search(request,page,size,sortBy,direction);
    }
}
