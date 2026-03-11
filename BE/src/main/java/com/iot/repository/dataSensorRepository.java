package com.iot.repository;

import com.iot.dto.dataSensorResponse;
import com.iot.entity.DataSensor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.domain.Specification;

@Repository
public interface dataSensorRepository extends JpaRepository<DataSensor,Long>, JpaSpecificationExecutor<DataSensor> {

    @Override
    @EntityGraph(attributePaths = {"sensor"})
    Page<DataSensor> findAll(Specification<DataSensor> spec, Pageable pageable);
}
