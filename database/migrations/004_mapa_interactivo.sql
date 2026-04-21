-- ================================================================
-- SIGAB Migration 004: Mapa Interactivo con Imágenes por Equipo
-- Añade posicionamiento, zonas, tipos y datos visuales
-- ================================================================
USE sigab;

-- 1. Tabla de zonas del mapa hospitalario
CREATE TABLE IF NOT EXISTS zonas_mapa (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  codigo     VARCHAR(50) UNIQUE NOT NULL,
  piso       VARCHAR(30),
  color_bg   VARCHAR(30) DEFAULT '#1e293b',
  color_borde VARCHAR(30) DEFAULT '#334155',
  orden      INT DEFAULT 0,
  activa     BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- 2. Extender tabla equipos con datos del mapa
ALTER TABLE equipos
  ADD COLUMN zona_id       INT UNSIGNED NULL                              COMMENT 'FK a zonas_mapa',
  ADD COLUMN pos_x         DECIMAL(5,2) DEFAULT 50.00                     COMMENT '% horizontal dentro de la zona',
  ADD COLUMN pos_y         DECIMAL(5,2) DEFAULT 50.00                     COMMENT '% vertical dentro de la zona',
  ADD COLUMN imagen_url    VARCHAR(255) NULL                              COMMENT 'Ruta PNG del equipo en /public/equipos/',
  ADD COLUMN tipo_equipo   ENUM(
      'monitor','ventilador','arco_c','anestesia','incubadora',
      'desfibrilador','bomba_infusion','rayos_x','ultrasonido',
      'autoclave','laboratorio','electrocardiografo','otro'
    ) DEFAULT 'otro',
  ADD COLUMN clase_cofepris ENUM('I','II','III') DEFAULT 'II',
  ADD COLUMN fecha_compra  DATE NULL,
  ADD COLUMN numero_contrato_servicio VARCHAR(80) NULL;

-- 3. FK de equipos → zonas_mapa (solo si no existe)
SET @exist = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA='sigab' AND TABLE_NAME='equipos'
  AND CONSTRAINT_NAME='fk_equipo_zona' AND CONSTRAINT_TYPE='FOREIGN KEY');
SET @sql = IF(@exist = 0,
  'ALTER TABLE equipos ADD CONSTRAINT fk_equipo_zona FOREIGN KEY (zona_id) REFERENCES zonas_mapa(id) ON DELETE SET NULL',
  'SELECT "FK ya existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Índices útiles para el mapa
CREATE INDEX idx_equipo_zona  ON equipos(zona_id);
CREATE INDEX idx_equipo_tipo  ON equipos(tipo_equipo);
CREATE INDEX idx_equipo_estado ON equipos(estado);
