package com.iot.specification;

import com.iot.entity.DataSensor;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DataSensorSpecification {

    public static Specification<DataSensor> filter(
            String nameSensor,
            Double value,
            LocalDateTime dateTime,
            Long sensorId
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
                // Use a tiny range instead of strict equals to avoid double precision misses.
                double epsilon = 0.0001d;
                predicates.add(
                        cb.between(root.get("value"), value - epsilon, value + epsilon)
                );
            }

            if (sensorId != null && sensorId > 0) {
                predicates.add(cb.equal(root.get("sensor").get("idSensor"), sensorId));
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
