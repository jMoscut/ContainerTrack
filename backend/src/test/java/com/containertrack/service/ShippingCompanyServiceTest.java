package com.containertrack.service;

import com.containertrack.dto.request.CreateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.ShippingCompanyDTO;
import com.containertrack.entity.ShippingCompany;
import com.containertrack.exception.ConflictException;
import com.containertrack.mapper.ShippingCompanyMapper;
import com.containertrack.repository.ShippingCompanyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShippingCompanyServiceTest {

    @Mock
    private ShippingCompanyRepository shippingCompanyRepository;
    @Mock
    private ShippingCompanyMapper shippingCompanyMapper;
    @Mock
    private AuditService auditService;

    private ShippingCompanyService shippingCompanyService;

    @BeforeEach
    void setUp() {
        shippingCompanyService = new ShippingCompanyService(shippingCompanyRepository, shippingCompanyMapper, auditService);
        lenient().when(shippingCompanyMapper.toDto(any(ShippingCompany.class))).thenAnswer(inv -> {
            ShippingCompany c = inv.getArgument(0);
            return ShippingCompanyDTO.builder().id(c.getId()).name(c.getName()).shortCode(c.getShortCode())
                    .isActive(c.getIsActive()).build();
        });
        lenient().when(shippingCompanyRepository.save(any(ShippingCompany.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private CreateShippingCompanyRequest createRequest() {
        CreateShippingCompanyRequest request = new CreateShippingCompanyRequest();
        request.setName("Maersk");
        request.setShortCode("MSK");
        return request;
    }

    @Test
    void creatingCompanyWithDuplicateNameThrowsConflict() {
        when(shippingCompanyRepository.existsByNameIgnoreCase("Maersk")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> shippingCompanyService.create(createRequest(), 1L));

        assertEquals("NAME_ALREADY_EXISTS", ex.getCode());
        verify(shippingCompanyRepository, never()).save(any());
    }

    @Test
    void creatingCompanyWithDuplicateShortCodeThrowsConflict() {
        when(shippingCompanyRepository.existsByNameIgnoreCase("Maersk")).thenReturn(false);
        when(shippingCompanyRepository.existsByShortCodeIgnoreCase("MSK")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class,
                () -> shippingCompanyService.create(createRequest(), 1L));

        assertEquals("SHORT_CODE_ALREADY_EXISTS", ex.getCode());
        verify(shippingCompanyRepository, never()).save(any());
    }

    @Test
    void updatingFieldsWritesAuditEntriesAndDoesNotThrow() {
        ShippingCompany company = ShippingCompany.builder()
                .id(10L).name("Maersk").shortCode("MSK").country("DK").isActive(true).freeDaysLimit(10).build();
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.of(company));

        UpdateShippingCompanyRequest request = new UpdateShippingCompanyRequest();
        request.setCountry("Denmark");

        ShippingCompanyDTO dto = shippingCompanyService.update(10L, request, 1L);

        assertEquals(10L, dto.getId());
        verify(auditService).logFieldChangeIfDiffers("SHIPPING_COMPANY", 10L, "country", "DK", "Denmark", 1L);
    }

    @Test
    void deactivatingCompanySetsIsActiveFalseAndLogsAudit() {
        ShippingCompany company = ShippingCompany.builder()
                .id(10L).name("Maersk").shortCode("MSK").isActive(true).freeDaysLimit(10).build();
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.of(company));

        UpdateStatusRequest request = new UpdateStatusRequest();
        request.setIsActive(false);

        ShippingCompanyDTO dto = shippingCompanyService.updateStatus(10L, request, 1L);

        assertFalse(dto.getIsActive());
        verify(auditService).logFieldChangeIfDiffers("SHIPPING_COMPANY", 10L, "isActive", true, false, 1L);
    }
}
