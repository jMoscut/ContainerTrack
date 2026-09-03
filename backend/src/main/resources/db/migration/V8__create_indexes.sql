CREATE UNIQUE INDEX idx_containers_number ON containers(container_number) WHERE status <> 'DISCHARGED';
CREATE INDEX idx_containers_number_all ON containers(container_number);
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_containers_shipping_company ON containers(shipping_company_id);
CREATE INDEX idx_containers_estimated_arrival_port ON containers(estimated_arrival_port);
CREATE INDEX idx_containers_last_updated_by ON containers(last_updated_by);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_id, entity_type);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at);

CREATE INDEX idx_notification_log_lookup ON notification_log(container_id, notification_type, status);

CREATE INDEX idx_cfc_container_id ON container_field_changes(container_id);
CREATE INDEX idx_cfc_updated_at ON container_field_changes(updated_at);
