package com.containertrack.service;

import com.containertrack.dto.request.CreateLandCarrierRequest;
import com.containertrack.dto.request.UpdateLandCarrierRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.LandCarrierDTO;
import com.containertrack.entity.LandCarrier;
import com.containertrack.exception.ConflictException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.mapper.LandCarrierMapper;
import com.containertrack.repository.LandCarrierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class LandCarrierService {

    private final LandCarrierRepository landCarrierRepository;
    private final LandCarrierMapper landCarrierMapper;
    private final AuditService auditService;

    public Page<LandCarrierDTO> list(boolean includeInactive, Pageable pageable) {
        Page<LandCarrier> carriers = includeInactive
                ? landCarrierRepository.findAll(pageable)
                : landCarrierRepository.findByIsActiveTrue(pageable);
        return carriers.map(landCarrierMapper::toDto);
    }

    public LandCarrierDTO get(Long id) {
        return landCarrierMapper.toDto(findCarrier(id));
    }

    private LandCarrier findCarrier(Long id) {
        return landCarrierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Transportista terrestre no encontrado."));
    }

    @Transactional
    public LandCarrierDTO create(CreateLandCarrierRequest request, Long performedBy) {
        if (landCarrierRepository.existsByNameIgnoreCase(request.getName())) {
            throw new ConflictException("NAME_ALREADY_EXISTS", "Ya existe un transportista con ese nombre.");
        }
        LandCarrier carrier = LandCarrier.builder()
                .name(request.getName())
                .plateNumber(request.getPlateNumber())
                .phone(request.getPhone())
                .company(request.getCompany())
                .notes(request.getNotes())
                .isActive(true)
                .build();
        carrier = landCarrierRepository.save(carrier);
        auditService.logCreate("LAND_CARRIER", carrier.getId(), performedBy);
        return landCarrierMapper.toDto(carrier);
    }

    @Transactional
    public LandCarrierDTO update(Long id, UpdateLandCarrierRequest request, Long performedBy) {
        LandCarrier carrier = findCarrier(id);
        if (request.getName() != null && !Objects.equals(carrier.getName(), request.getName())) {
            auditService.logFieldChangeIfDiffers("LAND_CARRIER", id, "name", carrier.getName(), request.getName(), performedBy);
            carrier.setName(request.getName());
        }
        if (request.getPlateNumber() != null && !Objects.equals(carrier.getPlateNumber(), request.getPlateNumber())) {
            auditService.logFieldChangeIfDiffers("LAND_CARRIER", id, "plateNumber", carrier.getPlateNumber(), request.getPlateNumber(), performedBy);
            carrier.setPlateNumber(request.getPlateNumber());
        }
        if (request.getPhone() != null && !Objects.equals(carrier.getPhone(), request.getPhone())) {
            auditService.logFieldChangeIfDiffers("LAND_CARRIER", id, "phone", carrier.getPhone(), request.getPhone(), performedBy);
            carrier.setPhone(request.getPhone());
        }
        if (request.getCompany() != null && !Objects.equals(carrier.getCompany(), request.getCompany())) {
            auditService.logFieldChangeIfDiffers("LAND_CARRIER", id, "company", carrier.getCompany(), request.getCompany(), performedBy);
            carrier.setCompany(request.getCompany());
        }
        if (request.getNotes() != null && !Objects.equals(carrier.getNotes(), request.getNotes())) {
            auditService.logFieldChangeIfDiffers("LAND_CARRIER", id, "notes", carrier.getNotes(), request.getNotes(), performedBy);
            carrier.setNotes(request.getNotes());
        }
        carrier = landCarrierRepository.save(carrier);
        return landCarrierMapper.toDto(carrier);
    }

    @Transactional
    public LandCarrierDTO updateStatus(Long id, UpdateStatusRequest request, Long performedBy) {
        LandCarrier carrier = findCarrier(id);
        boolean oldStatus = carrier.getIsActive();
        carrier.setIsActive(request.getIsActive());
        carrier = landCarrierRepository.save(carrier);
        auditService.logFieldChangeIfDiffers("LAND_CARRIER", id, "isActive", oldStatus, request.getIsActive(), performedBy);
        return landCarrierMapper.toDto(carrier);
    }
}
