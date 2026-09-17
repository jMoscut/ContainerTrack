package com.containertrack.service;

import com.containertrack.dto.request.CreateContainerRequest;
import com.containertrack.dto.request.TransitionRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.entity.Role;
import com.containertrack.entity.ShippingCompany;
import com.containertrack.exception.BadRequestException;
import com.containertrack.mapper.ContainerMapper;
import com.containertrack.repository.AuditLogRepository;
import com.containertrack.repository.ContainerFieldChangeRepository;
import com.containertrack.repository.ContainerPhotoRepository;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.NotificationLogRepository;
import com.containertrack.repository.ShippingCompanyRepository;
import com.containertrack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContainerServiceTest {

    @Mock
    private ContainerRepository containerRepository;
    @Mock
    private ShippingCompanyRepository shippingCompanyRepository;
    @Mock
    private com.containertrack.repository.LandCarrierRepository landCarrierRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContainerPhotoRepository containerPhotoRepository;
    @Mock
    private ContainerFieldChangeRepository fieldChangeRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private NotificationLogRepository notificationLogRepository;
    @Mock
    private ContainerMapper containerMapper;
    @Mock
    private AuditService auditService;
    @Mock
    private ContainerRealtimeNotifier realtimeNotifier;
    @Mock
    private NotificationService notificationService;

    // Real (unmocked) since it's simple, deterministic pure logic under test in item 3/4.
    private final ContainerStateMachine stateMachine = new ContainerStateMachine();

    private ContainerService containerService;

    private ShippingCompany activeCompany;

    @BeforeEach
    void setUp() {
        containerService = new ContainerService(containerRepository, shippingCompanyRepository, landCarrierRepository,
                userRepository, containerPhotoRepository, fieldChangeRepository, auditLogRepository, notificationLogRepository,
                containerMapper, auditService, stateMachine, realtimeNotifier, notificationService);

        activeCompany = ShippingCompany.builder()
                .id(10L)
                .name("Maersk")
                .shortCode("MSK")
                .isActive(true)
                .freeDaysLimit(10)
                .build();

        // Default mapper stub: mirror the entity's status/id onto a DTO so tests can assert on it.
        lenient().when(containerMapper.toDto(any(Container.class))).thenAnswer(inv -> {
            Container c = inv.getArgument(0);
            return ContainerDTO.builder()
                    .id(c.getId())
                    .containerNumber(c.getContainerNumber())
                    .shippingCompanyId(c.getShippingCompanyId())
                    .responsibleOperatorId(c.getResponsibleOperatorId())
                    .status(c.getStatus() == null ? null : c.getStatus().name())
                    .build();
        });
        lenient().when(containerPhotoRepository.countByContainerId(any())).thenReturn(0L);
    }

    private CreateContainerRequest createRequest() {
        CreateContainerRequest request = new CreateContainerRequest();
        request.setContainerNumber("MSKU1234565");
        request.setBlNumber("BL-TEST-1");
        request.setShippingCompanyId(10L);
        request.setOriginPort("Shanghai");
        request.setDestinationPort("Los Angeles");
        request.setResponsibleOperatorId(5L);
        request.setEstimatedDepartureDate(OffsetDateTime.now(ZoneOffset.UTC).plusDays(5));
        return request;
    }

    @Test
    void registeringContainerWithActiveCompanySavesItAsRegistered() {
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.of(activeCompany));
        when(userRepository.findById(5L)).thenReturn(Optional.of(
                com.containertrack.entity.User.builder().id(5L).fullName("Op").build()));
        when(containerRepository.findByContainerNumberAndStatusNot(any(), any())).thenReturn(List.of());
        when(containerRepository.findTopByContainerNumberAndStatusOrderByDischargeEndAtDesc(any(), any()))
                .thenReturn(Optional.empty());
        when(containerRepository.save(any(Container.class))).thenAnswer(inv -> {
            Container c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        ContainerDTO dto = containerService.create(createRequest(), 1L);

        ArgumentCaptor<Container> captor = ArgumentCaptor.forClass(Container.class);
        org.mockito.Mockito.verify(containerRepository).save(captor.capture());
        assertEquals(ContainerStatus.REGISTERED, captor.getValue().getStatus());
        assertEquals("REGISTERED", dto.getStatus());
    }

    @Test
    void registeringContainerAgainstInactiveCompanyThrowsBadRequestException() {
        ShippingCompany inactiveCompany = ShippingCompany.builder()
                .id(10L).name("Maersk").shortCode("MSK").isActive(false).freeDaysLimit(10).build();
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.of(inactiveCompany));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> containerService.create(createRequest(), 1L));

        assertEquals("SHIPPING_COMPANY_INACTIVE", ex.getCode());
    }

    @Test
    void validSequentialTransitionUpdatesContainerStatus() {
        Container container = Container.builder()
                .id(1L)
                .containerNumber("MSKU1234565")
                .shippingCompanyId(10L)
                .responsibleOperatorId(5L)
                .status(ContainerStatus.REGISTERED)
                .estimatedDepartureDate(OffsetDateTime.now(ZoneOffset.UTC).plusDays(1))
                .build();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(containerRepository.save(any(Container.class))).thenAnswer(inv -> inv.getArgument(0));

        TransitionRequest request = new TransitionRequest();
        request.setTargetStatus(ContainerStatus.DEPARTED_ORIGIN);
        request.setActualDepartureDate(OffsetDateTime.now(ZoneOffset.UTC).minusHours(1));

        ContainerDTO dto = containerService.transition(1L, request, 5L, Role.OPERATOR);

        assertEquals("DEPARTED_ORIGIN", dto.getStatus());
        assertEquals(ContainerStatus.DEPARTED_ORIGIN, container.getStatus());
    }

    @Test
    void invalidSkippingTransitionThrowsBadRequestException() {
        Container container = Container.builder()
                .id(1L)
                .containerNumber("MSKU1234565")
                .shippingCompanyId(10L)
                .responsibleOperatorId(5L)
                .status(ContainerStatus.REGISTERED)
                .estimatedDepartureDate(OffsetDateTime.now(ZoneOffset.UTC).plusDays(1))
                .build();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));

        TransitionRequest request = new TransitionRequest();
        request.setTargetStatus(ContainerStatus.ARRIVED_PORT);
        request.setActualArrivalPort(OffsetDateTime.now(ZoneOffset.UTC));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> containerService.transition(1L, request, 5L, Role.OPERATOR));

        assertEquals("INVALID_TRANSITION", ex.getCode());
    }

    @Test
    void directTransitionToDischargedThroughGenericEndpointThrowsBadRequestException() {
        Container container = Container.builder()
                .id(1L)
                .containerNumber("MSKU1234565")
                .shippingCompanyId(10L)
                .responsibleOperatorId(5L)
                .status(ContainerStatus.ARRIVED_WAREHOUSE)
                .estimatedDepartureDate(OffsetDateTime.now(ZoneOffset.UTC).plusDays(1))
                .build();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));

        TransitionRequest request = new TransitionRequest();
        request.setTargetStatus(ContainerStatus.DISCHARGED);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> containerService.transition(1L, request, 5L, Role.OPERATOR));

        assertEquals("DISCHARGE_VIA_DEDICATED_ENDPOINT", ex.getCode());
    }
}
