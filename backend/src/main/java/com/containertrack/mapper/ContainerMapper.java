package com.containertrack.mapper;

import com.containertrack.dto.response.ContainerDTO;
import com.containertrack.entity.Container;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ContainerMapper {

    @Mapping(target = "shippingCompanyName", ignore = true)
    @Mapping(target = "responsibleOperatorName", ignore = true)
    @Mapping(target = "photoCount", ignore = true)
    ContainerDTO toDto(Container container);
}
