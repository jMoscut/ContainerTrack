package com.containertrack.controller;

import com.containertrack.dto.request.AssignWarehouseRequest;
import com.containertrack.dto.request.CreateContainerRequest;
import com.containertrack.dto.request.TransitionRequest;
import com.containertrack.dto.request.UpdateContainerRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.dto.response.FieldChangeDTO;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.entity.Role;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ContainerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContainerControllerTest {

    @Mock
    private ContainerService containerService;

    private UserPrincipal principal() {
        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(9L);
        lenient().when(principal.getRole()).thenReturn(Role.OPERATOR);
        return principal;
    }

    @Test
    void list_passesFiltersAndThePrincipalRoleThrough() {
        ContainerController controller = new ContainerController(containerService);
        Page<ContainerDTO> page = new PageImpl<>(java.util.List.of());
        when(containerService.list(eq(ContainerStatus.REGISTERED), isNull(), isNull(), isNull(), isNull(),
                eq(Role.OPERATOR), any(Pageable.class)))
                .thenReturn(page);

        var response = controller.list(ContainerStatus.REGISTERED, null, null, null, null,
                Pageable.unpaged(), principal());

        assertEquals(page, response.getBody());
    }

    @Test
    void get_delegatesToService() {
        ContainerController controller = new ContainerController(containerService);
        ContainerDTO dto = ContainerDTO.builder().id(1L).build();
        when(containerService.get(1L)).thenReturn(dto);

        assertEquals(dto, controller.get(1L).getBody());
    }

    @Test
    void create_passesThePerformingUserId() {
        ContainerController controller = new ContainerController(containerService);
        CreateContainerRequest request = new CreateContainerRequest();
        ContainerDTO dto = ContainerDTO.builder().id(1L).build();
        when(containerService.create(request, 9L)).thenReturn(dto);

        assertEquals(dto, controller.create(request, principal()).getBody());
    }

    @Test
    void update_passesTheUserIdAndRole() {
        ContainerController controller = new ContainerController(containerService);
        UpdateContainerRequest request = new UpdateContainerRequest();
        ContainerDTO dto = ContainerDTO.builder().id(1L).build();
        when(containerService.update(1L, request, 9L, Role.OPERATOR)).thenReturn(dto);

        assertEquals(dto, controller.update(1L, request, principal()).getBody());
    }

    @Test
    void assignWarehouse_passesTheWarehouseAssigneeIdUserIdAndRole() {
        ContainerController controller = new ContainerController(containerService);
        AssignWarehouseRequest request = new AssignWarehouseRequest();
        request.setWarehouseAssigneeId(7L);
        ContainerDTO dto = ContainerDTO.builder().id(1L).warehouseAssigneeId(7L).build();
        when(containerService.assignWarehouse(1L, 7L, 9L, Role.OPERATOR)).thenReturn(dto);

        assertEquals(dto, controller.assignWarehouse(1L, request, principal()).getBody());
    }

    @Test
    void transition_passesTheUserIdAndRole() {
        ContainerController controller = new ContainerController(containerService);
        TransitionRequest request = new TransitionRequest();
        request.setTargetStatus(ContainerStatus.DEPARTED_ORIGIN);
        ContainerDTO dto = ContainerDTO.builder().id(1L).status("DEPARTED_ORIGIN").build();
        when(containerService.transition(1L, request, 9L, Role.OPERATOR)).thenReturn(dto);

        assertEquals(dto, controller.transition(1L, request, principal()).getBody());
    }

    @Test
    void history_delegatesToService() {
        ContainerController controller = new ContainerController(containerService);
        var history = java.util.List.<FieldChangeDTO>of();
        when(containerService.history(1L)).thenReturn(history);

        assertEquals(history, controller.history(1L).getBody());
    }

    @Test
    void delete_delegatesToServiceAndReturnsNoContent() {
        ContainerController controller = new ContainerController(containerService);

        var response = controller.delete(1L, principal());

        verify(containerService).delete(1L, 9L);
        assertEquals(204, response.getStatusCode().value());
    }
}
