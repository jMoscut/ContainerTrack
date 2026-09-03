CREATE TABLE container_photos (
    id                  BIGSERIAL PRIMARY KEY,
    container_id        BIGINT NOT NULL REFERENCES containers(id),
    r2_key              VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    size_bytes          BIGINT NOT NULL,
    is_valid            BOOLEAN NOT NULL DEFAULT TRUE,
    invalidation_reason TEXT,
    uploaded_by         BIGINT NOT NULL REFERENCES users(id),
    uploaded_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
