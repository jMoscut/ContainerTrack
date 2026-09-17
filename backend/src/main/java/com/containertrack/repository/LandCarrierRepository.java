package com.containertrack.repository;

import com.containertrack.entity.LandCarrier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LandCarrierRepository extends JpaRepository<LandCarrier, Long> {
    Page<LandCarrier> findByIsActiveTrue(Pageable pageable);
    boolean existsByNameIgnoreCase(String name);
}
