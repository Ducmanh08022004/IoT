package com.iot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Setter
@Getter
@Table(name = "action_history")
public class ActionHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "action")
    private String action;

    @Column(name = "status")
    private String status;

    @Column(name = "dateTime")
    private LocalDateTime dateTime;

    @ManyToOne
    @JoinColumn(name = "id_device")
    private Device device;
}
