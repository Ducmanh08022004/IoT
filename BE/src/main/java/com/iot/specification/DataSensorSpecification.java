package com.iot.specification;

import com.iot.entity.DataSensor;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DataSensorSpecification {

    public static Specification<DataSensor> filter(
            String nameSensor,
            Double value,
            LocalDate date
    ) {

        return (Root<DataSensor> root,
                CriteriaQuery<?> query,
                CriteriaBuilder cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (nameSensor != null && !nameSensor.isBlank()) {
                String normalizedName = nameSensor.trim().toLowerCase();
                predicates.add(
                        cb.like(
                                cb.lower(root.get("sensor").get("nameSensor")),
                                "%" + normalizedName + "%"
                        )
                );
            }

            if (value != null && !value.isNaN()) {
                predicates.add(
                        cb.equal(root.get("value"), value)
                );
            }

            if (date != null) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime endExclusive = date.plusDays(1).atStartOfDay();

                predicates.add(cb.greaterThanOrEqualTo(root.get("dateTime"), start));
                predicates.add(cb.lessThan(root.get("dateTime"), endExclusive));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
