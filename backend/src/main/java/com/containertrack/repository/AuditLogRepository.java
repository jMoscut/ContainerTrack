package com.containertrack.repository;

import com.containertrack.entity.AuditAction;
import com.containertrack.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtAsc(String entityType, Long entityId);
    List<AuditLog> findByEntityTypeAndEntityIdAndActionOrderByPerformedAtAsc(String entityType, Long entityId, AuditAction action);

    /**
     * Returns [performedBy (Long), changeCount (Long)] rows for the most active users
     * since the given instant, ordered by change count descending. Capped via Pageable
     * (e.g. PageRequest.of(0, 5)) — the dataset is small enough that a simple GROUP BY
     * with a limit is preferable to a more complex query.
     */
    @Query("SELECT a.performedBy, COUNT(a) FROM AuditLog a " +
            "WHERE a.performedAt >= :since AND a.performedBy IS NOT NULL " +
            "GROUP BY a.performedBy ORDER BY COUNT(a) DESC")
    List<Object[]> findTopActiveUsersSince(@Param("since") OffsetDateTime since, Pageable pageable);
}
