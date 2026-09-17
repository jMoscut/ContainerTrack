CREATE TABLE land_carriers (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL UNIQUE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_land_carriers_is_active ON land_carriers(is_active);

ALTER TABLE containers
    ADD COLUMN bl_number VARCHAR(50),
    ADD COLUMN land_carrier_id BIGINT REFERENCES land_carriers(id),
    ADD COLUMN warehouse_assignee_id BIGINT REFERENCES users(id);

-- Backfill existing rows so the NOT NULL constraint below can be applied.
UPDATE containers SET bl_number = 'BL-' || id WHERE bl_number IS NULL;

ALTER TABLE containers ALTER COLUMN bl_number SET NOT NULL;
