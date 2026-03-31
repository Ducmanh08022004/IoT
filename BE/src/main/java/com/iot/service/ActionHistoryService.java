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

import java.util.Set;

@Service
@RequiredArgsConstructor
public class ActionHistoryService {

    private final actionHistoryRepository repository;
        private static final int MAX_PAGE_SIZE = 100;
        private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
                        "id",
                        "device.nameDevice",
                        "action",
                        "status",
                        "dateTime"
        );

    public Page<actionHistoryResponse> search(
            actionHistoryFilterRequest request,
            int page,
            int size,
            String sortBy,
            String direction
    ) {

        actionHistoryFilterRequest safeRequest = request == null
                ? new actionHistoryFilterRequest()
                : request;

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 10 : Math.min(size, MAX_PAGE_SIZE);
        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "dateTime";

        Sort sort = "desc".equalsIgnoreCase(direction)
                ? Sort.by(safeSortBy).descending()
                : Sort.by(safeSortBy).ascending();

        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Page<ActionHistory> result = repository.findAll(
                ActionHistorySpecification.filter(
                        safeRequest.getNameDevice(),
                        safeRequest.getAction(),
                        safeRequest.getStatus(),
                        safeRequest.getStartDateTime(),
                        safeRequest.getEndDateTime()
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
