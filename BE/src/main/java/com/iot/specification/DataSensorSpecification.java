package com.iot.specification;

import com.iot.entity.ActionHistory;
import com.iot.entity.DataSensor;
import com.iot.entity.Device;
import com.iot.entity.Sensor;
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

            // Chỉ fetch khi không phải query count
            if (!Long.class.equals(query.getResultType())) {
                root.fetch("sensor", JoinType.LEFT);
                query.distinct(true);   // tránh duplicate row
            }

            List<Predicate> predicates = new ArrayList<>();


            Join<DataSensor, Sensor> sensorJoin =
                    root.join("sensor", JoinType.LEFT);

            if (nameSensor != null && !nameSensor.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(sensorJoin.get("nameSensor")),
                                "%" + nameSensor.toLowerCase() + "%"
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
                LocalDateTime end = date.atTime(23, 59, 59);

                predicates.add(
                        cb.between(root.get("dateTime"), start, end)
                );
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
