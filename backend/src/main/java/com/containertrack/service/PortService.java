package com.containertrack.service;

import com.containertrack.dto.request.CreatePortRequest;
import com.containertrack.dto.request.UpdatePortRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.PortDTO;
import com.containertrack.entity.Port;
import com.containertrack.exception.ConflictException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.mapper.PortMapper;
import com.containertrack.repository.PortRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PortService {

    private final PortRepository portRepository;
    private final PortMapper portMapper;
    private final AuditService auditService;

    public Page<PortDTO> list(boolean includeInactive, Pageable pageable) {
        Page<Port> ports = includeInactive
                ? portRepository.findAll(pageable)
                : portRepository.findByIsActiveTrue(pageable);
        return ports.map(portMapper::toDto);
    }

    public PortDTO get(Long id) {
        return portMapper.toDto(findPort(id));
    }

    private Port findPort(Long id) {
        return portRepository.findById(id).orElseThrow(() -> new NotFoundException("Puerto no encontrado."));
    }

    @Transactional
    public PortDTO create(CreatePortRequest request, Long performedBy) {
        if (portRepository.existsByNameIgnoreCase(request.getName())) {
            throw new ConflictException("NAME_ALREADY_EXISTS", "Ya existe un puerto con ese nombre.");
        }
        Port port = Port.builder()
                .name(request.getName())
                .country(request.getCountry())
                .isGuatemalan(Boolean.TRUE.equals(request.getIsGuatemalan()))
                .isActive(true)
                .build();
        port = portRepository.save(port);
        auditService.logCreate("PORT", port.getId(), performedBy);
        return portMapper.toDto(port);
    }

    @Transactional
    public PortDTO update(Long id, UpdatePortRequest request, Long performedBy) {
        Port port = findPort(id);

        if (request.getName() != null && !Objects.equals(port.getName(), request.getName())) {
            auditService.logFieldChangeIfDiffers("PORT", id, "name", port.getName(), request.getName(), performedBy);
            port.setName(request.getName());
        }
        if (request.getCountry() != null && !Objects.equals(port.getCountry(), request.getCountry())) {
            auditService.logFieldChangeIfDiffers("PORT", id, "country", port.getCountry(), request.getCountry(), performedBy);
            port.setCountry(request.getCountry());
        }
        if (request.getIsGuatemalan() != null && !Objects.equals(port.getIsGuatemalan(), request.getIsGuatemalan())) {
            auditService.logFieldChangeIfDiffers("PORT", id, "isGuatemalan", port.getIsGuatemalan(), request.getIsGuatemalan(), performedBy);
            port.setIsGuatemalan(request.getIsGuatemalan());
        }

        port = portRepository.save(port);
        return portMapper.toDto(port);
    }

    @Transactional
    public PortDTO updateStatus(Long id, UpdateStatusRequest request, Long performedBy) {
        Port port = findPort(id);
        boolean oldStatus = port.getIsActive();
        port.setIsActive(request.getIsActive());
        port = portRepository.save(port);
        auditService.logFieldChangeIfDiffers("PORT", id, "isActive", oldStatus, request.getIsActive(), performedBy);
        return portMapper.toDto(port);
    }
}
