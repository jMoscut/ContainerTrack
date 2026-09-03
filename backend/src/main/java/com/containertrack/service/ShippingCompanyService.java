package com.containertrack.service;

import com.containertrack.dto.request.CreateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.ShippingCompanyDTO;
import com.containertrack.entity.ShippingCompany;
import com.containertrack.exception.ConflictException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.mapper.ShippingCompanyMapper;
import com.containertrack.repository.ShippingCompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ShippingCompanyService {

    private final ShippingCompanyRepository shippingCompanyRepository;
    private final ShippingCompanyMapper shippingCompanyMapper;
    private final AuditService auditService;

    public Page<ShippingCompanyDTO> list(boolean includeInactive, Pageable pageable) {
        Page<ShippingCompany> companies = includeInactive
                ? shippingCompanyRepository.findAll(pageable)
                : shippingCompanyRepository.findByIsActiveTrue(pageable);
        return companies.map(shippingCompanyMapper::toDto);
    }

    public ShippingCompanyDTO get(Long id) {
        return shippingCompanyMapper.toDto(findCompany(id));
    }

    private ShippingCompany findCompany(Long id) {
        return shippingCompanyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Naviera no encontrada."));
    }

    @Transactional
    public ShippingCompanyDTO create(CreateShippingCompanyRequest request, Long performedBy) {
        if (shippingCompanyRepository.existsByNameIgnoreCase(request.getName())) {
            throw new ConflictException("NAME_ALREADY_EXISTS", "Ya existe una naviera con ese nombre.");
        }
        if (shippingCompanyRepository.existsByShortCodeIgnoreCase(request.getShortCode())) {
            throw new ConflictException("SHORT_CODE_ALREADY_EXISTS", "Ya existe una naviera con ese código.");
        }

        ShippingCompany company = ShippingCompany.builder()
                .name(request.getName())
                .shortCode(request.getShortCode())
                .country(request.getCountry())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .notes(request.getNotes())
                .freeDaysLimit(request.getFreeDaysLimit() != null ? request.getFreeDaysLimit() : 10)
                .isActive(true)
                .build();
        company = shippingCompanyRepository.save(company);

        auditService.logCreate("SHIPPING_COMPANY", company.getId(), performedBy);
        return shippingCompanyMapper.toDto(company);
    }

    @Transactional
    public ShippingCompanyDTO update(Long id, UpdateShippingCompanyRequest request, Long performedBy) {
        ShippingCompany company = findCompany(id);

        updateFieldIfChanged(id, "country", company.getCountry(), request.getCountry(), performedBy, company::setCountry);
        updateFieldIfChanged(id, "contactEmail", company.getContactEmail(), request.getContactEmail(), performedBy, company::setContactEmail);
        updateFieldIfChanged(id, "contactPhone", company.getContactPhone(), request.getContactPhone(), performedBy, company::setContactPhone);
        updateFieldIfChanged(id, "notes", company.getNotes(), request.getNotes(), performedBy, company::setNotes);
        if (request.getName() != null) {
            updateFieldIfChanged(id, "name", company.getName(), request.getName(), performedBy, company::setName);
        }
        if (request.getFreeDaysLimit() != null && !Objects.equals(request.getFreeDaysLimit(), company.getFreeDaysLimit())) {
            auditService.logFieldChangeIfDiffers("SHIPPING_COMPANY", id, "freeDaysLimit", company.getFreeDaysLimit(), request.getFreeDaysLimit(), performedBy);
            company.setFreeDaysLimit(request.getFreeDaysLimit());
        }

        company = shippingCompanyRepository.save(company);
        return shippingCompanyMapper.toDto(company);
    }

    private void updateFieldIfChanged(Long id, String field, String oldVal, String newVal, Long performedBy, java.util.function.Consumer<String> setter) {
        if (newVal != null && !Objects.equals(oldVal, newVal)) {
            auditService.logFieldChangeIfDiffers("SHIPPING_COMPANY", id, field, oldVal, newVal, performedBy);
            setter.accept(newVal);
        }
    }

    @Transactional
    public ShippingCompanyDTO updateStatus(Long id, UpdateStatusRequest request, Long performedBy) {
        ShippingCompany company = findCompany(id);
        boolean oldStatus = company.getIsActive();
        company.setIsActive(request.getIsActive());
        company = shippingCompanyRepository.save(company);
        auditService.logFieldChangeIfDiffers("SHIPPING_COMPANY", id, "isActive", oldStatus, request.getIsActive(), performedBy);
        return shippingCompanyMapper.toDto(company);
    }
}
