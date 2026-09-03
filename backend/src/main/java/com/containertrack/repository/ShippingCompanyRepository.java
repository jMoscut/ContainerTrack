package com.containertrack.repository;

import com.containertrack.entity.ShippingCompany;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShippingCompanyRepository extends JpaRepository<ShippingCompany, Long> {
    Page<ShippingCompany> findByIsActiveTrue(Pageable pageable);
    long countByIsActiveTrue();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByShortCodeIgnoreCase(String shortCode);
}
