package com.iot.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class actionHistoryFilterRequest {
    private String nameDevice;
    private String status;
    private String action;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
}
