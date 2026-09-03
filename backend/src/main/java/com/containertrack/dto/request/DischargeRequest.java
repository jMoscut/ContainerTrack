package com.containertrack.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class DischargeRequest {
    @NotNull
    private OffsetDateTime dischargeStartAt;

    @NotNull
    private OffsetDateTime dischargeEndAt;

    private String dischargeNotes;
}
