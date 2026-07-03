ALTER TABLE destinos
ADD COLUMN activo boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_destinos_activo ON destinos (activo);
