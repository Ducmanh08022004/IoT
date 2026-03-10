package com.iot.service;

import com.iot.dto.dataSensorFilterRequest;
import com.iot.dto.dataSensorResponse;
import com.iot.entity.DataSensor;
import com.iot.repository.dataSensorRepository;
import com.iot.specification.ActionHistorySpecification;
import com.iot.specification.DataSensorSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DataSensorService {

    private final dataSensorRepository repository;

    public Page<dataSensorResponse> search(
            dataSensorFilterRequest request,
            int page,
            int size,
            String sortBy,
            String direction
    ) {

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<DataSensor> result = repository.findAll(
                DataSensorSpecification.filter(
                        request.getNameSensor(),
                        request.getValue(),
                        request.getDateTime()
                ),
                pageable
        );
        return result.map(action -> new dataSensorResponse(
                action.getId(),
                action.getSensor().getNameSensor(),
                action.getValue(),
                action.getDateTime()
        ));
    }
}
