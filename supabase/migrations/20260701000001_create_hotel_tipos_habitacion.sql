CREATE TABLE hotel_tipos_habitacion (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hotel_id bigint NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
    tipo_habitacion_id bigint NOT NULL REFERENCES tipos_habitacion(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT hotel_tipos_habitacion_unique UNIQUE (hotel_id, tipo_habitacion_id)
);

CREATE INDEX IF NOT EXISTS idx_hotel_tipos_habitacion_hotel_id ON hotel_tipos_habitacion (hotel_id);
