package com.containertrack.mapper;

import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerStatus;
import com.containertrack.entity.LandCarrier;
import com.containertrack.entity.Port;
import com.containertrack.entity.Role;
import com.containertrack.entity.ShippingCompany;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Direct unit tests of the MapStruct-generated mapper implementations — pure field
 * copying, no mocks needed. Covers both the null-input short-circuit and a fully
 * populated entity for each mapper.
 */
class MapperTest {

    private static final OffsetDateTime NOW = OffsetDateTime.now();

    @Test
    void containerMapper_mapsAllFields() {
        Container container = Container.builder()
                .id(1L)
                .containerNumber("CSQU3054383")
                .blNumber("BL-1")
                .shippingCompanyId(2L)
                .landCarrierId(3L)
                .warehouseAssigneeId(4L)
                .originPort("Shanghai")
                .destinationPort("Puerto Quetzal")
                .cargoDescription("Electronics")
                .responsibleOperatorId(5L)
                .status(ContainerStatus.DEPARTED_ORIGIN)
                .version(2)
                .lastUpdatedBy(6L)
                .lastUpdatedAt(NOW)
                .estimatedDepartureDate(NOW)
                .actualDepartureDate(NOW)
                .estimatedArrivalPort(NOW)
                .actualArrivalPort(NOW)
                .freeDaysLimit(10)
                .freeDaysExpiry(NOW)
                .estimatedDeparturePort(NOW)
                .actualDeparturePort(NOW)
                .estimatedArrivalWarehouse(NOW)
                .actualArrivalWarehouse(NOW)
                .dischargeStartAt(NOW)
                .dischargeEndAt(NOW)
                .dischargeNotes("notes")
                .delayFlag(true)
                .internalNotes("internal")
                .createdBy(7L)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();

        var dto = new ContainerMapperImpl().toDto(container);

        assertEquals(1L, dto.getId());
        assertEquals("CSQU3054383", dto.getContainerNumber());
        assertEquals("BL-1", dto.getBlNumber());
        assertEquals(2L, dto.getShippingCompanyId());
        assertEquals(3L, dto.getLandCarrierId());
        assertEquals(4L, dto.getWarehouseAssigneeId());
        assertEquals("Shanghai", dto.getOriginPort());
        assertEquals("Puerto Quetzal", dto.getDestinationPort());
        assertEquals("Electronics", dto.getCargoDescription());
        assertEquals(5L, dto.getResponsibleOperatorId());
        assertEquals("DEPARTED_ORIGIN", dto.getStatus());
        assertEquals(2, dto.getVersion());
        assertEquals(6L, dto.getLastUpdatedBy());
        assertEquals(10, dto.getFreeDaysLimit());
        assertEquals("notes", dto.getDischargeNotes());
        assertEquals(Boolean.TRUE, dto.getDelayFlag());
        assertEquals("internal", dto.getInternalNotes());
        assertEquals(7L, dto.getCreatedBy());
    }

    @Test
    void containerMapper_nullInputReturnsNull() {
        assertNull(new ContainerMapperImpl().toDto(null));
    }

    @Test
    void landCarrierMapper_mapsAllFields() {
        LandCarrier carrier = LandCarrier.builder()
                .id(1L)
                .name("Transportes del Norte")
                .plateNumber("P-123ABC")
                .phone("5555-5555")
                .company("Transportes del Norte S.A.")
                .notes("reliable")
                .isActive(true)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();

        var dto = new LandCarrierMapperImpl().toDto(carrier);

        assertEquals(1L, dto.getId());
        assertEquals("Transportes del Norte", dto.getName());
        assertEquals("P-123ABC", dto.getPlateNumber());
        assertEquals("5555-5555", dto.getPhone());
        assertEquals("Transportes del Norte S.A.", dto.getCompany());
        assertEquals("reliable", dto.getNotes());
        assertEquals(Boolean.TRUE, dto.getIsActive());
    }

    @Test
    void landCarrierMapper_nullInputReturnsNull() {
        assertNull(new LandCarrierMapperImpl().toDto(null));
    }

    @Test
    void portMapper_mapsAllFields() {
        Port port = Port.builder()
                .id(1L)
                .name("Puerto Quetzal")
                .country("Guatemala")
                .isGuatemalan(true)
                .isActive(true)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();

        var dto = new PortMapperImpl().toDto(port);

        assertEquals(1L, dto.getId());
        assertEquals("Puerto Quetzal", dto.getName());
        assertEquals("Guatemala", dto.getCountry());
        assertEquals(Boolean.TRUE, dto.getIsGuatemalan());
        assertEquals(Boolean.TRUE, dto.getIsActive());
    }

    @Test
    void portMapper_nullInputReturnsNull() {
        assertNull(new PortMapperImpl().toDto(null));
    }

    @Test
    void shippingCompanyMapper_mapsAllFields() {
        ShippingCompany company = ShippingCompany.builder()
                .id(1L)
                .name("Maersk")
                .shortCode("MSK")
                .country("Dinamarca")
                .contactEmail("contact@maersk.com")
                .contactPhone("5555-1234")
                .notes("key account")
                .freeDaysLimit(14)
                .isActive(true)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();

        var dto = new ShippingCompanyMapperImpl().toDto(company);

        assertEquals(1L, dto.getId());
        assertEquals("Maersk", dto.getName());
        assertEquals("MSK", dto.getShortCode());
        assertEquals("Dinamarca", dto.getCountry());
        assertEquals("contact@maersk.com", dto.getContactEmail());
        assertEquals("5555-1234", dto.getContactPhone());
        assertEquals("key account", dto.getNotes());
        assertEquals(14, dto.getFreeDaysLimit());
        assertEquals(Boolean.TRUE, dto.getIsActive());
    }

    @Test
    void shippingCompanyMapper_nullInputReturnsNull() {
        assertNull(new ShippingCompanyMapperImpl().toDto(null));
    }

    @Test
    void userMapper_mapsAllFields() {
        User user = User.builder()
                .id(1L)
                .email("jane@example.com")
                .passwordHash("hash")
                .fullName("Jane Doe")
                .role(Role.OPERATOR)
                .status(UserStatus.ACTIVE)
                .mustChangePassword(false)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();

        var dto = new UserMapperImpl().toDto(user);

        assertEquals(1L, dto.getId());
        assertEquals("jane@example.com", dto.getEmail());
        assertEquals("Jane Doe", dto.getFullName());
        assertEquals("OPERATOR", dto.getRole());
        assertEquals("ACTIVE", dto.getStatus());
        assertEquals(Boolean.FALSE, dto.getMustChangePassword());
    }

    @Test
    void userMapper_nullInputReturnsNull() {
        assertNull(new UserMapperImpl().toDto(null));
    }
}
