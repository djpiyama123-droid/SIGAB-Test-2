-- Migration 009: agregar campo tipo_adquisicion a tabla equipos
-- Fecha: 2026-06-26
-- Autor: Hermes Agent (orquestador), OpenCode auditor
-- Descripcion: el modelo equipos no tiene tipo_adquisicion (recurso_propio,
--   contrato_consolidado, garantia, subrogado). El extractor_usb.py genera
--   metadata con este campo. Necesario para clasificar los 800+ equipos
--   del HGR No.1 que se importan desde la carpeta 2026.
--
-- Idempotente: puede correr 2 veces sin error.
-- Engine: InnoDB, charset utf8mb4 (consistente con resto de la BD).

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'equipos'
       AND COLUMN_NAME = 'tipo_adquisicion') > 0,
    'SELECT 1', -- ya existe, no hacer nada
    'ALTER TABLE equipos ADD COLUMN tipo_adquisicion ENUM(''recurso_propio'', ''contrato_consolidado'', ''garantia'', ''subrogado'') NULL DEFAULT NULL AFTER proveedor_servicio'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Opcional: crear indice para queries por tipo
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'equipos'
       AND INDEX_NAME = 'idx_equipos_tipo_adquisicion') > 0,
    'SELECT 1',
    'CREATE INDEX idx_equipos_tipo_adquisicion ON equipos(tipo_adquisicion)'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
