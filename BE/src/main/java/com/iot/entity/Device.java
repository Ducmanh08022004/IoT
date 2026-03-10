package com.iot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Setter
@Getter
@Table(name = "device")
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long idDevice;

    @Column(name = "nameDevice")
    private String nameDevice;

    @Column(name = "dateTime")
    private LocalDateTime dateTime;

    @OneToMany(mappedBy = "device")
    private List<ActionHistory> list;
}
