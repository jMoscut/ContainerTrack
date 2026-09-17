package com.containertrack.controller;

import com.containertrack.dto.request.ConsolidatedReportFilter;
import com.containertrack.exception.NotFoundException;
import com.containertrack.repository.ContainerRepository;
import com.containertrack.repository.UserRepository;
import com.containertrack.security.UserPrincipal;
import com.containertrack.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ContainerRepository containerRepository;
    private final UserRepository userRepository;

    // Every role can download a single container's own PDF from its detail page
    // (WAREHOUSE now sees every container in full). The consolidated/aggregate
    // report below stays ADMIN/OPERATOR-only — that's the "Reportes" page WAREHOUSE
    // doesn't get a nav link to.
    @GetMapping("/container/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> containerReport(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal)
            throws java.io.IOException {
        var container = containerRepository.findById(id).orElseThrow(() -> new NotFoundException("Contenedor no encontrado."));
        var requestedBy = userRepository.findById(principal.getId()).orElse(null);
        byte[] pdf = reportService.generateContainerReport(id, requestedBy);

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("container-" + container.getContainerNumber() + ".pdf")
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(disposition);
        headers.setContentType(MediaType.APPLICATION_PDF);

        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @PostMapping("/consolidated")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<byte[]> consolidatedReport(@RequestBody ConsolidatedReportFilter filter,
                                                        @AuthenticationPrincipal UserPrincipal principal)
            throws java.io.IOException {
        var requestedBy = userRepository.findById(principal.getId()).orElse(null);
        byte[] pdf = reportService.generateConsolidatedReport(filter, requestedBy);

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("consolidated-report.pdf")
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(disposition);
        headers.setContentType(MediaType.APPLICATION_PDF);

        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
