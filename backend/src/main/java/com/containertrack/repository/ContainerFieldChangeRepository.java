package com.containertrack.repository;

import com.containertrack.entity.ContainerFieldChange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContainerFieldChangeRepository extends JpaRepository<ContainerFieldChange, Long> {
    List<ContainerFieldChange> findByContainerIdOrderByUpdatedAtAsc(Long containerId);
    void deleteByContainerId(Long containerId);
}
