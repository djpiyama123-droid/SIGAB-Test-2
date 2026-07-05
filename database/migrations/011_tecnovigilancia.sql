-- Migración 011: tablas tecnovigilancia_eventos y tecnovigilancia_evidencias
-- Gestión de eventos adversos NOM-240-SSA1-2012 (ver sigab-backend/routes/tecnovigilancia.py).
-- Estas tablas nunca se crearon en producción -- el código ya las consulta y
-- fallaba con "Table 'sigab.tecnovigilancia_eventos' doesn't exist" (500 en
-- /api/tecnovigilancia/ y en el chat del Copilot, que arma un resumen de contexto
-- leyendo esta tabla antes de invocar al modelo).
-- Idempotente: re-correr no falla ni duplica.
CREATE TABLE IF NOT EXISTS tecnovigilancia_eventos (
  id                              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_reporte                  VARCHAR(60) NOT NULL,
  equipo_id                       INT UNSIGNED NULL,
  tenant_id                       INT UNSIGNED NOT NULL DEFAULT 1,
  dispositivo_nombre              VARCHAR(255) NULL,
  dispositivo_marca               VARCHAR(120) NULL,
  dispositivo_modelo              VARCHAR(120) NULL,
  dispositivo_serie               VARCHAR(120) NULL,
  dispositivo_lote                VARCHAR(120) NULL,
  dispositivo_registro_sanitario  VARCHAR(120) NULL,
  tipo_evento           ENUM('muerte','lesion_grave','deterioro_temporal','riesgo_potencial','falla_funcional') NOT NULL,
  severidad             ENUM('critica','grave','moderada','leve') NOT NULL,
  fecha_evento          DATETIME NOT NULL,
  lugar_evento          VARCHAR(255) NULL,
  descripcion_evento    TEXT NOT NULL,
  consecuencia_clinica  TEXT NULL,
  accion_correctiva     TEXT NULL,
  paciente_sexo         VARCHAR(20) NOT NULL DEFAULT 'no_aplica',
  paciente_edad         INT UNSIGNED NULL,
  dispositivo_estado_post VARCHAR(60) NULL,
  reportado_por_id      INT UNSIGNED NULL,
  estado                ENUM('reportado','en_investigacion','documentado','escalado_cofepris','cerrado','cancelado') NOT NULL DEFAULT 'reportado',
  hallazgos             TEXT NULL,
  causa_raiz            TEXT NULL,
  investigador_id       INT UNSIGNED NULL,
  fecha_investigacion   DATETIME NULL,
  enviado_cofepris      TINYINT(1) NOT NULL DEFAULT 0,
  fecha_envio_cofepris  DATETIME NULL,
  folio_cofepris        VARCHAR(120) NULL,
  conclusion            TEXT NULL,
  fecha_cierre          DATETIME NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tv_numero_reporte (numero_reporte),
  KEY idx_tv_equipo (equipo_id),
  KEY idx_tv_tenant (tenant_id),
  KEY idx_tv_estado (estado),
  KEY idx_tv_reportado_por (reportado_por_id),
  KEY idx_tv_investigador (investigador_id),
  CONSTRAINT fk_tv_equipo FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL,
  CONSTRAINT fk_tv_reportado_por FOREIGN KEY (reportado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_tv_investigador FOREIGN KEY (investigador_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tecnovigilancia_evidencias (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento_id      INT UNSIGNED NOT NULL,
  ruta_archivo   VARCHAR(512) NOT NULL,
  tipo           VARCHAR(60) NOT NULL DEFAULT 'otro',
  descripcion    VARCHAR(255) NULL,
  subido_por_id  INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tve_evento (evento_id),
  CONSTRAINT fk_tve_evento FOREIGN KEY (evento_id) REFERENCES tecnovigilancia_eventos(id) ON DELETE CASCADE,
  CONSTRAINT fk_tve_subido_por FOREIGN KEY (subido_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
