-- Default password: Admin2024! (BCrypt cost 12). Must be changed on first login (must_change_password=TRUE).
INSERT INTO users (email, password_hash, full_name, role, status, must_change_password)
VALUES (
    'admin@containertrack.gt',
    '$2b$12$GtRuG/Z4q9gPVDDKvMyPmO3tlU0bDBhGuxrqENos.lBhVgTHEP31.',
    'Administrador ContainerTrack',
    'ADMIN',
    'PENDING_ACTIVATION',
    TRUE
);
