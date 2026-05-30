-- =============================================================================
-- Migración 007 — Fase 1 Multi-Tenant (IDEMPOTENTE)
-- =============================================================================
-- Crea la tabla `hospitales` y agrega la columna `tenant_id` a todas las tablas
-- de dominio. Backfill: cualquier registro existente queda con tenant_id = 1
-- (hospital base "HGR No.1 IMSS Tijuana").
--
-- Idempotente: se puede ejecutar N veces sin romper. Usa INFORMATION_SCHEMA
-- para detectar columnas y tablas ya existentes.
--
-- Diseño autoreparable:
--   • Si la tabla `hospitales` no existe → la crea
--   • Si el hospital id=1 no existe → lo inserta
--   • Por cada tabla del dominio, si NO tiene `tenant_id` → la agrega con
--     DEFAULT 1 y un índice
--   • Backfill: UPDATE tenant_id = 1 donde sea NULL o 0
--
-- Single source of truth: el id=1 es siempre el hospital base. Para añadir
-- nuevos hospitales (escalabilidad), basta con INSERT INTO hospitales y
-- asignar a sus usuarios/equipos un tenant_id distinto.
-- =============================================================================

-- ─── 1. Tabla `hospitales` (single source of truth) ─────────────────────────
CREATE TABLE IF NOT EXISTS hospitales (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug          VARCHAR(80)   NOT NULL UNIQUE,
  razon_social  VARCHAR(200)  NOT NULL,
  nombre_corto  VARCHAR(80)   NOT NULL,
  delegacion    VARCHAR(120)  NULL,
  unidad_medica VARCHAR(160)  NULL,
  logo_url      VARCHAR(255)  NULL,
  color_primario VARCHAR(7)   NOT NULL DEFAULT '#006CB7',
  rfc           VARCHAR(13)   NULL,
  normativas    JSON          NULL,
  departamento  VARCHAR(120)  NOT NULL DEFAULT 'Departamento de Conservación',
  zona_horaria  VARCHAR(40)   NOT NULL DEFAULT 'America/Tijuana',
  estado_suscripcion ENUM('activo','suspendido','prueba','cancelado') NOT NULL DEFAULT 'activo',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. Hospital base (id=1) ─────────────────────────────────────────────────
INSERT IGNORE INTO hospitales (id, slug, razon_social, nombre_corto, delegacion, unidad_medica)
VALUES (
  1,
  'hgr1-imss-tij',
  'Hospital General Regional No.1 IMSS Tijuana',
  'HGR1 IMSS TIJ',
  'Delegación Baja California',
  'Hospital General Regional No.1'
);

-- ─── 3. Procedure helper: agrega tenant_id a una tabla si NO existe ──────────
DROP PROCEDURE IF EXISTS sigah_add_tenant_column;
DELIMITER //
CREATE PROCEDURE sigah_add_tenant_column(IN p_table VARCHAR(128))
BEGIN
  DECLARE col_exists INT DEFAULT 0;
  DECLARE tbl_exists INT DEFAULT 0;

  -- ¿Existe la tabla?
  SELECT COUNT(*) INTO tbl_exists
    FROM INFORMATION_SCHEMA.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = p_table;

  IF tbl_exists = 0 THEN
    -- Tabla no existe — saltar silenciosamente (autoreparable)
    SELECT CONCAT('SKIP: tabla `', p_table, '` no existe') AS info;
  ELSE
    -- ¿Existe la columna tenant_id?
    SELECT COUNT(*) INTO col_exists
      FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = p_table
       AND COLUMN_NAME  = 'tenant_id';

    IF col_exists = 0 THEN
      SET @sql_add = CONCAT(
        'ALTER TABLE `', p_table, '` ',
        'ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 1, ',
        'ADD INDEX idx_', p_table, '_tenant (tenant_id)'
      );
      PREPARE stmt FROM @sql_add;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SELECT CONCAT('ADDED: tenant_id en `', p_table, '`') AS info;
    ELSE
      -- Backfill: rellena NULL/0 con 1
      SET @sql_fix = CONCAT(
        'UPDATE `', p_table, '` SET tenant_id = 1 ',
        'WHERE tenant_id IS NULL OR tenant_id = 0'
      );
      PREPARE stmt FROM @sql_fix;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SELECT CONCAT('OK: `', p_table, '` ya tiene tenant_id (backfill aplicado)') AS info;
    END IF;
  END IF;
END //
DELIMITER ;

-- ─── 4. Aplicar a todas las tablas del dominio ───────────────────────────────
CALL sigah_add_tenant_column('usuarios');
CALL sigah_add_tenant_column('equipos');
CALL sigah_add_tenant_column('ordenes_servicio');
CALL sigah_add_tenant_column('alertas');
CALL sigah_add_tenant_column('preventivos_programados');
CALL sigah_add_tenant_column('trazabilidad');
CALL sigah_add_tenant_column('tecnovigilancia_eventos');
CALL sigah_add_tenant_column('tecnovigilancia_evidencias');
CALL sigah_add_tenant_column('reservas');
CALL sigah_add_tenant_column('capacitaciones');
CALL sigah_add_tenant_column('refacciones_almacen');
CALL sigah_add_tenant_column('log_actividad');
CALL sigah_add_tenant_column('log_auditoria_nom016');
CALL sigah_add_tenant_column('ubicaciones');
CALL sigah_add_tenant_column('zonas_mapa');
CALL sigah_add_tenant_column('os_casillas');
CALL sigah_add_tenant_column('os_evidencias');
CALL sigah_add_tenant_column('os_materiales');
CALL sigah_add_tenant_column('metrologia_calibracion');
CALL sigah_add_tenant_column('poka_yoke_logs');

-- ─── 5. Cleanup ──────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sigah_add_tenant_column;

-- ─── 6. Verificación final ───────────────────────────────────────────────────
SELECT
  '=== POST-MIGRACIÓN: estado tenant_id por tabla ===' AS resumen;

SELECT
  t.TABLE_NAME                 AS tabla,
  CASE WHEN c.COLUMN_NAME IS NULL THEN 'FALTA' ELSE 'OK' END AS tenant_id,
  c.COLUMN_DEFAULT             AS default_val
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
  ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
 AND c.TABLE_NAME   = t.TABLE_NAME
 AND c.COLUMN_NAME  = 'tenant_id'
WHERE t.TABLE_SCHEMA = DATABASE()
  AND t.TABLE_NAME IN (
    'usuarios','equipos','ordenes_servicio','alertas','preventivos_programados',
    'trazabilidad','tecnovigilancia_eventos','reservas','log_actividad',
    'ubicaciones','zonas_mapa','os_casillas','os_evidencias','os_materiales'
  )
ORDER BY t.TABLE_NAME;

SELECT 'Equipos con tenant_id=1:' AS metrica, COUNT(*) AS valor FROM equipos WHERE tenant_id = 1
UNION ALL
SELECT 'Usuarios con tenant_id=1:',  COUNT(*) FROM usuarios WHERE tenant_id = 1
UNION ALL
SELECT 'Órdenes con tenant_id=1:',   COUNT(*) FROM ordenes_servicio WHERE tenant_id = 1
UNION ALL
SELECT 'Hospitales registrados:',    COUNT(*) FROM hospitales;
