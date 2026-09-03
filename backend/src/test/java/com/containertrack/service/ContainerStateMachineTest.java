package com.containertrack.service;

import com.containertrack.entity.ContainerStatus;
import com.containertrack.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ContainerStateMachineTest {

    private final ContainerStateMachine stateMachine = new ContainerStateMachine();

    @Test
    void allowsSequentialForwardTransition() {
        assertDoesNotThrow(() -> stateMachine.validateTransition(ContainerStatus.REGISTERED, ContainerStatus.DEPARTED_ORIGIN));
        assertDoesNotThrow(() -> stateMachine.validateTransition(ContainerStatus.DEPARTED_ORIGIN, ContainerStatus.ARRIVED_PORT));
        assertDoesNotThrow(() -> stateMachine.validateTransition(ContainerStatus.ARRIVED_PORT, ContainerStatus.DEPARTED_PORT));
        assertDoesNotThrow(() -> stateMachine.validateTransition(ContainerStatus.DEPARTED_PORT, ContainerStatus.ARRIVED_WAREHOUSE));
    }

    @Test
    void rejectsSkippingAStage() {
        assertThrows(BadRequestException.class, () ->
                stateMachine.validateTransition(ContainerStatus.REGISTERED, ContainerStatus.ARRIVED_PORT));
    }

    @Test
    void rejectsBackwardTransition() {
        assertThrows(BadRequestException.class, () ->
                stateMachine.validateTransition(ContainerStatus.ARRIVED_PORT, ContainerStatus.DEPARTED_ORIGIN));
    }

    @Test
    void rejectsDirectTransitionToDischarged() {
        assertThrows(BadRequestException.class, () ->
                stateMachine.validateTransition(ContainerStatus.ARRIVED_WAREHOUSE, ContainerStatus.DISCHARGED));
    }

    @Test
    void dischargeOnlyAllowedFromArrivedWarehouse() {
        assertDoesNotThrow(() -> stateMachine.validateDischarge(ContainerStatus.ARRIVED_WAREHOUSE));
        assertThrows(BadRequestException.class, () -> stateMachine.validateDischarge(ContainerStatus.DEPARTED_PORT));
    }
}
