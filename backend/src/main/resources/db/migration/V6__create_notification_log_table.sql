CREATE TABLE notification_log (
    id                  BIGSERIAL PRIMARY KEY,
    container_id        BIGINT REFERENCES containers(id),
    notification_type   VARCHAR(50) NOT NULL,
    recipient_email     VARCHAR(255) NOT NULL,
    scheduled_for        TIMESTAMP WITH TIME ZONE,
    sent_at              TIMESTAMP WITH TIME ZONE,
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED')),
    retry_count          INT NOT NULL DEFAULT 0,
    error_message        TEXT,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
