package com.iot.dto;

import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class actionHistoryResponse {
    private Long idAction;
    private String nameDevice;
    private String action;
    private String status;
    private LocalDateTime dateTime;

    public actionHistoryResponse(Long idAction,
                                 String nameDevice,
                                 String action,
                                 String status,
                                 LocalDateTime dateTime) {
        this.idAction = idAction;
        this.nameDevice = nameDevice;
        this.action = action;
        this.status = status;
        this.dateTime = dateTime;
    }
}
