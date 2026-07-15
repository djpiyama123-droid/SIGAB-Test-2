-- Migración 012: columnas de `equipos` que el modelo SQLModel (sigab-backend/models/equipo.py)
-- espera pero que no tienen una migración versionada en este repo:
--   - imagen_referencial   (alembic c7d8e9f0a1b2 ya existe en código; según nota de
--     coordinación de 2026-06-27 seguía sin aplicarse en prod hace 3 semanas)
--   - numero_contrato, proveedor_servicio, numero_contrato_servicio (comentadas en
--     fb21941638ba como "aplicadas a mano en prod vía migración SQL 009 externa",
--     pero ese archivo 009 no existe en database/migrations/ — sin registro versionado)
--
-- Bug 2 (alta de equipo): si CUALQUIERA de estas columnas falta en la tabla real de
-- prod, el INSERT/SELECT de `equipos` revienta con "Unknown column" y el alta falla.
-- Idempotente (chequea INFORMATION_SCHEMA antes de cada ADD COLUMN, mismo patrón que
-- fb21941638ba) — reintentar corriéndola no duplica ni falla si alguna ya existe.
--
-- NO APLICAR sin verificar antes el esquema real:
--   SHOW COLUMNS FROM equipos;
-- y sin respaldo (imagen :pre-<fecha> + dump SQL), con Gustavo presente.

DELIMITER $$

CREATE PROCEDURE _sigab_012_add_col_if_missing(
  IN p_tabla VARCHAR(64), IN p_columna VARCHAR(64), IN p_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla AND COLUMN_NAME = p_columna
  ) THEN
    SET @ddl = p_ddl;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

CALL _sigab_012_add_col_if_missing('equipos', 'imagen_referencial',
  'ALTER TABLE equipos ADD COLUMN imagen_referencial TINYINT(1) NOT NULL DEFAULT 0');

CALL _sigab_012_add_col_if_missing('equipos', 'numero_contrato',
  'ALTER TABLE equipos ADD COLUMN numero_contrato VARCHAR(255) NULL');

CALL _sigab_012_add_col_if_missing('equipos', 'proveedor_servicio',
  'ALTER TABLE equipos ADD COLUMN proveedor_servicio VARCHAR(255) NULL');

CALL _sigab_012_add_col_if_missing('equipos', 'numero_contrato_servicio',
  'ALTER TABLE equipos ADD COLUMN numero_contrato_servicio VARCHAR(255) NULL');

DROP PROCEDURE _sigab_012_add_col_if_missing;
