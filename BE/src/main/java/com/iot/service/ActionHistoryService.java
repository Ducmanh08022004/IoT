package com.iot.service;

import com.iot.dto.actionHistoryFilterRequest;
import com.iot.dto.actionHistoryResponse;
import com.iot.entity.ActionHistory;
import com.iot.repository.actionHistoryRepository;
import com.iot.specification.ActionHistorySpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final actionHistoryRepository repository;

    public Page<actionHistoryResponse> search(
            actionHistoryFilterRequest request,
            int page,
            int size,
            String sortBy,
            String direction
    ) {

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ActionHistory> result = repository.findAll(
                ActionHistorySpecification.filter(
                        request.getNameDevice(),
                        request.getAction(),
                        request.getStatus(),
                        request.getDate()
                ),
                pageable
        );
        return result.map(action -> new actionHistoryResponse(
                action.getId(),
                action.getDevice().getNameDevice(),
                action.getAction(),
                action.getStatus(),
                action.getDateTime()
        ));
    }
}
