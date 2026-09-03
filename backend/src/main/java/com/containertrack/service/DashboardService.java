package com.containertrack.service;

import com.containertrack.dto.response.AdminDashboardSummaryDTO;
import com.containertrack.dto.response.TopActiveUserDTO;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.repository.AuditLogRepository;
import com.containertrack.repository.PortRepository;
import com.containertrack.repository.ShippingCompanyRepository;
import com.containertrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int TOP_ACTIVE_USERS_LIMIT = 5;
    private static final int TOP_ACTIVE_USERS_WINDOW_DAYS = 30;

    private final UserRepository userRepository;
    private final ShippingCompanyRepository shippingCompanyRepository;
    private final PortRepository portRepository;
    private final AuditLogRepository auditLogRepository;

    public AdminDashboardSummaryDTO getAdminSummary() {
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
        long activeShippingCompanies = shippingCompanyRepository.countByIsActiveTrue();
        long activePorts = portRepository.countByIsActiveTrue();

        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(TOP_ACTIVE_USERS_WINDOW_DAYS);
        List<Object[]> rows = auditLogRepository.findTopActiveUsersSince(since, PageRequest.of(0, TOP_ACTIVE_USERS_LIMIT));

        List<Long> userIds = rows.stream().map(r -> (Long) r[0]).toList();
        Map<Long, String> namesById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));

        List<TopActiveUserDTO> topActiveUsers = rows.stream()
                .map(r -> {
                    Long userId = (Long) r[0];
                    long changeCount = (Long) r[1];
                    return TopActiveUserDTO.builder()
                            .userId(userId)
                            .fullName(namesById.getOrDefault(userId, "Usuario " + userId))
                            .changeCount(changeCount)
                            .build();
                })
                .toList();

        return AdminDashboardSummaryDTO.builder()
                .activeUsersCount(activeUsers)
                .activeShippingCompaniesCount(activeShippingCompanies)
                .activePortsCount(activePorts)
                .topActiveUsers(topActiveUsers)
                .build();
    }
}
