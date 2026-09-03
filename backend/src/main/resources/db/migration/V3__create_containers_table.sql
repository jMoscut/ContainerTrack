CREATE TABLE containers (
    id                          BIGSERIAL PRIMARY KEY,
    container_number            VARCHAR(11) NOT NULL,
    shipping_company_id         BIGINT NOT NULL REFERENCES shipping_companies(id),
    origin_port                 VARCHAR(255) NOT NULL,
    destination_port            VARCHAR(255) NOT NULL,
    cargo_description           VARCHAR(500),
    responsible_operator_id     BIGINT NOT NULL REFERENCES users(id),
    status                      VARCHAR(30) NOT NULL DEFAULT 'REGISTERED'
        CHECK (status IN ('REGISTERED','DEPARTED_ORIGIN','ARRIVED_PORT','DEPARTED_PORT','ARRIVED_WAREHOUSE','DISCHARGED')),
    version                     INT NOT NULL DEFAULT 0,
    last_updated_by             BIGINT REFERENCES users(id),
    last_updated_at             TIMESTAMP WITH TIME ZONE,

    estimated_departure_date    TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_departure_date       TIMESTAMP WITH TIME ZONE,

    estimated_arrival_port      TIMESTAMP WITH TIME ZONE,
    actual_arrival_port         TIMESTAMP WITH TIME ZONE,
    free_days_limit              INT NOT NULL DEFAULT 10,
    free_days_expiry             TIMESTAMP WITH TIME ZONE,

    estimated_departure_port    TIMESTAMP WITH TIME ZONE,
    actual_departure_port       TIMESTAMP WITH TIME ZONE,

    estimated_arrival_warehouse TIMESTAMP WITH TIME ZONE,
    actual_arrival_warehouse    TIMESTAMP WITH TIME ZONE,

    discharge_start_at          TIMESTAMP WITH TIME ZONE,
    discharge_end_at            TIMESTAMP WITH TIME ZONE,
    discharge_notes              TEXT,

    delay_flag                  BOOLEAN NOT NULL DEFAULT FALSE,
    internal_notes               TEXT,

    created_by                  BIGINT NOT NULL REFERENCES users(id),
    deleted_at                   TIMESTAMP WITH TIME ZONE,
    created_at                   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RN-CONT-02: unique only among active (non-discharged) containers; reuse allowed 30+ days after discharge.
-- Enforced at application layer (query check), not as a DB constraint, since "active" is time-dependent.
