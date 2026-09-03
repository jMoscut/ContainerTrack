package com.containertrack.mapper;

import com.containertrack.dto.response.UserDTO;
import com.containertrack.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDTO toDto(User user);
}
