package com.iot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Table(name = "sensor")
public class Sensor {
    @Id
    @Column(name = "id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long idSensor;

    @Column(name = "nameSensor")
    private String nameSensor;

    @Column(name = "createAt")
    private LocalDateTime createAt;

    @OneToMany(mappedBy = "sensor")
    private List<DataSensor> list;
}
