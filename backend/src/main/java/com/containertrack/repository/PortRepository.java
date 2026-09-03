package com.containertrack.repository;

import com.containertrack.entity.Port;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortRepository extends JpaRepository<Port, Long> {
    Page<Port> findByIsActiveTrue(Pageable pageable);
    long countByIsActiveTrue();
    boolean existsByNameIgnoreCase(String name);
}
