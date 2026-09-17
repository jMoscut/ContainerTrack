package com.containertrack.mapper;

import com.containertrack.dto.response.LandCarrierDTO;
import com.containertrack.entity.LandCarrier;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface LandCarrierMapper {
    LandCarrierDTO toDto(LandCarrier carrier);
}
