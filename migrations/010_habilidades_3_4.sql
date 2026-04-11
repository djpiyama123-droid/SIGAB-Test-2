-- ================================================================
-- SIGAB Migration: Habilidades 3 y 4
-- Poka-Yoke Triple Validación + Auditoría NOM-016
-- ================================================================
USE sigab;

-- 1. Tablas para Habilidad 3: Poka-Yoke Triple Validación
CREATE TABLE IF NOT EXISTS validaciones_pokayoke (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipo_id INT UNSIGNED NULL,
    usuario_id INT UNSIGNED NOT NULL,
    qr_escaneado VARCHAR(255),
    inventario_leido VARCHAR(100),
    serie_leida VARCHAR(100),
    es_valido BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    fecha_validacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tablas para Habilidad 4: Auditoría NOM-016 Compliance
CREATE TABLE IF NOT EXISTS log_auditoria_nom016 (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT UNSIGNED NULL,
    accion VARCHAR(100) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'VALIDATION'
    entidad VARCHAR(50) NOT NULL, -- 'equipos', 'ordenes', etc.
    entidad_id INT UNSIGNED NOT NULL,
    hash_previo VARCHAR(64) NULL, -- SHA-256 del registro anterior
    hash_registro VARCHAR(64) NOT NULL, -- SHA-256 de (usuario_id + accion + entidad + entidad_id + datos + hash_previo)
    datos_json JSON NOT NULL,
    verificado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Checklists NOM-016 (Plantillas)
CREATE TABLE IF NOT EXISTS nom016_checklists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100), -- 'Quirofano', 'Ceye', etc.
    descripcion TEXT,
    items JSON NOT NULL, -- Arreglo de preguntas/verificaciones
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Resultados de Checklists
CREATE TABLE IF NOT EXISTS nom016_resultados (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    area_id INT UNSIGNED NULL,
    resultados JSON NOT NULL, -- Respuestas a los items
    observaciones TEXT,
    archivo_pdf_path VARCHAR(255),
    fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES nom016_checklists(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (area_id) REFERENCES ubicaciones(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed inicial para Checklist NOM-016 (Ejemplo)
INSERT INTO nom016_checklists (nombre, categoria, items) VALUES
('Checklist de Equipamiento en Quirófano', 'NOM-016-SSA3-2012', 
'[
  {"pregunta": "¿Cuenta con monitor de signos vitales funcional?", "tipo": "si_no_na"},
  {"pregunta": "¿Maquina de anestesia con vaporizadores calibrados?", "tipo": "si_no_na"},
  {"pregunta": "¿Aspirador de succión regulable?", "tipo": "si_no_na"},
  {"pregunta": "¿Mesa de operaciones con movimientos funcionales?", "tipo": "si_no_na"},
  {"pregunta": "¿Lámparas quirúrgicas con intensidad adecuada?", "tipo": "si_no_na"}
]');
