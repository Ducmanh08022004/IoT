package com.iot.specification;

import com.iot.entity.ActionHistory;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ActionHistorySpecification {

    public static Specification<ActionHistory> filter(
            String nameDevice,
            String action,
            String status,
            LocalDateTime dateTime
    ) {

        return (Root<ActionHistory> root,
                CriteriaQuery<?> query,
                CriteriaBuilder cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (nameDevice != null && !nameDevice.isBlank()) {
                String normalizedName = nameDevice.trim().toLowerCase();
                predicates.add(
                        cb.like(
                                cb.lower(root.get("device").get("nameDevice")),
                                "%" + normalizedName + "%"
                        )
                );
            }

            if (action != null && !action.isBlank()) {
                predicates.add(
                        cb.equal(cb.lower(root.get("action")), action.trim().toLowerCase())
                );
            }

            if (status != null && !status.isBlank()) {
                predicates.add(
                        cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase())
                );
            }

            if (dateTime != null) {
                LocalDateTime start = dateTime;
                LocalDateTime endExclusive = dateTime.plusSeconds(1);

                predicates.add(cb.greaterThanOrEqualTo(root.get("dateTime"), start));
                predicates.add(cb.lessThan(root.get("dateTime"), endExclusive));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
