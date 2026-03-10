package com.iot.specification;

import com.iot.entity.ActionHistory;
import com.iot.entity.Device;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ActionHistorySpecification {

    public static Specification<ActionHistory> filter(
            String nameDevice,
            String action,
            String status,
            LocalDate date
    ) {

        return (Root<ActionHistory> root,
                CriteriaQuery<?> query,
                CriteriaBuilder cb) -> {

            // Chỉ fetch khi không phải query count
            if (!Long.class.equals(query.getResultType())) {
                root.fetch("device", JoinType.LEFT);
                query.distinct(true);   // tránh duplicate row
            }

            List<Predicate> predicates = new ArrayList<>();


            Join<ActionHistory, Device> deviceJoin =
                    root.join("device", JoinType.LEFT);

            if (nameDevice != null && !nameDevice.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(deviceJoin.get("nameDevice")),
                                "%" + nameDevice.toLowerCase() + "%"
                        )
                );
            }

            if (action != null && !action.isBlank()) {
                predicates.add(
                        cb.equal(root.get("action"), action)
                );
            }

            if (status != null && !status.isBlank()) {
                predicates.add(
                        cb.equal(root.get("status"), status)
                );
            }

            if (date != null) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.atTime(23, 59, 59);

                predicates.add(
                        cb.between(root.get("dateTime"), start, end)
                );
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
