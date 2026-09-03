package com.containertrack.service;

import com.containertrack.entity.ContainerStatus;
import com.containertrack.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Strictly sequential, forward-only state machine for container lifecycle.
 * REGISTERED -> DEPARTED_ORIGIN -> ARRIVED_PORT -> DEPARTED_PORT -> ARRIVED_WAREHOUSE -> DISCHARGED
 * DISCHARGED is terminal and reachable ONLY through the dedicated discharge endpoint (RN-DESC-01),
 * never through the generic /transition endpoint.
 */
@Component
public class ContainerStateMachine {

    private static final Map<ContainerStatus, ContainerStatus> NEXT_ALLOWED = Map.of(
            ContainerStatus.REGISTERED, ContainerStatus.DEPARTED_ORIGIN,
            ContainerStatus.DEPARTED_ORIGIN, ContainerStatus.ARRIVED_PORT,
            ContainerStatus.ARRIVED_PORT, ContainerStatus.DEPARTED_PORT,
            ContainerStatus.DEPARTED_PORT, ContainerStatus.ARRIVED_WAREHOUSE,
            ContainerStatus.ARRIVED_WAREHOUSE, ContainerStatus.DISCHARGED
    );

    public void validateTransition(ContainerStatus current, ContainerStatus target) {
        if (target == ContainerStatus.DISCHARGED) {
            throw new BadRequestException("DISCHARGE_VIA_DEDICATED_ENDPOINT",
                    "El paso a DISCHARGED solo puede realizarse mediante el endpoint de descarga, que requiere al menos una foto.");
        }
        ContainerStatus allowedNext = NEXT_ALLOWED.get(current);
        if (allowedNext == null || allowedNext != target) {
            throw new BadRequestException("INVALID_TRANSITION",
                    "Transición de estado inválida: no se puede pasar de " + current + " a " + target + ".");
        }
    }

    /** Used internally by the discharge flow, which bypasses validateTransition's DISCHARGED guard. */
    public void validateDischarge(ContainerStatus current) {
        if (current != ContainerStatus.ARRIVED_WAREHOUSE) {
            throw new BadRequestException("INVALID_TRANSITION",
                    "Solo se puede descargar un contenedor que está en estado ARRIVED_WAREHOUSE.");
        }
    }
}
