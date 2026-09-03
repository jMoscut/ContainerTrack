CREATE TABLE shipping_companies (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL UNIQUE,
    short_code     VARCHAR(20) NOT NULL UNIQUE,
    country        VARCHAR(100),
    contact_email  VARCHAR(255),
    contact_phone  VARCHAR(50),
    notes          TEXT,
    free_days_limit INT NOT NULL DEFAULT 10,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
