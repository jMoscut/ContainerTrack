package com.containertrack.service;

import com.containertrack.dto.request.CreateContainerRequest;
import com.containertrack.dto.request.TransitionRequest;
import com.containertrack.dto.request.UpdateContainerRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.dto.response.DashboardEventDTO;
import com.containertrack.dto.response.FieldChangeDTO;
import com.containertrack.entity.*;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.ConflictException;
import com.containertrack.exception.ForbiddenException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.mapper.ContainerMapper;
import com.containertrack.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContainerService {

    private final ContainerRepository containerRepository;
    private final ShippingCompanyRepository shippingCompanyRepository;
    private final UserRepository userRepository;
    private final ContainerPhotoRepository containerPhotoRepository;
    private final ContainerFieldChangeRepository fieldChangeRepository;
    private final AuditLogRepository auditLogRepository;
    private final ContainerMapper containerMapper;
    private final AuditService auditService;
    private final ContainerStateMachine stateMachine;
    private final ContainerRealtimeNotifier realtimeNotifier;
    private final NotificationService notificationService;

    private static final int REUSE_COOLDOWN_DAYS = 30;

    @Transactional
    public ContainerDTO create(CreateContainerRequest request, Long createdBy) {
        ShippingCompany company = shippingCompanyRepository.findById(request.getShippingCompanyId())
                .orElseThrow(() -> new NotFoundException("Naviera no encontrada."));
        if (!Boolean.TRUE.equals(company.getIsActive())) {
            throw new BadRequestException("SHIPPING_COMPANY_INACTIVE", "La naviera seleccionada no está activa.");
        }

        userRepository.findById(request.getResponsibleOperatorId())
                .orElseThrow(() -> new NotFoundException("Operador responsable no encontrado."));

        if (request.getEstimatedDepartureDate().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            throw new BadRequestException("PAST_DATE", "La fecha estimada de salida no puede estar en el pasado.");
        }

        List<Container> activeDuplicates = containerRepository.findByContainerNumberAndStatusNot(
                request.getContainerNumber(), ContainerStatus.DISCHARGED);
        if (!activeDuplicates.isEmpty()) {
            throw new ConflictException("CONTAINER_ALREADY_ACTIVE",
                    "El contenedor ya está registrado y en estado activo.");
        }

        containerRepository.findTopByContainerNumberAndStatusOrderByDischargeEndAtDesc(
                request.getContainerNumber(), ContainerStatus.DISCHARGED)
                .ifPresent(prev -> {
                    if (prev.getDischargeEndAt() != null &&
                            prev.getDischargeEndAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC).minusDays(REUSE_COOLDOWN_DAYS))) {
                        throw new ConflictException("CONTAINER_NUMBER_COOLDOWN",
                                "Este número de contenedor fue descargado hace menos de 30 días y no puede reutilizarse todavía.");
                    }
                });

        Container container = Container.builder()
                .containerNumber(request.getContainerNumber())
                .shippingCompanyId(company.getId())
                .originPort(request.getOriginPort())
                .destinationPort(request.getDestinationPort())
                .cargoDescription(request.getCargoDescription())
                .responsibleOperatorId(request.getResponsibleOperatorId())
                .status(ContainerStatus.REGISTERED)
                .estimatedDepartureDate(request.getEstimatedDepartureDate())
                .freeDaysLimit(company.getFreeDaysLimit())
                .internalNotes(request.getInternalNotes())
                .delayFlag(false)
                .createdBy(createdBy)
                .build();

        try {
            container = containerRepository.save(container);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("CONTAINER_ALREADY_ACTIVE", "El contenedor ya está registrado y en estado activo.");
        }

        auditService.logCreate("CONTAINER", container.getId(), createdBy);
        realtimeNotifier.notifyDashboardEvent(DashboardEventDTO.builder()
                .type(DashboardEventDTO.EventType.CREATED)
                .containerId(container.getId())
                .containerNumber(container.getContainerNumber())
                .newStatus(container.getStatus().name())
                .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
                .build());
        return enrich(containerMapper.toDto(container));
    }

    public Page<ContainerDTO> list(ContainerStatus status, Long shippingCompanyId, OffsetDateTime dateFrom,
                                    OffsetDateTime dateTo, Long operatorId, Role viewerRole, Pageable pageable) {
        Specification<Container> spec = (root, query, cb) -> cb.conjunction();

        if (viewerRole == Role.WAREHOUSE) {
            spec = spec.and((root, query, cb) ->
                    root.get("status").in(ContainerStatus.ARRIVED_WAREHOUSE, ContainerStatus.DISCHARGED));
        } else if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (shippingCompanyId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("shippingCompanyId"), shippingCompanyId));
        }
        if (operatorId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("responsibleOperatorId"), operatorId));
        }
        if (dateFrom != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("estimatedDepartureDate"), dateFrom));
        }
        if (dateTo != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("estimatedDepartureDate"), dateTo));
        }

        return containerRepository.findAll(spec, pageable).map(c -> enrich(containerMapper.toDto(c)));
    }

    public ContainerDTO get(Long id) {
        Container container = findContainer(id);
        return enrich(containerMapper.toDto(container));
    }

    private Container findContainer(Long id) {
        return containerRepository.findById(id).orElseThrow(() -> new NotFoundException("Contenedor no encontrado."));
    }

    private ContainerDTO enrich(ContainerDTO dto) {
        shippingCompanyRepository.findById(dto.getShippingCompanyId())
                .ifPresent(c -> dto.setShippingCompanyName(c.getName()));
        userRepository.findById(dto.getResponsibleOperatorId())
                .ifPresent(u -> dto.setResponsibleOperatorName(u.getFullName()));
        dto.setPhotoCount((int) containerPhotoRepository.countByContainerId(dto.getId()));
        return dto;
    }

    @Transactional
    public ContainerDTO update(Long id, UpdateContainerRequest request, Long editorId) {
        Container container = findContainer(id);

        if (container.getStatus() == ContainerStatus.DISCHARGED) {
            throw new ForbiddenException("CONTAINER_READ_ONLY",
                    "Este contenedor ya fue descargado y su información es de solo lectura.");
        }

        List<String> changedFields = new ArrayList<>();

        if (request.getShippingCompanyId() != null && !Objects.equals(request.getShippingCompanyId(), container.getShippingCompanyId())) {
            ShippingCompany company = shippingCompanyRepository.findById(request.getShippingCompanyId())
                    .orElseThrow(() -> new NotFoundException("Naviera no encontrada."));
            if (!Boolean.TRUE.equals(company.getIsActive())) {
                throw new BadRequestException("SHIPPING_COMPANY_INACTIVE", "La naviera seleccionada no está activa.");
            }
            recordChange(id, "shippingCompanyId", container.getShippingCompanyId(), request.getShippingCompanyId(), editorId, changedFields);
            container.setShippingCompanyId(request.getShippingCompanyId());
        }
        if (request.getOriginPort() != null && !Objects.equals(request.getOriginPort(), container.getOriginPort())) {
            recordChange(id, "originPort", container.getOriginPort(), request.getOriginPort(), editorId, changedFields);
            container.setOriginPort(request.getOriginPort());
        }
        if (request.getDestinationPort() != null && !Objects.equals(request.getDestinationPort(), container.getDestinationPort())) {
            recordChange(id, "destinationPort", container.getDestinationPort(), request.getDestinationPort(), editorId, changedFields);
            container.setDestinationPort(request.getDestinationPort());
        }
        if (request.getCargoDescription() != null && !Objects.equals(request.getCargoDescription(), container.getCargoDescription())) {
            recordChange(id, "cargoDescription", container.getCargoDescription(), request.getCargoDescription(), editorId, changedFields);
            container.setCargoDescription(request.getCargoDescription());
        }
        if (request.getResponsibleOperatorId() != null && !Objects.equals(request.getResponsibleOperatorId(), container.getResponsibleOperatorId())) {
            userRepository.findById(request.getResponsibleOperatorId())
                    .orElseThrow(() -> new NotFoundException("Operador responsable no encontrado."));
            recordChange(id, "responsibleOperatorId", container.getResponsibleOperatorId(), request.getResponsibleOperatorId(), editorId, changedFields);
            container.setResponsibleOperatorId(request.getResponsibleOperatorId());
        }
        if (request.getEstimatedDepartureDate() != null && !Objects.equals(request.getEstimatedDepartureDate(), container.getEstimatedDepartureDate())) {
            recordChange(id, "estimatedDepartureDate", container.getEstimatedDepartureDate(), request.getEstimatedDepartureDate(), editorId, changedFields);
            container.setEstimatedDepartureDate(request.getEstimatedDepartureDate());
        }
        if (request.getInternalNotes() != null && !Objects.equals(request.getInternalNotes(), container.getInternalNotes())) {
            recordChange(id, "internalNotes", container.getInternalNotes(), request.getInternalNotes(), editorId, changedFields);
            container.setInternalNotes(request.getInternalNotes());
        }

        container.setLastUpdatedBy(editorId);
        container.setLastUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        container = containerRepository.save(container);

        if (!changedFields.isEmpty()) {
            String editorName = userRepository.findById(editorId).map(User::getFullName).orElse("Usuario " + editorId);
            realtimeNotifier.notifyContainerUpdated(container.getId(), changedFields, editorName);
            Container savedContainer = container;
            userRepository.findById(editorId).ifPresent(editor ->
                    notificationService.sendEditConfirmationEmail(savedContainer, changedFields, editor));
        }

        return enrich(containerMapper.toDto(container));
    }

    private void recordChange(Long containerId, String field, Object oldVal, Object newVal, Long editorId, List<String> changedFields) {
        fieldChangeRepository.save(ContainerFieldChange.builder()
                .containerId(containerId)
                .fieldName(field)
                .oldValue(oldVal == null ? null : String.valueOf(oldVal))
                .newValue(newVal == null ? null : String.valueOf(newVal))
                .updatedBy(editorId)
                .build());
        auditService.log("CONTAINER", containerId, AuditAction.UPDATE, field, oldVal, newVal, editorId);
        changedFields.add(field);
    }

    @Transactional
    public ContainerDTO transition(Long id, TransitionRequest request, Long performedBy, Role performerRole) {
        Container container = findContainer(id);
        ContainerStatus current = container.getStatus();
        ContainerStatus target = request.getTargetStatus();

        enforceRolePermissions(performerRole, target);

        stateMachine.validateTransition(current, target);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        switch (target) {
            case DEPARTED_ORIGIN -> {
                if (request.getActualDepartureDate() == null) {
                    throw new BadRequestException("MISSING_FIELD", "actualDepartureDate es requerido.");
                }
                if (request.getActualDepartureDate().isAfter(now)) {
                    throw new BadRequestException("FUTURE_DATE", "La fecha real de salida no puede estar en el futuro.");
                }
                container.setActualDepartureDate(request.getActualDepartureDate());
                if (request.getEstimatedArrivalPort() != null) {
                    container.setEstimatedArrivalPort(request.getEstimatedArrivalPort());
                }
            }
            case ARRIVED_PORT -> {
                if (request.getActualArrivalPort() == null) {
                    throw new BadRequestException("MISSING_FIELD", "actualArrivalPort es requerido.");
                }
                if (request.getActualArrivalPort().isAfter(now)) {
                    throw new BadRequestException("FUTURE_DATE", "La fecha real de arribo a puerto no puede estar en el futuro.");
                }
                container.setActualArrivalPort(request.getActualArrivalPort());
                int freeDays = request.getFreeDaysLimitOverride() != null
                        ? request.getFreeDaysLimitOverride() : container.getFreeDaysLimit();
                container.setFreeDaysLimit(freeDays);
                container.setFreeDaysExpiry(addBusinessDays(request.getActualArrivalPort(), freeDays));

                if (container.getEstimatedArrivalPort() != null) {
                    long diffHours = Math.abs(java.time.Duration.between(
                            container.getEstimatedArrivalPort(), request.getActualArrivalPort()).toHours());
                    if (diffHours > 48) {
                        container.setDelayFlag(true);
                    }
                }
            }
            case DEPARTED_PORT -> {
                if (request.getActualDeparturePort() == null) {
                    throw new BadRequestException("MISSING_FIELD", "actualDeparturePort es requerido.");
                }
                if (request.getActualDeparturePort().isAfter(now)) {
                    throw new BadRequestException("FUTURE_DATE", "La fecha real de salida de puerto no puede estar en el futuro.");
                }
                container.setActualDeparturePort(request.getActualDeparturePort());
                if (request.getEstimatedArrivalWarehouse() != null) {
                    container.setEstimatedArrivalWarehouse(request.getEstimatedArrivalWarehouse());
                }
            }
            case ARRIVED_WAREHOUSE -> {
                if (request.getActualArrivalWarehouse() == null) {
                    throw new BadRequestException("MISSING_FIELD", "actualArrivalWarehouse es requerido.");
                }
                if (request.getActualArrivalWarehouse().isAfter(now)) {
                    throw new BadRequestException("FUTURE_DATE", "La fecha real de arribo a bodega no puede estar en el futuro.");
                }
                container.setActualArrivalWarehouse(request.getActualArrivalWarehouse());
            }
            default -> throw new BadRequestException("INVALID_TRANSITION", "Transición no soportada.");
        }

        container.setStatus(target);
        container.setLastUpdatedBy(performedBy);
        container.setLastUpdatedAt(now);
        container = containerRepository.save(container);

        auditService.logStatusChange("CONTAINER", container.getId(), current.name(), target.name(), performedBy);
        String performerName = userRepository.findById(performedBy).map(User::getFullName).orElse("Usuario " + performedBy);
        realtimeNotifier.notifyContainerUpdated(container.getId(), List.of("status"), performerName);
        realtimeNotifier.notifyDashboardEvent(DashboardEventDTO.builder()
                .type(DashboardEventDTO.EventType.STATUS_CHANGED)
                .containerId(container.getId())
                .containerNumber(container.getContainerNumber())
                .newStatus(target.name())
                .timestamp(now)
                .build());

        return enrich(containerMapper.toDto(container));
    }

    private void enforceRolePermissions(Role role, ContainerStatus target) {
        if (role == Role.WAREHOUSE) {
            // WAREHOUSE can only register arrival to warehouse; discharge is via a dedicated endpoint.
            if (target != ContainerStatus.ARRIVED_WAREHOUSE) {
                throw new ForbiddenException("ROLE_NOT_ALLOWED",
                        "El rol WAREHOUSE solo puede registrar el arribo a bodega.");
            }
        }
        // ADMIN and OPERATOR can perform any transition up through ARRIVED_WAREHOUSE (per CU-05.4).
    }

    /** Adds N business days (skipping Saturday/Sunday) to the given instant. */
    public static OffsetDateTime addBusinessDays(OffsetDateTime start, int businessDays) {
        OffsetDateTime result = start;
        int added = 0;
        while (added < businessDays) {
            result = result.plusDays(1);
            DayOfWeek dow = result.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                added++;
            }
        }
        return result;
    }

    public List<FieldChangeDTO> history(Long id) {
        findContainer(id); // ensure exists

        List<FieldChangeDTO> result = new ArrayList<>();

        result.addAll(fieldChangeRepository.findByContainerIdOrderByUpdatedAtAsc(id).stream()
                .map(fc -> FieldChangeDTO.builder()
                        .type("FIELD_CHANGE")
                        .fieldName(fc.getFieldName())
                        .oldValue(fc.getOldValue())
                        .newValue(fc.getNewValue())
                        .updatedById(fc.getUpdatedBy())
                        .updatedByName(userRepository.findById(fc.getUpdatedBy()).map(User::getFullName).orElse(null))
                        .updatedAt(fc.getUpdatedAt())
                        .build())
                .collect(Collectors.toList()));

        result.addAll(auditLogRepository.findByEntityTypeAndEntityIdAndActionOrderByPerformedAtAsc(
                        "CONTAINER", id, AuditAction.STATUS_CHANGE).stream()
                .map(al -> FieldChangeDTO.builder()
                        .type("STATUS_CHANGE")
                        .fieldName(al.getFieldName())
                        .oldValue(al.getOldValue())
                        .newValue(al.getNewValue())
                        .updatedById(al.getPerformedBy())
                        .updatedByName(al.getPerformedBy() == null ? null :
                                userRepository.findById(al.getPerformedBy()).map(User::getFullName).orElse(null))
                        .updatedAt(al.getPerformedAt())
                        .build())
                .collect(Collectors.toList()));

        result.sort((a, b) -> a.getUpdatedAt().compareTo(b.getUpdatedAt()));
        return result;
    }

    public Container getEntity(Long id) {
        return findContainer(id);
    }

    /**
     * Physical delete — the only hard delete in the system (everything else is audit-only).
     * Only allowed while the container is still REGISTERED, i.e. it never started transit
     * and has no lifecycle activity to preserve.
     */
    @Transactional
    public void delete(Long id, Long performedBy) {
        Container container = findContainer(id);
        if (container.getStatus() != ContainerStatus.REGISTERED) {
            throw new ConflictException("CANNOT_DELETE_CONTAINER",
                    "Solo se pueden eliminar contenedores en estado REGISTERED que aún no han iniciado tránsito.");
        }

        auditService.log("CONTAINER", container.getId(), AuditAction.DELETE, null, null, null, performedBy);
        containerRepository.delete(container);
    }
}
