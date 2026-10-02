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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    private final LandCarrierRepository landCarrierRepository;
    private final UserRepository userRepository;
    private final ContainerPhotoRepository containerPhotoRepository;
    private final ContainerFieldChangeRepository fieldChangeRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final ContainerMapper containerMapper;
    private final AuditService auditService;
    private final ContainerStateMachine stateMachine;
    private final ContainerRealtimeNotifier realtimeNotifier;
    private final NotificationService notificationService;

    private static final int REUSE_COOLDOWN_DAYS = 30;
    private static final ZoneId GUATEMALA_ZONE = ZoneId.of("America/Guatemala");

    @Transactional
    public ContainerDTO create(CreateContainerRequest request, Long createdBy) {
        ShippingCompany company = shippingCompanyRepository.findById(request.getShippingCompanyId())
                .orElseThrow(() -> new NotFoundException("Naviera no encontrada."));
        if (!Boolean.TRUE.equals(company.getIsActive())) {
            throw new BadRequestException("SHIPPING_COMPANY_INACTIVE", "La naviera seleccionada no está activa.");
        }

        User operator = userRepository.findById(request.getResponsibleOperatorId())
                .orElseThrow(() -> new NotFoundException("Operador responsable no encontrado."));
        if (operator.getRole() == Role.WAREHOUSE) {
            // WAREHOUSE staff get assigned to a container separately (assignWarehouse,
            // once it reaches port) — they're never the "operador responsable" that
            // owns it from creation.
            throw new BadRequestException("INVALID_OPERATOR_ROLE",
                    "El operador responsable debe tener rol ADMIN u OPERATOR.");
        }

        // Compared calendar-date-wise in Guatemala time, not instant-wise: this field is
        // date-only in the UI, so "today" must always be accepted regardless of what time
        // it currently is — an instant comparison would reject "today" the moment its
        // Guatemala-midnight instant passes, i.e. almost immediately every single day.
        LocalDate estimatedDate = request.getEstimatedDepartureDate().atZoneSameInstant(GUATEMALA_ZONE).toLocalDate();
        LocalDate todayInGuatemala = OffsetDateTime.now(ZoneOffset.UTC).atZoneSameInstant(GUATEMALA_ZONE).toLocalDate();
        if (estimatedDate.isBefore(todayInGuatemala)) {
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
                .blNumber(request.getBlNumber())
                .shippingCompanyId(company.getId())
                .landCarrierId(request.getLandCarrierId())
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

        // Every role sees containers in every state now — full-lifecycle visibility so
        // WAREHOUSE staff stay aware of what's coming, even before it's their turn to
        // act on it. Editing/transition rights stay separately gated (see update()/
        // enforceRolePermissions()) to DEPARTED_PORT onward.
        if (status != null) {
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
        if (dto.getLastUpdatedBy() != null) {
            userRepository.findById(dto.getLastUpdatedBy())
                    .ifPresent(u -> dto.setLastUpdatedByName(u.getFullName()));
        }
        if (dto.getLandCarrierId() != null) {
            landCarrierRepository.findById(dto.getLandCarrierId())
                    .ifPresent(c -> dto.setLandCarrierName(c.getName()));
        }
        if (dto.getWarehouseAssigneeId() != null) {
            userRepository.findById(dto.getWarehouseAssigneeId())
                    .ifPresent(u -> dto.setWarehouseAssigneeName(u.getFullName()));
        }
        dto.setPhotoCount((int) containerPhotoRepository.countByContainerId(dto.getId()));
        return dto;
    }

    @Transactional
    public ContainerDTO update(Long id, UpdateContainerRequest request, Long editorId, Role editorRole) {
        Container container = findContainer(id);

        if (container.getStatus() == ContainerStatus.DISCHARGED) {
            throw new ForbiddenException("CONTAINER_READ_ONLY",
                    "Este contenedor ya fue descargado y su información es de solo lectura.");
        }

        enforceAssignment(container, editorId, editorRole);

        // WAREHOUSE can see every container (full-lifecycle visibility), but may only
        // edit it once it has left port — before that it isn't their responsibility yet.
        // Exception: landCarrierId ("transporte terrestre") can be set as early as
        // ARRIVED_PORT, since that's when it's actually known/needed.
        if (editorRole == Role.WAREHOUSE) {
            boolean onlyLandCarrierChanging = request.getShippingCompanyId() == null && request.getOriginPort() == null
                    && request.getDestinationPort() == null && request.getCargoDescription() == null
                    && request.getResponsibleOperatorId() == null && request.getEstimatedDepartureDate() == null
                    && request.getInternalNotes() == null && request.getBlNumber() == null
                    && request.getLandCarrierId() != null;
            int minOrdinal = onlyLandCarrierChanging
                    ? ContainerStatus.ARRIVED_PORT.ordinal() : ContainerStatus.DEPARTED_PORT.ordinal();
            if (container.getStatus().ordinal() < minOrdinal) {
                throw new ForbiddenException("ROLE_NOT_ALLOWED",
                        "El rol WAREHOUSE solo puede editar contenedores que ya salieron del puerto.");
            }
        }

        List<String> changedFields = new ArrayList<>();

        if (request.getBlNumber() != null && !Objects.equals(request.getBlNumber(), container.getBlNumber())) {
            recordChange(id, "blNumber", container.getBlNumber(), request.getBlNumber(), editorId, null, changedFields);
            container.setBlNumber(request.getBlNumber());
        }
        if (request.getLandCarrierId() != null && !Objects.equals(request.getLandCarrierId(), container.getLandCarrierId())) {
            LandCarrier carrier = landCarrierRepository.findById(request.getLandCarrierId())
                    .orElseThrow(() -> new NotFoundException("Transportista terrestre no encontrado."));
            if (!Boolean.TRUE.equals(carrier.getIsActive())) {
                throw new BadRequestException("LAND_CARRIER_INACTIVE", "El transportista terrestre seleccionado no está activo.");
            }
            recordChange(id, "landCarrierId", container.getLandCarrierId(), request.getLandCarrierId(), editorId, null, changedFields);
            container.setLandCarrierId(request.getLandCarrierId());
        }

        if (request.getShippingCompanyId() != null && !Objects.equals(request.getShippingCompanyId(), container.getShippingCompanyId())) {
            ShippingCompany company = shippingCompanyRepository.findById(request.getShippingCompanyId())
                    .orElseThrow(() -> new NotFoundException("Naviera no encontrada."));
            if (!Boolean.TRUE.equals(company.getIsActive())) {
                throw new BadRequestException("SHIPPING_COMPANY_INACTIVE", "La naviera seleccionada no está activa.");
            }
            recordChange(id, "shippingCompanyId", container.getShippingCompanyId(), request.getShippingCompanyId(), editorId, null, changedFields);
            container.setShippingCompanyId(request.getShippingCompanyId());
        }
        if (request.getOriginPort() != null && !Objects.equals(request.getOriginPort(), container.getOriginPort())) {
            recordChange(id, "originPort", container.getOriginPort(), request.getOriginPort(), editorId, null, changedFields);
            container.setOriginPort(request.getOriginPort());
        }
        if (request.getDestinationPort() != null && !Objects.equals(request.getDestinationPort(), container.getDestinationPort())) {
            recordChange(id, "destinationPort", container.getDestinationPort(), request.getDestinationPort(), editorId, null, changedFields);
            container.setDestinationPort(request.getDestinationPort());
        }
        if (request.getCargoDescription() != null && !Objects.equals(request.getCargoDescription(), container.getCargoDescription())) {
            recordChange(id, "cargoDescription", container.getCargoDescription(), request.getCargoDescription(), editorId, null, changedFields);
            container.setCargoDescription(request.getCargoDescription());
        }
        if (request.getResponsibleOperatorId() != null && !Objects.equals(request.getResponsibleOperatorId(), container.getResponsibleOperatorId())) {
            User newOperator = userRepository.findById(request.getResponsibleOperatorId())
                    .orElseThrow(() -> new NotFoundException("Operador responsable no encontrado."));
            if (newOperator.getRole() == Role.WAREHOUSE) {
                throw new BadRequestException("INVALID_OPERATOR_ROLE",
                        "El operador responsable debe tener rol ADMIN u OPERATOR.");
            }
            recordChange(id, "responsibleOperatorId", container.getResponsibleOperatorId(), request.getResponsibleOperatorId(), editorId, null, changedFields);
            container.setResponsibleOperatorId(request.getResponsibleOperatorId());
        }
        applyDateCorrections(id, request, container, editorId, changedFields);

        if (request.getInternalNotes() != null && !Objects.equals(request.getInternalNotes(), container.getInternalNotes())) {
            recordChange(id, "internalNotes", container.getInternalNotes(), request.getInternalNotes(), editorId, null, changedFields);
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

    private void recordChange(Long containerId, String field, Object oldVal, Object newVal, Long editorId,
                               String reason, List<String> changedFields) {
        fieldChangeRepository.save(ContainerFieldChange.builder()
                .containerId(containerId)
                .fieldName(field)
                .oldValue(oldVal == null ? null : String.valueOf(oldVal))
                .newValue(newVal == null ? null : String.valueOf(newVal))
                .updatedBy(editorId)
                .reason(reason)
                .build());
        auditService.log("CONTAINER", containerId, AuditAction.UPDATE, field, oldVal, newVal, editorId);
        changedFields.add(field);
    }

    /**
     * Lifecycle dates (estimated + actual) and free days are normally set while the
     * container progresses through /transition, but can be corrected here after the
     * fact — e.g. a container registered retroactively, once its whole history is
     * already known. Any such correction requires a justification (dateChangeReason)
     * and is re-validated against the full chronological chain so a fix can't put the
     * dates out of order with each other.
     */
    private void applyDateCorrections(Long id, UpdateContainerRequest request, Container container,
                                       Long editorId, List<String> changedFields) {
        boolean estimatedDepartureChanging = request.getEstimatedDepartureDate() != null
                && !Objects.equals(request.getEstimatedDepartureDate(), container.getEstimatedDepartureDate());
        boolean estimatedArrivalPortChanging = request.getEstimatedArrivalPort() != null
                && !Objects.equals(request.getEstimatedArrivalPort(), container.getEstimatedArrivalPort());
        boolean actualDepartureChanging = request.getActualDepartureDate() != null
                && !Objects.equals(request.getActualDepartureDate(), container.getActualDepartureDate());
        boolean actualArrivalPortChanging = request.getActualArrivalPort() != null
                && !Objects.equals(request.getActualArrivalPort(), container.getActualArrivalPort());
        boolean actualDeparturePortChanging = request.getActualDeparturePort() != null
                && !Objects.equals(request.getActualDeparturePort(), container.getActualDeparturePort());
        boolean estimatedArrivalWarehouseChanging = request.getEstimatedArrivalWarehouse() != null
                && !Objects.equals(request.getEstimatedArrivalWarehouse(), container.getEstimatedArrivalWarehouse());
        boolean actualArrivalWarehouseChanging = request.getActualArrivalWarehouse() != null
                && !Objects.equals(request.getActualArrivalWarehouse(), container.getActualArrivalWarehouse());
        boolean freeDaysLimitChanging = request.getFreeDaysLimit() != null
                && !Objects.equals(request.getFreeDaysLimit(), container.getFreeDaysLimit());
        boolean freeDaysExpiryChanging = request.getFreeDaysExpiry() != null
                && !Objects.equals(request.getFreeDaysExpiry(), container.getFreeDaysExpiry());

        boolean anyDateChanging = estimatedDepartureChanging || estimatedArrivalPortChanging || actualDepartureChanging
                || actualArrivalPortChanging || actualDeparturePortChanging || estimatedArrivalWarehouseChanging
                || actualArrivalWarehouseChanging || freeDaysLimitChanging || freeDaysExpiryChanging;
        if (!anyDateChanging) {
            return;
        }

        String reason = request.getDateChangeReason();
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("REASON_REQUIRED", "Debes indicar el motivo del cambio de fecha.");
        }

        // Validate the resulting chain (requested value where provided, current value
        // otherwise) stays in chronological order end to end before applying anything.
        OffsetDateTime finalActualDeparture = actualDepartureChanging ? request.getActualDepartureDate() : container.getActualDepartureDate();
        OffsetDateTime finalActualArrivalPort = actualArrivalPortChanging ? request.getActualArrivalPort() : container.getActualArrivalPort();
        OffsetDateTime finalActualDeparturePort = actualDeparturePortChanging ? request.getActualDeparturePort() : container.getActualDeparturePort();
        OffsetDateTime finalActualArrivalWarehouse = actualArrivalWarehouseChanging ? request.getActualArrivalWarehouse() : container.getActualArrivalWarehouse();

        if (finalActualDeparture != null && finalActualArrivalPort != null && finalActualArrivalPort.isBefore(finalActualDeparture)) {
            throw new BadRequestException("DATE_ORDER", "La fecha real de arribo a puerto no puede ser anterior a la fecha real de salida.");
        }
        if (finalActualArrivalPort != null && finalActualDeparturePort != null && finalActualDeparturePort.isBefore(finalActualArrivalPort)) {
            throw new BadRequestException("DATE_ORDER", "La fecha real de salida de puerto no puede ser anterior a la fecha real de arribo a puerto.");
        }
        if (finalActualDeparturePort != null && finalActualArrivalWarehouse != null && finalActualArrivalWarehouse.isBefore(finalActualDeparturePort)) {
            throw new BadRequestException("DATE_ORDER", "La fecha real de arribo a bodega no puede ser anterior a la fecha real de salida de puerto.");
        }

        if (estimatedDepartureChanging) {
            recordChange(id, "estimatedDepartureDate", container.getEstimatedDepartureDate(), request.getEstimatedDepartureDate(), editorId, reason, changedFields);
            container.setEstimatedDepartureDate(request.getEstimatedDepartureDate());
        }
        if (estimatedArrivalPortChanging) {
            recordChange(id, "estimatedArrivalPort", container.getEstimatedArrivalPort(), request.getEstimatedArrivalPort(), editorId, reason, changedFields);
            container.setEstimatedArrivalPort(request.getEstimatedArrivalPort());
        }
        if (actualDepartureChanging) {
            recordChange(id, "actualDepartureDate", container.getActualDepartureDate(), request.getActualDepartureDate(), editorId, reason, changedFields);
            container.setActualDepartureDate(request.getActualDepartureDate());
        }
        if (actualArrivalPortChanging) {
            recordChange(id, "actualArrivalPort", container.getActualArrivalPort(), request.getActualArrivalPort(), editorId, reason, changedFields);
            container.setActualArrivalPort(request.getActualArrivalPort());
        }
        if (actualDeparturePortChanging) {
            recordChange(id, "actualDeparturePort", container.getActualDeparturePort(), request.getActualDeparturePort(), editorId, reason, changedFields);
            container.setActualDeparturePort(request.getActualDeparturePort());
        }
        if (estimatedArrivalWarehouseChanging) {
            recordChange(id, "estimatedArrivalWarehouse", container.getEstimatedArrivalWarehouse(), request.getEstimatedArrivalWarehouse(), editorId, reason, changedFields);
            container.setEstimatedArrivalWarehouse(request.getEstimatedArrivalWarehouse());
        }
        if (actualArrivalWarehouseChanging) {
            recordChange(id, "actualArrivalWarehouse", container.getActualArrivalWarehouse(), request.getActualArrivalWarehouse(), editorId, reason, changedFields);
            container.setActualArrivalWarehouse(request.getActualArrivalWarehouse());
        }
        if (freeDaysLimitChanging) {
            recordChange(id, "freeDaysLimit", container.getFreeDaysLimit(), request.getFreeDaysLimit(), editorId, reason, changedFields);
            container.setFreeDaysLimit(request.getFreeDaysLimit());
        }
        if (freeDaysExpiryChanging) {
            recordChange(id, "freeDaysExpiry", container.getFreeDaysExpiry(), request.getFreeDaysExpiry(), editorId, reason, changedFields);
            container.setFreeDaysExpiry(request.getFreeDaysExpiry());
        }
    }

    @Transactional
    public ContainerDTO transition(Long id, TransitionRequest request, Long performedBy, Role performerRole) {
        Container container = findContainer(id);
        ContainerStatus current = container.getStatus();
        ContainerStatus target = request.getTargetStatus();

        enforceRolePermissions(performerRole, target);
        enforceAssignment(container, performedBy, performerRole);

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
                if (container.getActualDepartureDate() != null
                        && request.getActualArrivalPort().isBefore(container.getActualDepartureDate())) {
                    throw new BadRequestException("DATE_ORDER",
                            "La fecha real de arribo a puerto no puede ser anterior a la fecha real de salida.");
                }
                container.setActualArrivalPort(request.getActualArrivalPort());
                int freeDays = request.getFreeDaysLimitOverride() != null
                        ? request.getFreeDaysLimitOverride() : container.getFreeDaysLimit();
                container.setFreeDaysLimit(freeDays);
                container.setFreeDaysExpiry(addCalendarDays(request.getActualArrivalPort(), freeDays));

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
                if (container.getActualArrivalPort() != null
                        && request.getActualDeparturePort().isBefore(container.getActualArrivalPort())) {
                    throw new BadRequestException("DATE_ORDER",
                            "La fecha real de salida de puerto no puede ser anterior a la fecha real de arribo a puerto.");
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
                if (container.getActualDeparturePort() != null
                        && request.getActualArrivalWarehouse().isBefore(container.getActualDeparturePort())) {
                    throw new BadRequestException("DATE_ORDER",
                            "La fecha real de arribo a bodega no puede ser anterior a la fecha real de salida de puerto.");
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
            return;
        }
        // ADMIN and OPERATOR can advance the container up through DEPARTED_PORT only —
        // arriving at warehouse and discharging close out the cycle and are reserved for
        // the assigned WAREHOUSE user, even for ADMIN. This mirrors the real org chart:
        // bodega is the one who signs off on what physically arrived.
        if (target == ContainerStatus.ARRIVED_WAREHOUSE) {
            throw new ForbiddenException("ROLE_NOT_ALLOWED",
                    "Solo el responsable de bodega puede registrar el arribo a bodega.");
        }
    }

    /**
     * Only the user specifically assigned to this container may edit/transition it —
     * not just anyone holding the right role. ADMIN is exempt (can always act).
     */
    private void enforceAssignment(Container container, Long userId, Role role) {
        if (role == Role.ADMIN) return;
        if (role == Role.OPERATOR) {
            if (!Objects.equals(container.getResponsibleOperatorId(), userId)) {
                throw new ForbiddenException("NOT_ASSIGNED", "No estás asignado como operador responsable de este contenedor.");
            }
            return;
        }
        if (role == Role.WAREHOUSE) {
            if (container.getWarehouseAssigneeId() == null || !Objects.equals(container.getWarehouseAssigneeId(), userId)) {
                throw new ForbiddenException("NOT_ASSIGNED", "No estás asignado como responsable de bodega de este contenedor.");
            }
        }
    }

    @Transactional
    public ContainerDTO assignWarehouse(Long id, Long warehouseAssigneeId, Long performedBy, Role performerRole) {
        Container container = findContainer(id);

        if (performerRole == Role.OPERATOR && !Objects.equals(container.getResponsibleOperatorId(), performedBy)) {
            throw new ForbiddenException("NOT_ASSIGNED", "No estás asignado como operador responsable de este contenedor.");
        }
        if (container.getStatus().ordinal() < ContainerStatus.ARRIVED_PORT.ordinal()) {
            throw new BadRequestException("CONTAINER_NOT_AT_PORT",
                    "Solo se puede asignar bodega una vez el contenedor llegó a puerto.");
        }

        User assignee = userRepository.findById(warehouseAssigneeId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado."));
        if (assignee.getRole() != Role.WAREHOUSE) {
            throw new BadRequestException("INVALID_ASSIGNEE_ROLE", "El responsable de bodega debe tener rol WAREHOUSE.");
        }

        Long oldAssignee = container.getWarehouseAssigneeId();
        container.setWarehouseAssigneeId(warehouseAssigneeId);
        container.setLastUpdatedBy(performedBy);
        container.setLastUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        container = containerRepository.save(container);

        auditService.logFieldChangeIfDiffers("CONTAINER", id, "warehouseAssigneeId", oldAssignee, warehouseAssigneeId, performedBy);
        return enrich(containerMapper.toDto(container));
    }

    /** Adds N calendar days (corridos) to the given instant — weekends count, no skipping. */
    public static OffsetDateTime addCalendarDays(OffsetDateTime start, int days) {
        return start.plusDays(days);
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
                        .reason(fc.getReason())
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

        // A REGISTERED container never has photos and is very unlikely to have
        // notification_log rows (those only trigger off later-stage date fields), but it
        // CAN already have container_field_changes from ordinary edits (CU-12) before
        // deletion — none of these FKs cascade at the DB level, so clear them explicitly
        // or the delete below fails with a data-integrity violation.
        fieldChangeRepository.deleteByContainerId(id);
        containerPhotoRepository.deleteByContainerId(id);
        notificationLogRepository.deleteByContainerId(id);

        auditService.log("CONTAINER", container.getId(), AuditAction.DELETE, null, null, null, performedBy);
        containerRepository.delete(container);
    }
}
