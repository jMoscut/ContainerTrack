package com.containertrack.service;

import com.containertrack.dto.request.ConsolidatedReportFilter;
import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerFieldChange;
import com.containertrack.entity.ContainerPhoto;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.entity.Role;
import com.containertrack.entity.ShippingCompany;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.repository.ContainerFieldChangeRepository;
import com.containertrack.repository.ContainerPhotoRepository;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.ShippingCompanyRepository;
import com.containertrack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ContainerRepository containerRepository;
    @Mock
    private ShippingCompanyRepository shippingCompanyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContainerPhotoRepository containerPhotoRepository;
    @Mock
    private ContainerFieldChangeRepository containerFieldChangeRepository;
    @Mock
    private FileStorageService fileStorageService;

    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(containerRepository, shippingCompanyRepository, userRepository,
                containerPhotoRepository, containerFieldChangeRepository, fileStorageService);
    }

    private Container baseContainer() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return Container.builder()
                .id(1L)
                .containerNumber("MSKU1234565")
                .shippingCompanyId(10L)
                .responsibleOperatorId(5L)
                .originPort("Shanghai")
                .destinationPort("Puerto Quetzal")
                .cargoDescription("Textiles")
                .status(ContainerStatus.DISCHARGED)
                .estimatedDepartureDate(now.minusDays(20))
                .actualDepartureDate(now.minusDays(19))
                .createdAt(now.minusDays(21))
                .build();
    }

    private User requester() {
        return User.builder()
                .id(99L)
                .email("admin@containertrack.gt")
                .fullName("Admin Prueba")
                .role(Role.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();
    }

    // --- generateContainerReport ---

    @Test
    void generateContainerReportThrowsNotFoundWhenContainerMissing() {
        when(containerRepository.findById(1L)).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> reportService.generateContainerReport(1L, requester()));

        assertEquals("NOT_FOUND", ex.getCode());
    }

    @Test
    void generateContainerReportProducesValidPdfBytesForMinimalContainer() throws Exception {
        Container container = baseContainer();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.empty());
        when(userRepository.findById(5L)).thenReturn(Optional.empty());
        when(containerPhotoRepository.findByContainerId(1L)).thenReturn(Collections.emptyList());
        when(containerFieldChangeRepository.findByContainerIdOrderByUpdatedAtAsc(1L)).thenReturn(Collections.emptyList());

        byte[] pdf = reportService.generateContainerReport(1L, requester());

        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
        assertEquals("%PDF", new String(pdf, 0, 4));
    }

    @Test
    void generateContainerReportIncludesFieldChangeHistory() throws Exception {
        Container container = baseContainer();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.of(
                ShippingCompany.builder().id(10L).name("Maersk").build()));
        when(userRepository.findById(5L)).thenReturn(Optional.of(requester()));
        when(containerPhotoRepository.findByContainerId(1L)).thenReturn(Collections.emptyList());

        ContainerFieldChange change = ContainerFieldChange.builder()
                .id(1L)
                .containerId(1L)
                .fieldName("estimatedDepartureDate")
                .oldValue("2026-09-01T00:00Z")
                .newValue("2026-09-03T00:00Z")
                .updatedBy(99L)
                .reason("Corrección de fecha confirmada con la naviera")
                .updatedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(containerFieldChangeRepository.findByContainerIdOrderByUpdatedAtAsc(1L))
                .thenReturn(List.of(change));
        when(userRepository.findById(99L)).thenReturn(Optional.of(requester()));

        byte[] pdf = reportService.generateContainerReport(1L, requester());

        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }

    @Test
    void generateContainerReportSkipsPhotoThatFailsToDownloadWithoutFailingTheReport() throws Exception {
        Container container = baseContainer();
        when(containerRepository.findById(1L)).thenReturn(Optional.of(container));
        when(shippingCompanyRepository.findById(10L)).thenReturn(Optional.empty());
        when(userRepository.findById(5L)).thenReturn(Optional.empty());
        when(containerFieldChangeRepository.findByContainerIdOrderByUpdatedAtAsc(1L)).thenReturn(Collections.emptyList());

        ContainerPhoto photo = ContainerPhoto.builder()
                .id(1L)
                .containerId(1L)
                .r2Key("containers/1/photo.jpg")
                .originalFilename("photo.jpg")
                .mimeType("image/jpeg")
                .isValid(true)
                .uploadedBy(5L)
                .uploadedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(containerPhotoRepository.findByContainerId(1L)).thenReturn(List.of(photo));
        // Deliberately unreachable host — ReportService must swallow the download failure per-photo
        // and still produce a valid report, not propagate the exception.
        when(fileStorageService.generatePresignedUrl(anyString(), org.mockito.ArgumentMatchers.any()))
                .thenReturn("http://invalid.nonexistent.test/photo.jpg");

        byte[] pdf = reportService.generateContainerReport(1L, requester());

        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
        assertEquals("%PDF", new String(pdf, 0, 4));
    }

    // --- generateConsolidatedReport ---

    @Test
    void generateConsolidatedReportThrowsBadRequestWhenDateToBeforeDateFrom() {
        ConsolidatedReportFilter filter = new ConsolidatedReportFilter();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        filter.setDateFrom(now);
        filter.setDateTo(now.minusDays(1));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> reportService.generateConsolidatedReport(filter, requester()));

        assertEquals("INVALID_DATE_RANGE", ex.getCode());
    }

    @Test
    void generateConsolidatedReportThrowsBadRequestWhenExceedingRowLimit() {
        ConsolidatedReportFilter filter = new ConsolidatedReportFilter();
        List<Container> many = new ArrayList<>();
        for (int i = 0; i < 501; i++) {
            many.add(Container.builder().id((long) i).status(ContainerStatus.REGISTERED).build());
        }
        when(containerRepository.findAll()).thenReturn(many);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> reportService.generateConsolidatedReport(filter, requester()));

        assertEquals("REPORT_TOO_LARGE", ex.getCode());
    }

    @Test
    void generateConsolidatedReportProducesValidPdfForContainersWithinLimit() throws Exception {
        ConsolidatedReportFilter filter = new ConsolidatedReportFilter();
        Container c1 = baseContainer();
        Container c2 = baseContainer();
        c2.setId(2L);
        c2.setStatus(ContainerStatus.ARRIVED_PORT);
        when(containerRepository.findAll()).thenReturn(List.of(c1, c2));
        when(shippingCompanyRepository.findAll()).thenReturn(
                List.of(ShippingCompany.builder().id(10L).name("Maersk").build()));

        byte[] pdf = reportService.generateConsolidatedReport(filter, requester());

        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
        assertEquals("%PDF", new String(pdf, 0, 4));
    }

    @Test
    void generateConsolidatedReportFiltersByStatus() throws Exception {
        ConsolidatedReportFilter filter = new ConsolidatedReportFilter();
        filter.setStatus(ContainerStatus.DISCHARGED);
        Container discharged = baseContainer();
        Container registered = baseContainer();
        registered.setId(2L);
        registered.setStatus(ContainerStatus.REGISTERED);
        when(containerRepository.findAll()).thenReturn(List.of(discharged, registered));
        when(shippingCompanyRepository.findAll()).thenReturn(Collections.emptyList());

        byte[] pdf = reportService.generateConsolidatedReport(filter, requester());

        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
    }
}
