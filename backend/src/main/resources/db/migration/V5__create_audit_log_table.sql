CREATE TABLE audit_log (
    id            BIGSERIAL PRIMARY KEY,
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     BIGINT NOT NULL,
    action        VARCHAR(50) NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','STATUS_CHANGE')),
    field_name    VARCHAR(100),
    old_value     TEXT,
    new_value     TEXT,
    performed_by  BIGINT REFERENCES users(id),
    performed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address    VARCHAR(45)
);
