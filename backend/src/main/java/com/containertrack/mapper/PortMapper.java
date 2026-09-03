package com.containertrack.mapper;

import com.containertrack.dto.response.PortDTO;
import com.containertrack.entity.Port;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PortMapper {
    PortDTO toDto(Port port);
}
