package com.containertrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardSummaryDTO {
    private long activeUsersCount;
    private long activeShippingCompaniesCount;
    private long activePortsCount;
    private List<TopActiveUserDTO> topActiveUsers;
}
