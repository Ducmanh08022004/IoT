package com.iot.controller;

import com.iot.dto.actionHistoryFilterRequest;
import com.iot.dto.actionHistoryResponse;
import com.iot.service.ActionHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/action-history")
@RequiredArgsConstructor
public class ActionHistoryController {
    private final ActionHistoryService actionHistoryService;

    @PostMapping("/search")
    public Page<actionHistoryResponse> search(
            @RequestBody(required = false) actionHistoryFilterRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "dateTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        return actionHistoryService.search(request,page,size,sortBy,direction);
    };
}
