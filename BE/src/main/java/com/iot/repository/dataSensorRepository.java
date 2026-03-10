package com.iot.repository;

import com.iot.dto.actionHistoryResponse;
import com.iot.entity.DataSensor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface dataSensorRepository extends JpaRepository<DataSensor,Integer>, JpaSpecificationExecutor<DataSensor> {
    @Query("""
    SELECT new com.iot.dto.dataSensorResponse(
        a.id,
        d.nameSensor,
        a.value,
        a.dateTime
    )
    FROM DataSensor a
    JOIN a.sensor d
    """)
    Page<actionHistoryResponse> findAllWithFilter(Pageable pageable);
}
