-- ============================================================================
-- Migración 011 — Marcado físico de activos
-- ============================================================================
-- Añade campos para rastrear el ciclo de vida de la placa física grabada
-- (poliester / aluminio anodizado / acero inoxidable) que se pega al equipo.
--
-- Tier values:
--   'basico'   — Etiqueta poliester adhesivo 40x25mm  ($35 MXN)
--   'estandar' — Placa aluminio anodizado 50x30mm     ($120 MXN, grabado laser)
--   'premium'  — Placa acero inox 304 60x40mm         ($280 MXN, atornillado)
--
-- Compatible con módulo /marcado-fisico (frontend) y /api/marcado-fisico/* (backend)
-- ============================================================================

ALTER TABLE equipos
    ADD COLUMN placa_tipo VARCHAR(16) NULL
        COMMENT 'Tier de la placa: basico | estandar | premium',
    ADD COLUMN placa_instalada BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'Indica si la placa fisica ya fue instalada en el equipo',
    ADD COLUMN placa_fecha_pedido DATETIME NULL
        COMMENT 'Fecha en que se genero el ZIP de produccion para el fabricante',
    ADD COLUMN placa_fecha_instalacion DATETIME NULL
        COMMENT 'Fecha en que el tecnico marco la placa como instalada',
    ADD COLUMN placa_proveedor VARCHAR(64) NULL
        COMMENT 'Fabricante de la placa (Labels and Plates ID, Inventarios.com.mx, etc.)';

-- Indice para reportes de cobertura de marcado fisico
CREATE INDEX idx_equipos_placa_instalada ON equipos (placa_instalada);

-- ============================================================================
-- Tabla de pedidos de produccion (historial de ZIPs generados)
-- Permite trackear costo, lead time y cobranza al cliente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS placa_pedidos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(32) NOT NULL UNIQUE
        COMMENT 'Folio interno SIGAH (ej. SIGAH-PLACA-20260526-001)',
    hospital_id INT UNSIGNED NULL
        COMMENT 'tenant_id del hospital (multi-tenant); NULL para hospitales legacy',
    tier VARCHAR(16) NOT NULL
        COMMENT 'basico | estandar | premium',
    cantidad INT NOT NULL,
    costo_unitario_mxn DECIMAL(10, 2) NOT NULL,
    subtotal_mxn DECIMAL(12, 2) NOT NULL,
    iva_mxn DECIMAL(12, 2) NOT NULL,
    total_mxn DECIMAL(12, 2) NOT NULL,
    proveedor VARCHAR(64) NULL
        COMMENT 'Fabricante seleccionado',
    estado VARCHAR(32) NOT NULL DEFAULT 'generado'
        COMMENT 'generado | enviado_proveedor | en_fabricacion | recibido | instalado | cancelado',
    fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_envio_proveedor DATETIME NULL,
    fecha_recepcion DATETIME NULL,
    fecha_instalacion_completa DATETIME NULL,
    generado_por_usuario_id INT UNSIGNED NULL
        COMMENT 'Usuario SIGAH que genero el pedido',
    notas TEXT NULL,
    INDEX idx_placa_pedidos_hospital (hospital_id),
    INDEX idx_placa_pedidos_estado (estado),
    INDEX idx_placa_pedidos_fecha (fecha_generacion DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Tabla pivote: equipos incluidos en cada pedido
-- ============================================================================

CREATE TABLE IF NOT EXISTS placa_pedido_equipos (
    pedido_id INT UNSIGNED NOT NULL,
    equipo_id INT UNSIGNED NOT NULL,
    instalada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_instalacion DATETIME NULL,
    PRIMARY KEY (pedido_id, equipo_id),
    FOREIGN KEY (pedido_id) REFERENCES placa_pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
    INDEX idx_pedido_equipos_equipo (equipo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Rollback (referencia, no ejecutar automaticamente)
-- ============================================================================
-- DROP TABLE IF EXISTS placa_pedido_equipos;
-- DROP TABLE IF EXISTS placa_pedidos;
-- ALTER TABLE equipos
--     DROP INDEX idx_equipos_placa_instalada,
--     DROP COLUMN placa_proveedor,
--     DROP COLUMN placa_fecha_instalacion,
--     DROP COLUMN placa_fecha_pedido,
--     DROP COLUMN placa_instalada,
--     DROP COLUMN placa_tipo;
