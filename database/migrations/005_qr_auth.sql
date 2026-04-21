-- ================================================================
-- SIGAB Migration 005: QR opaco + Autenticación JWT + Documentación
-- - Añade password_hash y metadatos de login a usuarios
-- - Añade manual_url, video_url, qr_token a equipos
-- - Backfill de tokens QR para equipos existentes
-- - Crea/actualiza vista v_dashboard_equipos
-- Idempotente para MySQL 8.0+
-- ================================================================
USE sigab;

-- ----------------------------------------------------------------
-- Helper procedure: añadir columna sólo si no existe
-- ----------------------------------------------------------------
DROP PROCEDURE IF EXISTS sigab_add_col;
DELIMITER //
CREATE PROCEDURE sigab_add_col(
  IN p_table  VARCHAR(100),
  IN p_column VARCHAR(100),
  IN p_def    TEXT
)
BEGIN
  DECLARE col_count INT;
  SELECT COUNT(*) INTO col_count
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND COLUMN_NAME = p_column;
  IF col_count = 0 THEN
    SET @s = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_def);
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- 1) Password y metadatos de login en usuarios
CALL sigab_add_col('usuarios', 'password_hash',         'VARCHAR(255) NULL');
CALL sigab_add_col('usuarios', 'must_change_password',  'BOOLEAN NOT NULL DEFAULT TRUE');
CALL sigab_add_col('usuarios', 'last_login',            'TIMESTAMP NULL');

-- 2) Documentación y QR opaco en equipos
CALL sigab_add_col('equipos', 'manual_url', 'VARCHAR(500) NULL COMMENT "URL/ruta a manual PDF del equipo"');
CALL sigab_add_col('equipos', 'video_url',  'VARCHAR(500) NULL COMMENT "URL a video tutorial del equipo"');
CALL sigab_add_col('equipos', 'qr_token',   'VARCHAR(32)  NULL COMMENT "Token opaco para URL pública del QR"');

-- 3) Índice UNIQUE en qr_token (creación condicional)
SET @exist = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipos' AND INDEX_NAME = 'idx_equipos_qr_token');
SET @sql = IF(@exist = 0,
  'CREATE UNIQUE INDEX idx_equipos_qr_token ON equipos(qr_token)',
  'SELECT "idx_equipos_qr_token ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Backfill tokens QR para equipos existentes
UPDATE equipos
SET qr_token = SUBSTRING(SHA2(CONCAT(id, RAND(), UNIX_TIMESTAMP()), 256), 1, 16)
WHERE qr_token IS NULL;

-- 5) Vista v_dashboard_equipos (incluye campos nuevos)
CREATE OR REPLACE VIEW v_dashboard_equipos AS
SELECT
  e.id, e.serie, e.inventario, e.nombre, e.marca, e.modelo,
  e.ubicacion, e.piso, e.area, e.estado, e.criticidad,
  e.fecha_instalacion, e.fecha_ultimo_mantenimiento, e.fecha_proximo_mantenimiento,
  e.fecha_compra, e.vida_util_anios,
  e.numero_contrato, e.numero_contrato_servicio, e.proveedor_servicio,
  e.tipo_equipo, e.clase_cofepris,
  e.zona_id, e.pos_x, e.pos_y,
  e.imagen_url, e.manual_url, e.video_url, e.qr_token,
  e.fotos, e.cobertura,
  e.created_at, e.updated_at,
  (SELECT COUNT(*) FROM ordenes_servicio os
     WHERE os.equipo_id = e.id AND os.estado IN ('abierta','en_progreso')) AS tickets_abiertos,
  (SELECT COUNT(*) FROM alertas a
     WHERE a.equipo_id = e.id AND a.leida = 0) AS alertas_pendientes,
  (SELECT MAX(os.fecha) FROM ordenes_servicio os
     WHERE os.equipo_id = e.id AND os.estado = 'cerrada') AS ultimo_mantenimiento_real
FROM equipos e;

-- 6) Limpieza del helper
DROP PROCEDURE IF EXISTS sigab_add_col;
