package com.containertrack.controller;

import com.containertrack.dto.request.CreateLandCarrierRequest;
import com.containertrack.dto.request.CreatePortRequest;
import com.containertrack.dto.request.CreateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateLandCarrierRequest;
import com.containertrack.dto.request.UpdatePortRequest;
import com.containertrack.dto.request.UpdateShippingCompanyRequest;
import com.containertrack.dto.request.UpdateStatusRequest;
import com.containertrack.dto.response.AdminDashboardSummaryDTO;
import com.containertrack.dto.response.LandCarrierDTO;
import com.containertrack.dto.response.PortDTO;
import com.containertrack.dto.response.ShippingCompanyDTO;
import com.containertrack.entity.Role;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.DashboardService;
import com.containertrack.service.LandCarrierService;
import com.containertrack.service.PortService;
import com.containertrack.service.ShippingCompanyService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * These four controllers are thin, uniformly-shaped CRUD wrappers over their
 * respective services (list/get/create/update/updateStatus) — unit-tested directly
 * (no Spring context, no MockMvc) by mocking the service layer and the
 * authenticated-principal argument Spring would normally resolve.
 */
@ExtendWith(MockitoExtension.class)
class SimpleCrudControllersTest {

    private UserPrincipal adminPrincipal() {
        UserPrincipal principal = mock(UserPrincipal.class);
        // lenient: not every test using this helper exercises both getters (e.g. create/update
        // only reads getId(), list() only reads getRole()) — strict stubs would flag the other.
        lenient().when(principal.getId()).thenReturn(1L);
        lenient().when(principal.getRole()).thenReturn(Role.ADMIN);
        return principal;
    }

