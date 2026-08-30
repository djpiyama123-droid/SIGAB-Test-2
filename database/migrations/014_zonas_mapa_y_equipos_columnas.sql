-- Migración 014: tabla `zonas_mapa` y columnas de `equipos` para el mapa de
-- zonas y otros campos que el código YA usa pero que no tienen creación
-- versionada en database/ (ni aquí ni en sigab-backend/alembic/versions/):
--
--   - zonas_mapa            NO existe como CREATE TABLE en ningún lado del
--     repo. database/migrations/generate_all_zones.sql hace
--     `TRUNCATE TABLE zonas_mapa` asumiendo que ya existe, y
--     sigab-backend/models/mapa.py (ZonasMapa) la define en SQLModel, pero
--     nadie la crea en un entorno limpio (setup.sh revienta con
--     "Table 'sigah.zonas_mapa' doesn't exist" en cuanto se corre
--     generate_all_zones.sql o se pega la migración a mano).
--   - equipos.zona_id, pos_x, pos_y, imagen_url, tipo_equipo,
--     clase_cofepris, fecha_compra, qr_token: usadas en
--     sigab-backend/models/equipo.py, routes/equipos.py y routes/dashboard.py,
--     sin ADD COLUMN en ningún .sql ni en alembic/versions/.
--   - equipos.tipo_adquisicion, contrato_pdf_url, hojas_servicio_urls: SÍ
--     tienen migración alembic (fb21941638ba) para prod, pero no un
--     equivalente aquí para que setup.sh arme un entorno local completo.
--
-- Excluye a propósito `equipos.tenant_id` / tabla `hospitales`: esa es la
-- pieza de multi-tenancy (alembic a1b2c3d4e5f6) y requiere decidir qué
-- hospital/tenant usa el piloto de una sola clínica — no se inventa aquí.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS + el mismo patrón de
-- "ADD COLUMN si falta" que 012/013 (chequeo contra INFORMATION_SCHEMA).

USE sigah;

CREATE TABLE IF NOT EXISTS zonas_mapa (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(255) NOT NULL,
  codigo       VARCHAR(255) NOT NULL,
  piso         VARCHAR(20)  NULL,
  color_bg     VARCHAR(20)  NOT NULL DEFAULT '#1e293b',
  color_borde  VARCHAR(20)  NOT NULL DEFAULT '#334155',
  orden        INT          NOT NULL DEFAULT 0,
  activa       TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uq_zonas_mapa_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE PROCEDURE _sigab_014_add_col_if_missing(
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

CALL _sigab_014_add_col_if_missing('equipos', 'zona_id',
  'ALTER TABLE equipos ADD COLUMN zona_id INT UNSIGNED NULL, ADD CONSTRAINT fk_equipos_zona FOREIGN KEY (zona_id) REFERENCES zonas_mapa(id) ON DELETE SET NULL');

CALL _sigab_014_add_col_if_missing('equipos', 'pos_x',
  'ALTER TABLE equipos ADD COLUMN pos_x FLOAT NOT NULL DEFAULT 50.0');

CALL _sigab_014_add_col_if_missing('equipos', 'pos_y',
  'ALTER TABLE equipos ADD COLUMN pos_y FLOAT NOT NULL DEFAULT 50.0');

CALL _sigab_014_add_col_if_missing('equipos', 'imagen_url',
  'ALTER TABLE equipos ADD COLUMN imagen_url VARCHAR(255) NULL');

CALL _sigab_014_add_col_if_missing('equipos', 'tipo_equipo',
  'ALTER TABLE equipos ADD COLUMN tipo_equipo VARCHAR(50) NOT NULL DEFAULT ''otro''');

CALL _sigab_014_add_col_if_missing('equipos', 'clase_cofepris',
  'ALTER TABLE equipos ADD COLUMN clase_cofepris VARCHAR(10) NOT NULL DEFAULT ''II''');

CALL _sigab_014_add_col_if_missing('equipos', 'fecha_compra',
  'ALTER TABLE equipos ADD COLUMN fecha_compra DATE NULL');

CALL _sigab_014_add_col_if_missing('equipos', 'qr_token',
  'ALTER TABLE equipos ADD COLUMN qr_token VARCHAR(255) NULL, ADD KEY idx_equipos_qr_token (qr_token)');

CALL _sigab_014_add_col_if_missing('equipos', 'tipo_adquisicion',
  'ALTER TABLE equipos ADD COLUMN tipo_adquisicion ENUM(''recurso_propio'',''contrato_consolidado'',''garantia'',''subrogado'') NULL');

CALL _sigab_014_add_col_if_missing('equipos', 'contrato_pdf_url',
  'ALTER TABLE equipos ADD COLUMN contrato_pdf_url VARCHAR(255) NULL');

CALL _sigab_014_add_col_if_missing('equipos', 'hojas_servicio_urls',
  'ALTER TABLE equipos ADD COLUMN hojas_servicio_urls TEXT NULL');

DROP PROCEDURE _sigab_014_add_col_if_missing;
