-- Migración 010: tabla equipo_documentos (Expediente del Equipo)
-- Liga contratos/órdenes/dictámenes a un equipo por serie/inventario IMSS.
-- Idempotente: re-correr no falla ni duplica (clave única serie+clase+hash).
CREATE TABLE IF NOT EXISTS equipo_documentos (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  equipo_id     INT UNSIGNED NULL,
  serie         VARCHAR(120) NOT NULL,
  inventario    VARCHAR(120) NULL,
  numero_contrato VARCHAR(120) NULL,
  clase         ENUM('contrato','orden','dictamen','bitacora','penalizacion','otro') NOT NULL DEFAULT 'otro',
  formato       ENUM('pdf','xlsx','docx','img','otro') NOT NULL DEFAULT 'otro',
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo  VARCHAR(512) NOT NULL,
  hash_archivo  CHAR(64) NOT NULL,
  origen        VARCHAR(120) NULL,
  tenant_id     INT UNSIGNED NOT NULL DEFAULT 1,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc (serie, clase, hash_archivo),
  KEY idx_equipo (equipo_id),
  KEY idx_serie (serie),
  CONSTRAINT fk_doc_equipo FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
