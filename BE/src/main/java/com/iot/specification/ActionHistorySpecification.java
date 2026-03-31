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
            LocalDateTime startDateTime,
            LocalDateTime endDateTime
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

            if (startDateTime != null && endDateTime != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dateTime"), startDateTime));
                predicates.add(cb.lessThan(root.get("dateTime"), endDateTime));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
