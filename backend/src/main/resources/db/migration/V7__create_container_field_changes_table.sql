CREATE TABLE container_field_changes (
    id              BIGSERIAL PRIMARY KEY,
    container_id    BIGINT NOT NULL REFERENCES containers(id),
    field_name      VARCHAR(100) NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    updated_by      BIGINT NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
