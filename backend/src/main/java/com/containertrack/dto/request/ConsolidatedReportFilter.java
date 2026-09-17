package com.containertrack.dto.request;

import com.containertrack.entity.ContainerStatus;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class ConsolidatedReportFilter {
    private ContainerStatus status;
    private Long shippingCompanyId;
    private Long operatorId;
    private OffsetDateTime dateFrom;
    private OffsetDateTime dateTo;
}
