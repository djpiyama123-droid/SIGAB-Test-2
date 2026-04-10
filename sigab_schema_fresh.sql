-- ================================================================
-- SIGAB SCHEMA v1.2 — Instalación DESDE CERO (fresh install)
-- MySQL 8.0+ — HGR No.1 IMSS Tijuana
-- CORRECCIÓN: CREATE INDEX sin IF NOT EXISTS (no soportado en MySQL)
-- Incluye DROP TABLE en orden inverso para reinstalación limpia
-- ================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET foreign_key_checks = 0;

-- ── Limpieza previa (por si hay tablas viejas) ─────────────────
DROP TABLE IF EXISTS os_evidencias;
DROP TABLE IF EXISTS os_materiales;
DROP TABLE IF EXISTS alertas;
DROP TABLE IF EXISTS preventivos_programados;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS log_actividad;
DROP TABLE IF EXISTS refacciones_almacen;
DROP TABLE IF EXISTS ordenes_servicio;
DROP TABLE IF EXISTS trazabilidad;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS ubicaciones;
DROP TABLE IF EXISTS equipos;
DROP VIEW  IF EXISTS v_dashboard_equipos;
DROP VIEW  IF EXISTS v_alertas_pendientes;

-- ── 1. EQUIPOS (tabla principal) ──────────────────────────────
CREATE TABLE equipos (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  serie            VARCHAR(100)  NOT NULL DEFAULT '',
  inventario       VARCHAR(50)   NULL,
  nombre           VARCHAR(200)  NOT NULL DEFAULT '',
  marca            VARCHAR(100)  NOT NULL DEFAULT '',
  modelo           VARCHAR(150)  NOT NULL DEFAULT '',
  ubicacion        VARCHAR(200)  NOT NULL DEFAULT '',
  piso             VARCHAR(20)   NULL,
  area             VARCHAR(100)  NULL,
  fotos            TEXT          NULL,
  cobertura        VARCHAR(100)  NULL,
  estado           ENUM('operativo','en_mantenimiento','fuera_servicio','baja','en_traslado')
                   NOT NULL DEFAULT 'operativo',
  criticidad       ENUM('alta','media','baja') NOT NULL DEFAULT 'media',
  fecha_instalacion            DATE NULL,
  fecha_ultimo_mantenimiento   DATE NULL,
  fecha_proximo_mantenimiento  DATE NULL,
  vida_util_anios  INT          NULL,
  numero_contrato  VARCHAR(50)  NULL,
  proveedor_servicio VARCHAR(150) NULL,
  qr_code_path     VARCHAR(255) NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipos_serie  (serie),
  INDEX idx_equipos_estado (estado),
  INDEX idx_equipos_area   (area),
  INDEX idx_equipos_piso   (piso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. UBICACIONES ────────────────────────────────────────────
CREATE TABLE ubicaciones (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  piso         VARCHAR(20)  NULL,
  area         VARCHAR(100) NULL,
  unidad       VARCHAR(100) NOT NULL DEFAULT 'H.G.R. 1',
  delegacion   VARCHAR(50)  NOT NULL DEFAULT 'B.C.',
  clave_unidad VARCHAR(20)  NOT NULL DEFAULT '020502142902',
  activa       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. USUARIOS ───────────────────────────────────────────────
CREATE TABLE usuarios (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  matricula  VARCHAR(20)  NULL UNIQUE,
  rol        ENUM('biomedico','jefe_biomedica','jefe_conservacion',
                  'jefe_servicio','almacen','supervisor','admin') NOT NULL,
  telefono   VARCHAR(15)  NULL,
  whatsapp   VARCHAR(15)  NULL,
  email      VARCHAR(100) NULL,
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. TRAZABILIDAD ───────────────────────────────────────────
CREATE TABLE trazabilidad (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id             INT UNSIGNED NOT NULL,
  ubicacion_origen_id   INT UNSIGNED NULL,
  ubicacion_destino_id  INT UNSIGNED NULL,
  piso_origen           VARCHAR(20)  NULL,
  area_origen           VARCHAR(100) NULL,
  piso_destino          VARCHAR(20)  NULL,
  area_destino          VARCHAR(100) NULL,
  motivo                VARCHAR(255) NULL,
  usuario_id            INT UNSIGNED NULL,
  fecha_movimiento      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notas                 TEXT         NULL,
  INDEX idx_trazabilidad_equipo (equipo_id),
  INDEX idx_trazabilidad_fecha  (fecha_movimiento),
  FOREIGN KEY (equipo_id)            REFERENCES equipos(id)    ON DELETE CASCADE,
  FOREIGN KEY (ubicacion_origen_id)  REFERENCES ubicaciones(id),
  FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (usuario_id)           REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. RESERVAS ───────────────────────────────────────────────
CREATE TABLE reservas (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id      INT UNSIGNED NOT NULL,
  ubicacion_id   INT UNSIGNED NULL,
  area_reserva   VARCHAR(100) NOT NULL,
  piso_reserva   VARCHAR(20)  NULL,
  solicitante_id INT UNSIGNED NULL,
  fecha_inicio   DATETIME     NOT NULL,
  fecha_fin      DATETIME     NULL,
  motivo         VARCHAR(255) NULL,
  estado         ENUM('pendiente','activa','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id)      REFERENCES equipos(id),
  FOREIGN KEY (ubicacion_id)   REFERENCES ubicaciones(id),
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. ORDENES DE SERVICIO ────────────────────────────────────
CREATE TABLE ordenes_servicio (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_orden   VARCHAR(30)  NULL UNIQUE,
  tipo_formato   ENUM('correctivo_corto','correctivo_largo',
                      'orden_entrega','reporte_externo') NOT NULL,
  equipo_id      INT UNSIGNED NULL,
  equipo_nombre  VARCHAR(150) NULL,
  equipo_marca   VARCHAR(100) NULL,
  equipo_modelo  VARCHAR(100) NULL,
  equipo_serie   VARCHAR(100) NULL,
  ubicacion_fisica VARCHAR(150) NULL,
  piso           VARCHAR(20)  NULL,
  area           VARCHAR(100) NULL,
  tipo_mantenimiento ENUM('correctivo','preventivo','instalacion',
                          'traslado','entrega','calibracion') NOT NULL,
  tipo_atencion  ENUM('interno','contrato','garantia','demanda') NOT NULL DEFAULT 'interno',
  falla_reportada     TEXT NULL,
  descripcion_servicio TEXT NULL,
  condiciones_encontradas TEXT NULL,
  condicion_final TEXT NULL,
  observaciones   TEXT NULL,
  recomendaciones TEXT NULL,
  fecha          DATE         NOT NULL DEFAULT (CURRENT_DATE),
  hora_inicio    TIME         NULL,
  hora_termino   TIME         NULL,
  tiempo_estimado_hrs DECIMAL(5,2) NULL,
  tiempo_real_hrs     DECIMAL(5,2) NULL,
  tecnico_id     INT UNSIGNED NULL,
  tecnico_nombre VARCHAR(150) NULL,
  empresa_externa VARCHAR(150) NULL,
  folio_externo  VARCHAR(50)  NULL,
  no_contrato    VARCHAR(50)  NULL,
  reporta_nombre VARCHAR(150) NULL,
  jefe_servicio              VARCHAR(150) NULL,
  jefe_conservacion          VARCHAR(150) NULL,
  recibe_conformidad_nombre  VARCHAR(150) NULL,
  recibe_conformidad_matricula VARCHAR(20) NULL,
  entrega_nombre             VARCHAR(150) NULL,
  entrega_matricula          VARCHAR(20)  NULL,
  estado         ENUM('abierta','en_progreso','cerrada','cancelada') NOT NULL DEFAULT 'abierta',
  prioridad      ENUM('critica','alta','media','baja')               NOT NULL DEFAULT 'media',
  origen         ENUM('whatsapp','dashboard','manual','openclaw')    NOT NULL DEFAULT 'manual',
  clave_formato  VARCHAR(30)  NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at      TIMESTAMP    NULL,
  INDEX idx_os_estado (estado),
  INDEX idx_os_equipo (equipo_id),
  INDEX idx_os_fecha  (fecha),
  INDEX idx_os_tipo   (tipo_mantenimiento),
  FOREIGN KEY (equipo_id)  REFERENCES equipos(id),
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. MATERIALES POR ORDEN ───────────────────────────────────
CREATE TABLE os_materiales (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  orden_id    INT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad    INT          NOT NULL DEFAULT 1,
  FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. EVIDENCIA FOTOGRÁFICA ──────────────────────────────────
CREATE TABLE os_evidencias (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  orden_id      INT UNSIGNED NOT NULL,
  ruta_archivo  VARCHAR(500) NOT NULL,
  tipo          ENUM('antes','despues','durante','equipo','documento') NOT NULL DEFAULT 'durante',
  descripcion   VARCHAR(255) NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. PREVENTIVOS PROGRAMADOS ────────────────────────────────
CREATE TABLE preventivos_programados (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id              INT UNSIGNED NOT NULL,
  tipo_preventivo        VARCHAR(100) NOT NULL,
  frecuencia_dias        INT          NOT NULL DEFAULT 90,
  ultima_ejecucion       DATE         NULL,
  proxima_ejecucion      DATE         NOT NULL,
  tecnico_asignado_id    INT UNSIGNED NULL,
  descripcion_procedimiento TEXT       NULL,
  activo                 BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prev_proxima (proxima_ejecucion),
  INDEX idx_prev_equipo  (equipo_id),
  FOREIGN KEY (equipo_id)           REFERENCES equipos(id),
  FOREIGN KEY (tecnico_asignado_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. ALERTAS ───────────────────────────────────────────────
CREATE TABLE alertas (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo                 ENUM('mantenimiento_vencido','mantenimiento_proximo',
                            'equipo_fuera_servicio','ticket_abierto_mucho_tiempo',
                            'reserva_conflicto','traslado_no_autorizado') NOT NULL,
  equipo_id            INT UNSIGNED NULL,
  orden_id             INT UNSIGNED NULL,
  mensaje              TEXT         NOT NULL,
  prioridad            ENUM('critica','alta','media','baja') NOT NULL DEFAULT 'media',
  leida                BOOLEAN      NOT NULL DEFAULT FALSE,
  enviada_whatsapp     BOOLEAN      NOT NULL DEFAULT FALSE,
  usuario_destino_id   INT UNSIGNED NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alertas_leida (leida),
  INDEX idx_alertas_tipo  (tipo),
  FOREIGN KEY (equipo_id)          REFERENCES equipos(id),
  FOREIGN KEY (orden_id)           REFERENCES ordenes_servicio(id),
  FOREIGN KEY (usuario_destino_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. LOG DE ACTIVIDAD ──────────────────────────────────────
CREATE TABLE log_actividad (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tabla_afectada   VARCHAR(50)  NOT NULL,
  registro_id      INT UNSIGNED NOT NULL,
  accion           ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  usuario_id       INT UNSIGNED NULL,
  origen           ENUM('dashboard','whatsapp','openclaw','sistema','manual') NOT NULL DEFAULT 'sistema',
  datos_anteriores JSON         NULL,
  datos_nuevos     JSON         NULL,
  ip_origen        VARCHAR(45)  NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_tabla (tabla_afectada, registro_id),
  INDEX idx_log_fecha (created_at),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. REFACCIONES EN ALMACÉN ────────────────────────────────
CREATE TABLE refacciones_almacen (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                VARCHAR(200) NOT NULL,
  codigo_interno        VARCHAR(50)  NULL,
  compatible_con_modelo VARCHAR(200) NULL,
  cantidad_disponible   INT          NOT NULL DEFAULT 0,
  cantidad_minima       INT          NOT NULL DEFAULT 1,
  ubicacion_almacen     VARCHAR(100) NULL,
  proveedor             VARCHAR(150) NULL,
  costo_unitario        DECIMAL(10,2) NULL,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. VISTA DASHBOARD ───────────────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_equipos AS
SELECT
  e.id, e.serie, e.inventario, e.nombre, e.marca, e.modelo,
  e.ubicacion, e.piso, e.area, e.estado, e.criticidad,
  e.fecha_proximo_mantenimiento, e.fotos,
  (SELECT COUNT(*) FROM ordenes_servicio os
   WHERE os.equipo_id = e.id AND os.estado IN ('abierta','en_progreso'))
   AS tickets_abiertos,
  (SELECT MAX(os2.fecha) FROM ordenes_servicio os2
   WHERE os2.equipo_id = e.id AND os2.estado = 'cerrada')
   AS ultimo_mantenimiento,
  (SELECT COUNT(*) FROM alertas a
   WHERE a.equipo_id = e.id AND a.leida = FALSE)
   AS alertas_pendientes,
  (SELECT r.area_reserva FROM reservas r
   WHERE r.equipo_id = e.id AND r.estado = 'activa' LIMIT 1)
   AS reservado_para
FROM equipos e;

-- ── 14. VISTA ALERTAS PENDIENTES ──────────────────────────────
CREATE OR REPLACE VIEW v_alertas_pendientes AS
SELECT
  a.*,
  e.nombre AS equipo_nombre,
  e.serie  AS equipo_serie,
  e.area   AS equipo_area
FROM alertas a
LEFT JOIN equipos e ON a.equipo_id = e.id
WHERE a.leida = FALSE
ORDER BY
  FIELD(a.prioridad,'critica','alta','media','baja'),
  a.created_at DESC;

-- ── 15. TRIGGERS ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_os_after_insert;
DROP TRIGGER IF EXISTS trg_os_after_update;

DELIMITER //

CREATE TRIGGER trg_os_after_insert AFTER INSERT ON ordenes_servicio
FOR EACH ROW
BEGIN
  IF NEW.tipo_mantenimiento = 'correctivo'
     AND NEW.estado = 'abierta'
     AND NEW.equipo_id IS NOT NULL THEN
    UPDATE equipos SET estado = 'en_mantenimiento' WHERE id = NEW.equipo_id;
  END IF;
END//

CREATE TRIGGER trg_os_after_update AFTER UPDATE ON ordenes_servicio
FOR EACH ROW
BEGIN
  IF NEW.estado = 'cerrada' AND OLD.estado != 'cerrada'
     AND NEW.equipo_id IS NOT NULL THEN
    UPDATE equipos
    SET estado = 'operativo',
        fecha_ultimo_mantenimiento = NEW.fecha
    WHERE id = NEW.equipo_id;
  END IF;
END//

DELIMITER ;

SET foreign_key_checks = 1;

-- ── Verificación final ────────────────────────────────────────
SELECT CONCAT('OK: ', table_name) AS resultado
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
