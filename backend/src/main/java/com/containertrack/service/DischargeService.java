package com.containertrack.service;

import com.containertrack.dto.request.DischargeRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.dto.response.DashboardEventDTO;
import com.containertrack.entity.AuditAction;
import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.exception.BadRequestException;
import com.containertrack.mapper.ContainerMapper;
import com.containertrack.repository.ContainerPhotoRepository;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.ShippingCompanyRepository;
import com.containertrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DischargeService {

    private final ContainerRepository containerRepository;
    private final ContainerPhotoRepository containerPhotoRepository;
    private final ShippingCompanyRepository shippingCompanyRepository;
    private final UserRepository userRepository;
    private final ContainerMapper containerMapper;
    private final AuditService auditService;
    private final ContainerStateMachine stateMachine;
    private final ContainerRealtimeNotifier realtimeNotifier;
    private final NotificationService notificationService;

    @Transactional
    public ContainerDTO discharge(Long containerId, DischargeRequest request, Long performedBy) {
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new com.containertrack.exception.NotFoundException("Contenedor no encontrado."));

        stateMachine.validateDischarge(container.getStatus());

        long photoCount = containerPhotoRepository.countByContainerId(containerId);
        if (photoCount < 1) {
            throw new BadRequestException("PHOTOS_REQUIRED", "Debe subir al menos una foto antes de descargar el contenedor.");
        }

        if (request.getDischargeEndAt().isBefore(request.getDischargeStartAt())) {
            throw new BadRequestException("INVALID_DISCHARGE_WINDOW", "La fecha de fin de descarga debe ser posterior o igual a la de inicio.");
        }

        ContainerStatus previousStatus = container.getStatus();
        container.setDischargeStartAt(request.getDischargeStartAt());
        container.setDischargeEndAt(request.getDischargeEndAt());
        container.setDischargeNotes(request.getDischargeNotes());
        container.setStatus(ContainerStatus.DISCHARGED);
        container.setLastUpdatedBy(performedBy);
        container.setLastUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        container = containerRepository.save(container);

        auditService.logStatusChange("CONTAINER", container.getId(), previousStatus.name(),
                ContainerStatus.DISCHARGED.name(), performedBy);

        User performer = userRepository.findById(performedBy).orElse(null);
        String performerName = performer != null ? performer.getFullName() : "Usuario " + performedBy;
        realtimeNotifier.notifyContainerUpdated(container.getId(), List.of("status", "dischargeStartAt", "dischargeEndAt"), performerName);
        realtimeNotifier.notifyDashboardEvent(DashboardEventDTO.builder()
                .type(DashboardEventDTO.EventType.DISCHARGED)
                .containerId(container.getId())
                .containerNumber(container.getContainerNumber())
                .newStatus(ContainerStatus.DISCHARGED.name())
                .timestamp(OffsetDateTime.now(ZoneOffset.UTC))
                .build());

        if (performer != null) {
            Container dischargedContainer = container;
            notificationService.sendDischargeConfirmationEmail(dischargedContainer, performer, performer.getEmail());
            userRepository.findById(dischargedContainer.getResponsibleOperatorId()).ifPresent(operator ->
                    notificationService.sendDischargeConfirmationEmail(dischargedContainer, performer, operator.getEmail()));
        }

        ContainerDTO dto = containerMapper.toDto(container);
        shippingCompanyRepository.findById(container.getShippingCompanyId())
                .ifPresent(c -> dto.setShippingCompanyName(c.getName()));
        userRepository.findById(container.getResponsibleOperatorId())
                .ifPresent(u -> dto.setResponsibleOperatorName(u.getFullName()));
        dto.setPhotoCount((int) photoCount);
        return dto;
    }
}
