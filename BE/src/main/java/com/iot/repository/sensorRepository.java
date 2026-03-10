package com.iot.repository;

import com.iot.entity.Sensor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface sensorRepository extends JpaRepository<Sensor, Integer> {
}
