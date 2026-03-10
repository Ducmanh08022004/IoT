package com.iot.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class actionHistoryFilterRequest {
    private String nameDevice;
    private String status;
    private String action;
    private LocalDate date;
}
