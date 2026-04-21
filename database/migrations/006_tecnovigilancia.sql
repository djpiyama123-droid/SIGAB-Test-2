-- ================================================================
-- SIGAB Migration 006: Tecnovigilancia NOM-240-SSA1-2012
-- - Tabla tecnovigilancia_eventos (reporte de eventos adversos)
-- - Tabla tecnovigilancia_evidencias (archivos adjuntos)
-- - ALTER alertas ENUM para incluir tipo tecnovigilancia
-- - Triggers automáticos para alertas críticas y estado de equipo
-- Idempotente para MySQL 8.0+
-- ================================================================
USE sigab;

-- ── 1. EXTENDER ENUM DE ALERTAS ──────────────────────────────────
-- Agregar tipo 'evento_adverso' al ENUM de alertas
ALTER TABLE alertas
  MODIFY COLUMN tipo ENUM(
    'mantenimiento_vencido','mantenimiento_proximo',
    'equipo_fuera_servicio','ticket_abierto_mucho_tiempo',
    'reserva_conflicto','traslado_no_autorizado',
    'evento_adverso'
  ) NOT NULL;

-- ── 2. TABLA PRINCIPAL DE EVENTOS ADVERSOS ───────────────────────
CREATE TABLE IF NOT EXISTS tecnovigilancia_eventos (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_reporte        VARCHAR(40) NOT NULL UNIQUE,

  -- Vínculo con el equipo
  equipo_id             INT UNSIGNED NOT NULL,

  -- Snapshot inalterable del dispositivo al momento del evento (NOM-240)
  dispositivo_nombre    VARCHAR(200) NOT NULL,
  dispositivo_marca     VARCHAR(150),
  dispositivo_modelo    VARCHAR(150),
  dispositivo_serie     VARCHAR(100),
  dispositivo_lote      VARCHAR(100),
  dispositivo_registro_sanitario VARCHAR(100),

  -- Clasificación NOM-240
  tipo_evento           ENUM('muerte','lesion_grave','deterioro_temporal',
                             'riesgo_potencial','falla_funcional') NOT NULL,
  severidad             ENUM('critica','grave','moderada','leve') NOT NULL,

  -- Descripción obligatoria
  fecha_evento          DATETIME NOT NULL,
  lugar_evento          VARCHAR(200),
  descripcion_evento    TEXT NOT NULL,
  consecuencia_clinica  TEXT,
  accion_correctiva     TEXT,

  -- Paciente anonimizado (LFPDPPP: solo sexo/edad)
  paciente_sexo         ENUM('M','F','otro','no_aplica') DEFAULT 'no_aplica',
  paciente_edad         TINYINT UNSIGNED,

  -- Estado del dispositivo post-evento
  dispositivo_estado_post ENUM('operativo','retirado','cuarentena','destruido','en_investigacion'),

  -- State machine del reporte
  estado                ENUM('reportado','en_investigacion','documentado',
                             'escalado_cofepris','cerrado','cancelado')
                        NOT NULL DEFAULT 'reportado',

  -- Actores
  reportado_por_id      INT UNSIGNED NOT NULL,
  investigador_id       INT UNSIGNED NULL,

  -- Hallazgos de investigación
  hallazgos             TEXT,
  causa_raiz            TEXT,
  fecha_investigacion   DATETIME NULL,

  -- Escalado regulatorio
  enviado_cofepris      BOOLEAN DEFAULT FALSE,
  fecha_envio_cofepris  DATETIME NULL,
  folio_cofepris        VARCHAR(100) NULL,

  -- Cierre
  fecha_cierre          DATETIME NULL,
  conclusion            TEXT,

  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tv_estado    (estado),
  INDEX idx_tv_severidad (severidad),
  INDEX idx_tv_equipo    (equipo_id),
  INDEX idx_tv_fecha     (fecha_evento),
  INDEX idx_tv_numero    (numero_reporte),

  FOREIGN KEY (equipo_id)         REFERENCES equipos(id)    ON DELETE RESTRICT,
  FOREIGN KEY (reportado_por_id)  REFERENCES usuarios(id),
  FOREIGN KEY (investigador_id)   REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. TABLA DE EVIDENCIAS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tecnovigilancia_evidencias (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  evento_id       INT UNSIGNED NOT NULL,
  ruta_archivo    VARCHAR(500) NOT NULL,
  tipo            ENUM('foto_dispositivo','reporte_clinico','bitacora',
                       'comunicacion_fabricante','otro') DEFAULT 'otro',
  descripcion     VARCHAR(255),
  subido_por_id   INT UNSIGNED,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (evento_id)     REFERENCES tecnovigilancia_eventos(id) ON DELETE CASCADE,
  FOREIGN KEY (subido_por_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. TRIGGER: al crear evento con severidad critica/grave ──────
-- Inserta alerta crítica y pone equipo fuera_servicio
DROP TRIGGER IF EXISTS trg_tv_evento_insert;
DELIMITER //
CREATE TRIGGER trg_tv_evento_insert
AFTER INSERT ON tecnovigilancia_eventos
FOR EACH ROW
BEGIN
  -- Alerta automática para eventos críticos o graves
  IF NEW.severidad IN ('critica', 'grave') THEN
    INSERT INTO alertas (tipo, equipo_id, mensaje, prioridad, usuario_destino_id)
    SELECT
      'evento_adverso',
      NEW.equipo_id,
      CONCAT('EVENTO ADVERSO ', UPPER(NEW.severidad), ': ', NEW.dispositivo_nombre,
             ' — ', LEFT(NEW.descripcion_evento, 120), ' [', NEW.numero_reporte, ']'),
      'critica',
      u.id
    FROM usuarios u WHERE u.rol = 'jefe_conservacion' AND u.activo = TRUE
    LIMIT 1;

    -- Poner equipo fuera de servicio automáticamente
    UPDATE equipos SET estado = 'fuera_servicio' WHERE id = NEW.equipo_id;
  END IF;
END//
DELIMITER ;

-- ── 5. TRIGGER: al escalar a COFEPRIS ────────────────────────────
DROP TRIGGER IF EXISTS trg_tv_evento_escalado;
DELIMITER //
CREATE TRIGGER trg_tv_evento_escalado
AFTER UPDATE ON tecnovigilancia_eventos
FOR EACH ROW
BEGIN
  IF NEW.estado = 'escalado_cofepris' AND OLD.estado != 'escalado_cofepris' THEN
    INSERT INTO alertas (tipo, equipo_id, mensaje, prioridad, usuario_destino_id)
    SELECT
      'evento_adverso',
      NEW.equipo_id,
      CONCAT('ESCALADO A COFEPRIS: ', NEW.dispositivo_nombre,
             ' — Folio: ', COALESCE(NEW.folio_cofepris, 'pendiente'),
             ' [', NEW.numero_reporte, ']'),
      'critica',
      u.id
    FROM usuarios u WHERE u.rol = 'jefe_conservacion' AND u.activo = TRUE
    LIMIT 1;
  END IF;
END//
DELIMITER ;