    private UserPrincipal operatorPrincipal() {
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getRole()).thenReturn(Role.OPERATOR);
        return principal;
    }

    // --- DashboardController -------------------------------------------------

    @Mock
    private DashboardService dashboardService;

    @Test
    void dashboard_adminSummary_delegatesToService() {
        DashboardController controller = new DashboardController(dashboardService);
        AdminDashboardSummaryDTO summary = AdminDashboardSummaryDTO.builder().build();
        when(dashboardService.getAdminSummary()).thenReturn(summary);

        var response = controller.adminSummary();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(summary, response.getBody());
    }

    // --- PortController --------------------------------------------------------

    @Mock
    private PortService portService;

    @Test
    void ports_list_onlyHonorsIncludeInactiveForAdmin() {
        PortController controller = new PortController(portService);
        Page<PortDTO> page = new PageImpl<>(java.util.List.of());
        when(portService.list(anyBoolean(), any(Pageable.class))).thenReturn(page);

        controller.list(true, Pageable.unpaged(), operatorPrincipal());
        verify(portService).list(eq(false), any(Pageable.class)); // non-admin: forced false

        controller.list(true, Pageable.unpaged(), adminPrincipal());
        verify(portService).list(eq(true), any(Pageable.class)); // admin: honored
    }

    @Test
    void ports_get_delegatesToService() {
        PortController controller = new PortController(portService);
        PortDTO dto = PortDTO.builder().id(1L).name("Puerto Quetzal").build();
        when(portService.get(1L)).thenReturn(dto);

        assertEquals(dto, controller.get(1L).getBody());
    }

    @Test
    void ports_create_passesThePerformingUserId() {
        PortController controller = new PortController(portService);
        CreatePortRequest request = new CreatePortRequest();
        PortDTO dto = PortDTO.builder().id(1L).build();
        when(portService.create(request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.create(request, adminPrincipal()).getBody());
    }

    @Test
    void ports_update_delegatesToService() {
        PortController controller = new PortController(portService);
        UpdatePortRequest request = new UpdatePortRequest();
        PortDTO dto = PortDTO.builder().id(1L).build();
        when(portService.update(1L, request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.update(1L, request, adminPrincipal()).getBody());
    }

    @Test
    void ports_updateStatus_delegatesToService() {
        PortController controller = new PortController(portService);
        UpdateStatusRequest request = new UpdateStatusRequest();
        request.setIsActive(false);
        PortDTO dto = PortDTO.builder().id(1L).isActive(false).build();
        when(portService.updateStatus(1L, request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.updateStatus(1L, request, adminPrincipal()).getBody());
    }

    // --- LandCarrierController --------------------------------------------------

    @Mock
    private LandCarrierService landCarrierService;

    @Test
    void landCarriers_list_onlyHonorsIncludeInactiveForAdmin() {
        LandCarrierController controller = new LandCarrierController(landCarrierService);
        Page<LandCarrierDTO> page = new PageImpl<>(java.util.List.of());
        when(landCarrierService.list(anyBoolean(), any(Pageable.class))).thenReturn(page);

        controller.list(true, Pageable.unpaged(), operatorPrincipal());
        verify(landCarrierService).list(eq(false), any(Pageable.class));
    }

    @Test
    void landCarriers_get_delegatesToService() {
        LandCarrierController controller = new LandCarrierController(landCarrierService);
        LandCarrierDTO dto = LandCarrierDTO.builder().id(1L).name("Transportes X").build();
        when(landCarrierService.get(1L)).thenReturn(dto);

        assertEquals(dto, controller.get(1L).getBody());
    }

    @Test
    void landCarriers_create_passesThePerformingUserId() {
        LandCarrierController controller = new LandCarrierController(landCarrierService);
        CreateLandCarrierRequest request = new CreateLandCarrierRequest();
        LandCarrierDTO dto = LandCarrierDTO.builder().id(1L).build();
        when(landCarrierService.create(request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.create(request, adminPrincipal()).getBody());
    }

    @Test
    void landCarriers_update_delegatesToService() {
        LandCarrierController controller = new LandCarrierController(landCarrierService);
        UpdateLandCarrierRequest request = new UpdateLandCarrierRequest();
        LandCarrierDTO dto = LandCarrierDTO.builder().id(1L).build();
        when(landCarrierService.update(1L, request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.update(1L, request, adminPrincipal()).getBody());
    }

    @Test
    void landCarriers_updateStatus_delegatesToService() {
        LandCarrierController controller = new LandCarrierController(landCarrierService);
        UpdateStatusRequest request = new UpdateStatusRequest();
        request.setIsActive(false);
        LandCarrierDTO dto = LandCarrierDTO.builder().id(1L).isActive(false).build();
        when(landCarrierService.updateStatus(1L, request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.updateStatus(1L, request, adminPrincipal()).getBody());
    }

    // --- ShippingCompanyController ------------------------------------------------

    @Mock
    private ShippingCompanyService shippingCompanyService;

    @Test
    void shippingCompanies_list_onlyHonorsIncludeInactiveForAdmin() {
        ShippingCompanyController controller = new ShippingCompanyController(shippingCompanyService);
        Page<ShippingCompanyDTO> page = new PageImpl<>(java.util.List.of());
        when(shippingCompanyService.list(anyBoolean(), any(Pageable.class))).thenReturn(page);

        controller.list(true, Pageable.unpaged(), operatorPrincipal());
        verify(shippingCompanyService).list(eq(false), any(Pageable.class));
    }

    @Test
    void shippingCompanies_get_delegatesToService() {
        ShippingCompanyController controller = new ShippingCompanyController(shippingCompanyService);
        ShippingCompanyDTO dto = ShippingCompanyDTO.builder().id(1L).name("Maersk").build();
        when(shippingCompanyService.get(1L)).thenReturn(dto);

        assertEquals(dto, controller.get(1L).getBody());
    }

    @Test
    void shippingCompanies_create_passesThePerformingUserId() {
        ShippingCompanyController controller = new ShippingCompanyController(shippingCompanyService);
        CreateShippingCompanyRequest request = new CreateShippingCompanyRequest();
        ShippingCompanyDTO dto = ShippingCompanyDTO.builder().id(1L).build();
        when(shippingCompanyService.create(request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.create(request, adminPrincipal()).getBody());
    }

    @Test
    void shippingCompanies_update_delegatesToService() {
        ShippingCompanyController controller = new ShippingCompanyController(shippingCompanyService);
        UpdateShippingCompanyRequest request = new UpdateShippingCompanyRequest();
        ShippingCompanyDTO dto = ShippingCompanyDTO.builder().id(1L).build();
        when(shippingCompanyService.update(1L, request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.update(1L, request, adminPrincipal()).getBody());
    }

    @Test
    void shippingCompanies_updateStatus_delegatesToService() {
        ShippingCompanyController controller = new ShippingCompanyController(shippingCompanyService);
        UpdateStatusRequest request = new UpdateStatusRequest();
        request.setIsActive(false);
        ShippingCompanyDTO dto = ShippingCompanyDTO.builder().id(1L).isActive(false).build();
        when(shippingCompanyService.updateStatus(1L, request, 1L)).thenReturn(dto);

        assertEquals(dto, controller.updateStatus(1L, request, adminPrincipal()).getBody());
    }
}
