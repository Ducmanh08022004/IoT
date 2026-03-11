package com.iot.repository;

import com.iot.dto.actionHistoryResponse;
import com.iot.entity.ActionHistory;
import com.iot.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface actionHistoryRepository extends JpaRepository<ActionHistory, Long>, JpaSpecificationExecutor<ActionHistory> {

    @Override
    @EntityGraph(attributePaths = {"device"})
    Page<ActionHistory> findAll(Specification<ActionHistory> spec, Pageable pageable);
    Optional<ActionHistory> findTopByDeviceOrderByIdDesc(Device device);
}
