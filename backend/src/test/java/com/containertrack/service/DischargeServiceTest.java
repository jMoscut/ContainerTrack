package com.containertrack.service;

import com.containertrack.dto.request.DischargeRequest;
import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.exception.BadRequestException;
import com.containertrack.mapper.ContainerMapper;
import com.containertrack.repository.ContainerPhotoRepository;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.ShippingCompanyRepository;
import com.containertrack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Photo-count enforcement for discharge (RN-DESC-01) lives in DischargeService,
 * not ContainerService: ContainerStateMachine.validateTransition() rejects any
 * generic transition to DISCHARGED outright, and the dedicated discharge flow
 * (DischargeService.discharge) is the only path that can reach DISCHARGED,
 * gated on having at least one uploaded photo.
 */
@ExtendWith(MockitoExtension.class)
class DischargeServiceTest {

    @Mock
    private ContainerRepository containerRepository;
    @Mock
    private ContainerPhotoRepository containerPhotoRepository;
    @Mock
    private ShippingCompanyRepository shippingCompanyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContainerMapper containerMapper;
    @Mock
    private AuditService auditService;
    @Mock
    private ContainerRealtimeNotifier realtimeNotifier;
    @Mock
    private NotificationService notificationService;

    private final ContainerStateMachine stateMachine = new ContainerStateMachine();

    private DischargeService dischargeService;

    @BeforeEach
    void setUp() {
        dischargeService = new DischargeService(containerRepository, containerPhotoRepository,
                shippingCompanyRepository, userRepository, containerMapper, auditService, stateMachine,
                realtimeNotifier, notificationService);
    }

    private DischargeRequest dischargeRequest() {
        DischargeRequest request = new DischargeRequest();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        request.setDischargeStartAt(now.minusHours(2));
        request.setDischargeEndAt(now.minusHours(1));
        return request;
    }

    @Test
    void dischargeWithZeroPhotosThrowsBadRequestException() {
        Container container = Container.builder()
                .id(1L)
                .containerNumber("MSKU1234565")
                .status(ContainerStatus.ARRIVED_WAREHOUSE)
                .build();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(containerPhotoRepository.countByContainerId(1L)).thenReturn(0L);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> dischargeService.discharge(1L, dischargeRequest(), 1L));

        assertEquals("PHOTOS_REQUIRED", ex.getCode());
        verify(containerRepository, never()).save(any());
    }

    @Test
    void dischargeWithAtLeastOnePhotoSucceedsAndSetsStatusDischarged() {
        Container container = Container.builder()
                .id(1L)
                .containerNumber("MSKU1234565")
                .status(ContainerStatus.ARRIVED_WAREHOUSE)
                .build();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(containerPhotoRepository.countByContainerId(1L)).thenReturn(1L);
        when(containerRepository.save(any(Container.class))).thenAnswer(inv -> inv.getArgument(0));
        when(containerMapper.toDto(any(Container.class))).thenAnswer(inv -> {
            Container c = inv.getArgument(0);
            return com.containertrack.dto.response.ContainerDTO.builder()
                    .id(c.getId())
                    .status(c.getStatus().name())
                    .build();
        });

        var dto = dischargeService.discharge(1L, dischargeRequest(), 1L);

        assertEquals("DISCHARGED", dto.getStatus());
        assertEquals(ContainerStatus.DISCHARGED, container.getStatus());
    }
}
