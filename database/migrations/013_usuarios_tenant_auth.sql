-- Migración 013: columnas de `usuarios` que el modelo SQLModel
-- (sigab-backend/models/usuario.py) ya define pero que no tienen migración
-- versionada en database/migrations/ ni en el esquema base:
--   - tenant_id               (multi-tenant, default 1, sin FK en el modelo)
--   - password_hash           (login con contraseña)
--   - last_login              (auditoría de acceso)
--   - must_change_password    (forzar cambio en primer login)
--
-- Sin estas columnas, cualquier alta/lectura de `usuarios` que las toque
-- revienta con "Unknown column" en un entorno recién instalado con setup.sh.
-- Idempotente (chequea INFORMATION_SCHEMA antes de cada ADD COLUMN, mismo
-- patrón que 012_equipos_columnas_faltantes.sql) — reintentar corriéndola
-- no duplica ni falla si alguna columna ya existe.

DELIMITER $$

CREATE PROCEDURE _sigab_013_add_col_if_missing(
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

CALL _sigab_013_add_col_if_missing('usuarios', 'tenant_id',
  'ALTER TABLE usuarios ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 1');

CALL _sigab_013_add_col_if_missing('usuarios', 'password_hash',
  'ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255) NULL');

CALL _sigab_013_add_col_if_missing('usuarios', 'last_login',
  'ALTER TABLE usuarios ADD COLUMN last_login DATETIME NULL');

CALL _sigab_013_add_col_if_missing('usuarios', 'must_change_password',
  'ALTER TABLE usuarios ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1');

DROP PROCEDURE _sigab_013_add_col_if_missing;
