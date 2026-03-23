package com.iot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class dataSensorFilterRequest {
    private String nameSensor;
    private Double value;
    private LocalDateTime dateTime;
}
