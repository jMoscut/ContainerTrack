package com.containertrack.controller;

import com.containertrack.dto.request.ConsolidatedReportFilter;
import com.containertrack.entity.Container;
import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.exception.NotFoundException;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.UserRepository;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ReportService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportControllerTest {

    @Mock
    private ReportService reportService;
    @Mock
    private ContainerRepository containerRepository;
    @Mock
    private UserRepository userRepository;

    private UserPrincipal principal() {
        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(9L);
        return principal;
    }

    @Test
    void containerReport_returnsThePdfBytesWithAFilenameBasedOnTheContainerNumber() throws Exception {
        ReportController controller = new ReportController(reportService, containerRepository, userRepository);
        Container container = Container.builder().id(1L).containerNumber("CSQU3054383").build();
        User requester = User.builder().id(9L).role(Role.ADMIN).build();
        byte[] pdf = {1, 2, 3};
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(userRepository.findById(9L)).thenReturn(Optional.of(requester));
        when(reportService.generateContainerReport(1L, requester)).thenReturn(pdf);

        var response = controller.containerReport(1L, principal());

        assertArrayEquals(pdf, response.getBody());
        org.junit.jupiter.api.Assertions.assertTrue(
                response.getHeaders().getContentDisposition().getFilename().contains("CSQU3054383"));
    }

    @Test
    void containerReport_throwsNotFoundForAMissingContainer() {
        ReportController controller = new ReportController(reportService, containerRepository, userRepository);
        when(containerRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> controller.containerReport(404L, principal()));
    }

    @Test
    void consolidatedReport_returnsThePdfBytes() throws Exception {
        ReportController controller = new ReportController(reportService, containerRepository, userRepository);
        User requester = User.builder().id(9L).role(Role.ADMIN).build();
        ConsolidatedReportFilter filter = new ConsolidatedReportFilter();
        byte[] pdf = {4, 5, 6};
        when(userRepository.findById(9L)).thenReturn(Optional.of(requester));
        when(reportService.generateConsolidatedReport(filter, requester)).thenReturn(pdf);

        var response = controller.consolidatedReport(filter, principal());

        assertArrayEquals(pdf, response.getBody());
    }
}
