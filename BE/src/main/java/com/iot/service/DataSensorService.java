package com.iot.service;

import com.iot.dto.dataSensorFilterRequest;
import com.iot.dto.dataSensorResponse;
import com.iot.entity.DataSensor;
import com.iot.repository.dataSensorRepository;
import com.iot.specification.DataSensorSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class DataSensorService {

    private final dataSensorRepository repository;
        private static final int MAX_PAGE_SIZE = 100;
        private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
                        "id",
                        "value",
                        "dateTime"
        );

    public Page<dataSensorResponse> search(
            dataSensorFilterRequest request,
            int page,
            int size,
            String sortBy,
            String direction
    ) {

        dataSensorFilterRequest safeRequest = request == null
                ? new dataSensorFilterRequest()
                : request;

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 10 : Math.min(size, MAX_PAGE_SIZE);
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "dateTime";

        Sort sort = "desc".equalsIgnoreCase(direction)
                ? Sort.by(safeSortBy).descending()
                : Sort.by(safeSortBy).ascending();

        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Page<DataSensor> result = repository.findAll(
                DataSensorSpecification.filter(
                        safeRequest.getNameSensor(),
                        safeRequest.getValue(),
                        safeRequest.getDateTime()
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
