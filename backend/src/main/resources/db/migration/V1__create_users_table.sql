CREATE TABLE users (
    id                     BIGSERIAL PRIMARY KEY,
    email                  VARCHAR(255) NOT NULL UNIQUE,
    password_hash          VARCHAR(255) NOT NULL,
    full_name              VARCHAR(255) NOT NULL,
    role                    VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','OPERATOR','WAREHOUSE')),
    status                  VARCHAR(30) NOT NULL CHECK (status IN ('ACTIVE','INACTIVE','PENDING_ACTIVATION')),
    failed_login_attempts  INT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMP WITH TIME ZONE,
    activation_token        VARCHAR(255),
    activation_token_expiry TIMESTAMP WITH TIME ZONE,
    refresh_token           VARCHAR(500),
    refresh_token_expiry    TIMESTAMP WITH TIME ZONE,
    must_change_password    BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at               TIMESTAMP WITH TIME ZONE,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
