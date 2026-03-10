package com.iot.repository;

import com.iot.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface deviceRepository extends JpaRepository<Device,Integer> {
    Optional<Device> findByNameDevice(String nameDevice);
}
