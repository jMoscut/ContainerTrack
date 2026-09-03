CREATE TABLE ports (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL UNIQUE,
    country        VARCHAR(100) NOT NULL,
    is_guatemalan  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ports_is_active ON ports(is_active);

-- Seed a starter catalog so the "Nuevo Contenedor" dropdown isn't empty on first use.
-- RN-CONT (spec): destination port must be a Guatemalan port.
INSERT INTO ports (name, country, is_guatemalan) VALUES
    ('Puerto Quetzal', 'Guatemala', TRUE),
    ('Puerto Santo Tomás de Castilla', 'Guatemala', TRUE),
    ('Puerto Barrios', 'Guatemala', TRUE),
    ('Shanghai', 'China', FALSE),
    ('Ningbo-Zhoushan', 'China', FALSE),
    ('Shenzhen', 'China', FALSE),
    ('Singapore', 'Singapur', FALSE),
    ('Busan', 'Corea del Sur', FALSE),
    ('Los Angeles', 'Estados Unidos', FALSE),
    ('Long Beach', 'Estados Unidos', FALSE),
    ('Houston', 'Estados Unidos', FALSE),
    ('Miami', 'Estados Unidos', FALSE),
    ('Manzanillo', 'México', FALSE),
    ('Cartagena', 'Colombia', FALSE),
    ('Callao', 'Perú', FALSE),
    ('Rotterdam', 'Países Bajos', FALSE),
    ('Hamburg', 'Alemania', FALSE),
    ('Valencia', 'España', FALSE);
