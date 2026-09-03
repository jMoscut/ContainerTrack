package com.containertrack.repository;

import com.containertrack.entity.Role;
import com.containertrack.entity.User;
import com.containertrack.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByActivationToken(String activationToken);
    Optional<User> findByRefreshToken(String refreshToken);
    long countByRoleAndStatus(Role role, UserStatus status);
    long countByStatus(UserStatus status);
    List<User> findByStatus(UserStatus status);
    List<User> findByRoleAndStatus(Role role, UserStatus status);
    Page<User> findAll(Pageable pageable);
}
