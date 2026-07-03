-- Circuitos
CREATE TABLE circuitos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(255) NOT NULL,
    descripcion text,
    precio_total numeric(10,2) NOT NULL DEFAULT 0,
    duracion_dias integer NOT NULL DEFAULT 1,
    duracion_noches integer NOT NULL DEFAULT 0,
    activo boolean NOT NULL DEFAULT true,
    imagen_principal text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_circuitos_activo ON circuitos (activo);

-- Circuito traducciones
CREATE TABLE circuito_traducciones (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    circuito_id bigint NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
    idioma_id bigint NOT NULL REFERENCES idiomas(id) ON DELETE CASCADE,
    nombre varchar(255),
    descripcion text,
    CONSTRAINT circuito_traducciones_unique UNIQUE (circuito_id, idioma_id)
);

CREATE INDEX idx_circuito_traducciones_circuito_id ON circuito_traducciones (circuito_id);

-- Circuito destinos (itinerario ordenado)
CREATE TABLE circuito_destinos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    circuito_id bigint NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
    destino_id bigint NOT NULL REFERENCES destinos(id) ON DELETE CASCADE,
    orden integer NOT NULL,
    dias integer NOT NULL DEFAULT 1,
    noches integer NOT NULL DEFAULT 0,
    CONSTRAINT circuito_destinos_unique UNIQUE (circuito_id, orden)
);

CREATE INDEX idx_circuito_destinos_circuito_id ON circuito_destinos (circuito_id);

-- Circuito hoteles (asignados por noche)
CREATE TABLE circuito_hoteles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    circuito_id bigint NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
    hotel_id bigint NOT NULL REFERENCES hoteles(id) ON DELETE CASCADE,
    noche integer NOT NULL,
    regimen_id bigint REFERENCES regimen(id) ON DELETE SET NULL,
    CONSTRAINT circuito_hoteles_unique UNIQUE (circuito_id, noche)
);

CREATE INDEX idx_circuito_hoteles_circuito_id ON circuito_hoteles (circuito_id);

-- Circuito actividades
CREATE TABLE circuito_actividades (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    circuito_id bigint NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
    actividad_id bigint NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
    dia integer NOT NULL,
    orden integer NOT NULL DEFAULT 1
);

CREATE INDEX idx_circuito_actividades_circuito_id ON circuito_actividades (circuito_id);

-- Circuito imagenes
CREATE TABLE circuito_imagenes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    circuito_id bigint NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
    imagen_url text NOT NULL,
    orden integer NOT NULL DEFAULT 1,
    activa boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_circuito_imagenes_circuito_id ON circuito_imagenes (circuito_id);

-- Plantillas reutilizables de flyer
CREATE TABLE flyer_plantillas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(255) NOT NULL,
    descripcion text,
    orientacion varchar(20) NOT NULL DEFAULT 'portrait',
    ancho integer NOT NULL DEFAULT 1080,
    alto integer NOT NULL DEFAULT 1920,
    thumbnail text,
    categoria varchar(50) NOT NULL DEFAULT 'general',
    config jsonb NOT NULL DEFAULT '{}',
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Configuracion de flyer guardada por circuito
CREATE TABLE circuito_flyers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    circuito_id bigint NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
    plantilla_id bigint REFERENCES flyer_plantillas(id) ON DELETE SET NULL,
    config jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_circuito_flyers_circuito_id ON circuito_flyers (circuito_id);
