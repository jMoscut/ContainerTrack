package com.containertrack.repository;

import com.containertrack.entity.ContainerPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContainerPhotoRepository extends JpaRepository<ContainerPhoto, Long> {
    List<ContainerPhoto> findByContainerId(Long containerId);
    long countByContainerId(Long containerId);
    void deleteByContainerId(Long containerId);
}
