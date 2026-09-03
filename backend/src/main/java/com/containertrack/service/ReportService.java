package com.containertrack.service;

import com.containertrack.dto.request.ConsolidatedReportFilter;
import com.containertrack.entity.*;
import com.containertrack.exception.BadRequestException;
import com.containertrack.exception.NotFoundException;
import com.containertrack.repository.*;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URL;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private static final DeviceRgb HEADER_COLOR = new DeviceRgb(0, 79, 46); // #004F2E
    private static final DeviceRgb DELAY_COLOR = new DeviceRgb(250, 219, 213); // #FADBD8
    private static final int MAX_CONSOLIDATED_ROWS = 500;

    private final ContainerRepository containerRepository;
    private final ShippingCompanyRepository shippingCompanyRepository;
    private final UserRepository userRepository;
    private final ContainerPhotoRepository containerPhotoRepository;
    private final ContainerFieldChangeRepository containerFieldChangeRepository;
    private final FileStorageService fileStorageService;

    public byte[] generateContainerReport(Long containerId, User requestedBy) throws IOException {
        Container container = containerRepository.findById(containerId)
                .orElseThrow(() -> new NotFoundException("Contenedor no encontrado."));
        ShippingCompany company = shippingCompanyRepository.findById(container.getShippingCompanyId()).orElse(null);
        User operator = userRepository.findById(container.getResponsibleOperatorId()).orElse(null);
        List<ContainerPhoto> photos = containerPhotoRepository.findByContainerId(containerId);
        List<ContainerFieldChange> changes = containerFieldChangeRepository.findByContainerIdOrderByUpdatedAtAsc(containerId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdfDoc = new PdfDocument(writer);
             Document document = new Document(pdfDoc, PageSize.A4)) {

            addHeader(document, "Reporte de Contenedor");

            Table info = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            addRow(info, "Número de contenedor", container.getContainerNumber());
            addRow(info, "Naviera", company != null ? company.getName() : "-");
            addRow(info, "Estado", container.getStatus().name());
            addRow(info, "Operador responsable", operator != null ? operator.getFullName() : "-");
            addRow(info, "Puerto de origen", container.getOriginPort());
            addRow(info, "Puerto de destino", container.getDestinationPort());
            addRow(info, "Descripción de carga", container.getCargoDescription() != null ? container.getCargoDescription() : "-");
            document.add(info);

            document.add(new Paragraph("Cronograma").setBold().setFontSize(14).setMarginTop(16));
            Table timeline = new Table(UnitValue.createPercentArray(new float[]{2, 2, 2, 1})).useAllAvailableWidth();
            timeline.addHeaderCell(cell("Etapa", true));
            timeline.addHeaderCell(cell("Fecha Estimada", true));
            timeline.addHeaderCell(cell("Fecha Real", true));
            timeline.addHeaderCell(cell("Diferencia (días)", true));

            addTimelineRow(timeline, "Salida de origen", container.getEstimatedDepartureDate(), container.getActualDepartureDate(), container.getDelayFlag());
            addTimelineRow(timeline, "Arribo a puerto", container.getEstimatedArrivalPort(), container.getActualArrivalPort(), container.getDelayFlag());
            addTimelineRow(timeline, "Salida de puerto", container.getEstimatedDeparturePort(), container.getActualDeparturePort(), false);
            addTimelineRow(timeline, "Arribo a bodega", container.getEstimatedArrivalWarehouse(), container.getActualArrivalWarehouse(), false);
            document.add(timeline);

            if (!photos.isEmpty()) {
                document.add(new Paragraph("Fotografías").setBold().setFontSize(14).setMarginTop(16));
                Table photoGrid = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
                for (ContainerPhoto photo : photos) {
                    try {
                        String url = fileStorageService.generatePresignedUrl(photo.getR2Key(), Duration.ofMinutes(15));
                        byte[] imgBytes = downloadBytes(url);
                        Image image = new Image(ImageDataFactory.create(imgBytes)).setAutoScale(true);
                        Cell cell = new Cell().add(image)
                                .add(new Paragraph("Subida: " + photo.getUploadedAt()).setFontSize(8));
                        photoGrid.addCell(cell);
                    } catch (Exception e) {
                        log.warn("Skipping photo {} in report (could not download): {}", photo.getId(), e.getMessage());
                    }
                }
                document.add(photoGrid);
            }

            if (!changes.isEmpty()) {
                document.add(new Paragraph("Historial de ediciones").setBold().setFontSize(14).setMarginTop(16));
                Table history = new Table(UnitValue.createPercentArray(new float[]{2, 2, 2, 2, 2})).useAllAvailableWidth();
                history.addHeaderCell(cell("Fecha", true));
                history.addHeaderCell(cell("Campo", true));
                history.addHeaderCell(cell("Valor Anterior", true));
                history.addHeaderCell(cell("Valor Nuevo", true));
                history.addHeaderCell(cell("Usuario", true));
                for (ContainerFieldChange change : changes) {
                    history.addCell(cell(String.valueOf(change.getUpdatedAt()), false));
                    history.addCell(cell(change.getFieldName(), false));
                    history.addCell(cell(change.getOldValue() != null ? change.getOldValue() : "-", false));
                    history.addCell(cell(change.getNewValue() != null ? change.getNewValue() : "-", false));
                    String userName = userRepository.findById(change.getUpdatedBy()).map(User::getFullName).orElse("-");
                    history.addCell(cell(userName, false));
                }
                document.add(history);
            }

            addFooter(document, requestedBy);
        }

        return baos.toByteArray();
    }

    public byte[] generateConsolidatedReport(ConsolidatedReportFilter filter, User requestedBy) throws IOException {
        List<Container> containers = containerRepository.findAll().stream()
                .filter(c -> filter.getStatus() == null || c.getStatus() == filter.getStatus())
                .filter(c -> filter.getShippingCompanyId() == null || filter.getShippingCompanyId().equals(c.getShippingCompanyId()))
                .filter(c -> filter.getDateFrom() == null || !c.getCreatedAt().isBefore(filter.getDateFrom()))
                .filter(c -> filter.getDateTo() == null || !c.getCreatedAt().isAfter(filter.getDateTo()))
                .collect(Collectors.toList());

        if (containers.size() > MAX_CONSOLIDATED_ROWS) {
            throw new BadRequestException("REPORT_TOO_LARGE",
                    "El reporte excede " + MAX_CONSOLIDATED_ROWS + " registros. Reduzca el rango de fechas o aplique más filtros.");
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdfDoc = new PdfDocument(writer);
             Document document = new Document(pdfDoc, PageSize.A4.rotate())) {

            addHeader(document, "Reporte Consolidado de Contenedores");

            Table table = new Table(UnitValue.createPercentArray(new float[]{2, 2, 2, 2, 2, 2})).useAllAvailableWidth();
            table.addHeaderCell(cell("N°", true));
            table.addHeaderCell(cell("Naviera", true));
            table.addHeaderCell(cell("Estado", true));
            table.addHeaderCell(cell("Fecha Registro", true));
            table.addHeaderCell(cell("Fecha Descarga", true));
            table.addHeaderCell(cell("Días en tránsito", true));

            Map<Long, String> companyNames = shippingCompanyRepository.findAll().stream()
                    .collect(Collectors.toMap(ShippingCompany::getId, ShippingCompany::getName));

            for (Container c : containers) {
                table.addCell(cell(c.getContainerNumber(), false));
                table.addCell(cell(companyNames.getOrDefault(c.getShippingCompanyId(), "-"), false));
                table.addCell(cell(c.getStatus().name(), false));
                table.addCell(cell(String.valueOf(c.getCreatedAt()), false));
                table.addCell(cell(c.getDischargeEndAt() != null ? String.valueOf(c.getDischargeEndAt()) : "-", false));
                long days = daysInTransit(c);
                table.addCell(cell(String.valueOf(days), false));
            }
            document.add(table);

            document.add(new Paragraph("Resumen").setBold().setFontSize(14).setMarginTop(16));
            int total = containers.size();
            double avgDays = containers.stream().mapToLong(this::daysInTransit).average().orElse(0);
            long delayed = containers.stream().filter(c -> Boolean.TRUE.equals(c.getDelayFlag())).count();
            double pctDelayed = total == 0 ? 0 : (delayed * 100.0 / total);

            Map<Long, Long> incidentsByCompany = containers.stream()
                    .filter(c -> Boolean.TRUE.equals(c.getDelayFlag()))
                    .collect(Collectors.groupingBy(Container::getShippingCompanyId, Collectors.counting()));
            List<String> top3 = incidentsByCompany.entrySet().stream()
                    .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                    .limit(3)
                    .map(e -> companyNames.getOrDefault(e.getKey(), "Desconocida") + " (" + e.getValue() + ")")
                    .toList();

            document.add(new Paragraph("Total de contenedores: " + total));
            document.add(new Paragraph("Promedio de días en tránsito: " + String.format("%.1f", avgDays)));
            document.add(new Paragraph("Porcentaje con demora: " + String.format("%.1f%%", pctDelayed)));
            document.add(new Paragraph("Top 3 navieras por incidencias: " + (top3.isEmpty() ? "N/A" : String.join(", ", top3))));

            addFooter(document, requestedBy);
        }

        return baos.toByteArray();
    }

    private long daysInTransit(Container c) {
        OffsetDateTime end = c.getDischargeEndAt() != null ? c.getDischargeEndAt() : OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime start = c.getActualDepartureDate() != null ? c.getActualDepartureDate() : c.getCreatedAt();
        return ChronoUnit.DAYS.between(start, end);
    }

    private void addHeader(Document document, String title) {
        Paragraph header = new Paragraph("ContainerTrack")
                .setFontColor(HEADER_COLOR)
                .setBold()
                .setFontSize(20);
        document.add(header);
        document.add(new Paragraph(title).setBold().setFontSize(16).setMarginBottom(12));
    }

    private void addFooter(Document document, User requestedBy) {
        document.add(new Paragraph("Generado el " + OffsetDateTime.now(ZoneOffset.UTC) +
                (requestedBy != null ? " por " + requestedBy.getFullName() : ""))
                .setFontSize(8).setMarginTop(24));
    }

    private void addRow(Table table, String label, String value) {
        table.addCell(cell(label, true));
        table.addCell(cell(value != null ? value : "-", false));
    }

    private Cell cell(String text, boolean bold) {
        Paragraph p = new Paragraph(text != null ? text : "-");
        if (bold) p.setBold();
        return new Cell().add(p);
    }

    private void addTimelineRow(Table table, String stage, OffsetDateTime estimated, OffsetDateTime actual, Boolean delay) {
        String diff = "-";
        if (estimated != null && actual != null) {
            diff = String.valueOf(ChronoUnit.DAYS.between(estimated, actual));
        }
        Cell stageCell = cell(stage, false);
        Cell estCell = cell(estimated != null ? String.valueOf(estimated) : "-", false);
        Cell actCell = cell(actual != null ? String.valueOf(actual) : "-", false);
        Cell diffCell = cell(diff, false);
        if (Boolean.TRUE.equals(delay)) {
            stageCell.setBackgroundColor(DELAY_COLOR);
            estCell.setBackgroundColor(DELAY_COLOR);
            actCell.setBackgroundColor(DELAY_COLOR);
            diffCell.setBackgroundColor(DELAY_COLOR);
        }
        table.addCell(stageCell);
        table.addCell(estCell);
        table.addCell(actCell);
        table.addCell(diffCell);
    }

    private byte[] downloadBytes(String url) throws IOException {
        try (var in = new URL(url).openStream()) {
            return in.readAllBytes();
        }
    }
}
