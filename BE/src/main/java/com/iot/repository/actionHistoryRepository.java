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
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface actionHistoryRepository extends JpaRepository<ActionHistory, Long>, JpaSpecificationExecutor<ActionHistory> {

    @Override
    @EntityGraph(attributePaths = {"device"})
    Page<ActionHistory> findAll(Specification<ActionHistory> spec, Pageable pageable);

    @Query("""
    SELECT new com.iot.dto.actionHistoryResponse(
        a.id,
        d.nameDevice,
        a.action,
        a.status,
        a.dateTime
    )
    FROM ActionHistory a
    JOIN a.device d
    """)
    Page<actionHistoryResponse> findAllWithFilter(Pageable pageable);

        @Query(
                        value = """
                        SELECT new com.iot.dto.actionHistoryResponse(
                                a.id,
                                d.nameDevice,
                                a.action,
                                a.status,
                                a.dateTime
                        )
                        FROM ActionHistory a
                        JOIN a.device d
                        WHERE (:nameDevice IS NULL OR LOWER(d.nameDevice) LIKE CONCAT('%', :nameDevice, '%'))
                            AND (:action IS NULL OR LOWER(a.action) = :action)
                            AND (:status IS NULL OR LOWER(a.status) = :status)
                            AND (:startDateTime IS NULL OR a.dateTime >= :startDateTime)
                            AND (:endDateTime IS NULL OR a.dateTime < :endDateTime)
                        """,
                        countQuery = """
                        SELECT COUNT(a)
                        FROM ActionHistory a
                        JOIN a.device d
                        WHERE (:nameDevice IS NULL OR LOWER(d.nameDevice) LIKE CONCAT('%', :nameDevice, '%'))
                            AND (:action IS NULL OR LOWER(a.action) = :action)
                            AND (:status IS NULL OR LOWER(a.status) = :status)
                            AND (:startDateTime IS NULL OR a.dateTime >= :startDateTime)
                            AND (:endDateTime IS NULL OR a.dateTime < :endDateTime)
                        """
        )
        Page<actionHistoryResponse> searchOptimized(
                        @Param("nameDevice") String nameDevice,
                        @Param("action") String action,
                        @Param("status") String status,
                        @Param("startDateTime") LocalDateTime startDateTime,
                        @Param("endDateTime") LocalDateTime endDateTime,
                        Pageable pageable
        );

    Optional<ActionHistory> findTopByDeviceOrderByIdDesc(Device device);
}
