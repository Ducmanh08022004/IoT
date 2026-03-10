package com.iot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;

@AllArgsConstructor
@Getter
public class dataSensorResponse {
    private Long idData;
    private String nameSensor;
    private Double value;
    private LocalDateTime dateTime;
}
