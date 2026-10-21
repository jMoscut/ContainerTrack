package com.containertrack.controller;

import com.containertrack.dto.request.DischargeRequest;
import com.containertrack.dto.request.InvalidatePhotoRequest;
import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.dto.response.PhotoDTO;
import com.containertrack.dto.response.PhotoUploadResultDTO;
import com.containertrack.entity.Role;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ContainerPhotoService;
import com.containertrack.service.DischargeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContainerPhotoControllerTest {

    @Mock
    private ContainerPhotoService containerPhotoService;
    @Mock
    private DischargeService dischargeService;

    private UserPrincipal principal() {
        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(9L);
        lenient().when(principal.getRole()).thenReturn(Role.WAREHOUSE);
        return principal;
    }

    @Test
    void uploadPhotos_delegatesTheFilesAndUserId() {
        ContainerPhotoController controller = new ContainerPhotoController(containerPhotoService, dischargeService);
        var file = new MockMultipartFile("files", "evidencia.png", "image/png", new byte[] {1, 2, 3});
        var files = java.util.List.<org.springframework.web.multipart.MultipartFile>of(file);
        PhotoUploadResultDTO result = PhotoUploadResultDTO.builder().build();
        when(containerPhotoService.uploadPhotos(1L, files, 9L)).thenReturn(result);

        assertEquals(result, controller.uploadPhotos(1L, files, principal()).getBody());
    }

    @Test
    void listPhotos_delegatesToService() {
        ContainerPhotoController controller = new ContainerPhotoController(containerPhotoService, dischargeService);
        var photos = java.util.List.<PhotoDTO>of();
        when(containerPhotoService.listPhotos(1L)).thenReturn(photos);

        assertEquals(photos, controller.listPhotos(1L).getBody());
    }

    @Test
    void removePhoto_passesTheReasonUserIdAndRole() {
        ContainerPhotoController controller = new ContainerPhotoController(containerPhotoService, dischargeService);
        InvalidatePhotoRequest request = new InvalidatePhotoRequest();
        request.setInvalidationReason("blurry");

        var response = controller.removePhoto(1L, 2L, request, principal());

        verify(containerPhotoService).removePhoto(1L, 2L, "blurry", 9L, Role.WAREHOUSE);
        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void discharge_delegatesToServiceWithThePerformingUserId() {
        ContainerPhotoController controller = new ContainerPhotoController(containerPhotoService, dischargeService);
        DischargeRequest request = new DischargeRequest();
        ContainerDTO dto = ContainerDTO.builder().id(1L).status("DISCHARGED").build();
        when(dischargeService.discharge(1L, request, 9L)).thenReturn(dto);

        assertEquals(dto, controller.discharge(1L, request, principal()).getBody());
    }
}
