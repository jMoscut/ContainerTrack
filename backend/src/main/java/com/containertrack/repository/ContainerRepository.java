package com.containertrack.repository;

import com.containertrack.entity.Container;
import com.containertrack.entity.ContainerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ContainerRepository extends JpaRepository<Container, Long>, JpaSpecificationExecutor<Container> {

    List<Container> findByContainerNumberAndStatusNot(String containerNumber, ContainerStatus status);

    Optional<Container> findTopByContainerNumberAndStatusOrderByDischargeEndAtDesc(String containerNumber, ContainerStatus status);

    List<Container> findByStatusNot(ContainerStatus status);

    List<Container> findByStatusIn(List<ContainerStatus> statuses);

    List<Container> findByEstimatedArrivalPortBetween(OffsetDateTime from, OffsetDateTime to);
}
