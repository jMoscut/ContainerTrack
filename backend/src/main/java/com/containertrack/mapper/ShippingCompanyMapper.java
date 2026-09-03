package com.containertrack.mapper;

import com.containertrack.dto.response.ShippingCompanyDTO;
import com.containertrack.entity.ShippingCompany;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ShippingCompanyMapper {
    ShippingCompanyDTO toDto(ShippingCompany company);
}
