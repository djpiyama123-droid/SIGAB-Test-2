-- ================================================================
-- SIGAB SCHEMA v1.0 — MySQL 8+
-- Sistema Integral de Gestión de Activos Biomédicos
-- HGR No.1 IMSS Tijuana — 100% On-Premise
-- Ejecutar en orden, respeta foreign keys
-- ================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 1. EXTENDER tabla equipos existente
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS estado ENUM('operativo','en_mantenimiento','fuera_servicio','baja','en_traslado') DEFAULT 'operativo',
  ADD COLUMN IF NOT EXISTS criticidad ENUM('alta','media','baja') DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS fecha_instalacion DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_ultimo_mantenimiento DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_proximo_mantenimiento DATE NULL,
  ADD COLUMN IF NOT EXISTS vida_util_anios INT NULL,
  ADD COLUMN IF NOT EXISTS numero_contrato VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS proveedor_servicio VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS qr_code_path VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_equipos_serie ON equipos(serie);
CREATE INDEX IF NOT EXISTS idx_equipos_estado ON equipos(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_area ON equipos(area);
CREATE INDEX IF NOT EXISTS idx_equipos_piso ON equipos(piso);

-- 2. UBICACIONES (catálogo normalizado)
CREATE TABLE IF NOT EXISTS ubicaciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  piso VARCHAR(20),
  area VARCHAR(100),
  unidad VARCHAR(100) DEFAULT 'H.G.R. 1',
  delegacion VARCHAR(50) DEFAULT 'B.C.',
  clave_unidad VARCHAR(20) DEFAULT '020502142902',
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. USUARIOS del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  matricula VARCHAR(20) UNIQUE,
  rol ENUM('biomedico','jefe_biomedica','jefe_conservacion','jefe_servicio','almacen','supervisor','admin') NOT NULL,
  telefono VARCHAR(15),
  whatsapp VARCHAR(15),
  email VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TRAZABILIDAD — Historial de movimientos/traslados
CREATE TABLE IF NOT EXISTS trazabilidad (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT UNSIGNED NOT NULL,
  ubicacion_origen_id INT UNSIGNED NULL,
  ubicacion_destino_id INT UNSIGNED NULL,
  piso_origen VARCHAR(20),
  area_origen VARCHAR(100),
  piso_destino VARCHAR(20),
  area_destino VARCHAR(100),
  motivo VARCHAR(255),
  usuario_id INT UNSIGNED NULL,
  fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
  FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_trazabilidad_equipo ON trazabilidad(equipo_id);
CREATE INDEX IF NOT EXISTS idx_trazabilidad_fecha ON trazabilidad(fecha_movimiento);

-- 5. RESERVAS de equipos por área/piso
CREATE TABLE IF NOT EXISTS reservas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT UNSIGNED NOT NULL,
  ubicacion_id INT UNSIGNED NULL,
  area_reserva VARCHAR(100) NOT NULL,
  piso_reserva VARCHAR(20),
  solicitante_id INT UNSIGNED NULL,
  fecha_inicio DATETIME NOT NULL,
  fecha_fin DATETIME NULL,
  motivo VARCHAR(255),
  estado ENUM('pendiente','activa','completada','cancelada') DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ORDENES DE SERVICIO (unifica los 4 tipos de formato)
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_orden VARCHAR(30) UNIQUE,
  tipo_formato ENUM('correctivo_corto','correctivo_largo','orden_entrega','reporte_externo') NOT NULL,

  -- Datos del equipo
  equipo_id INT UNSIGNED NULL,
  equipo_nombre VARCHAR(150),
  equipo_marca VARCHAR(100),
  equipo_modelo VARCHAR(100),
  equipo_serie VARCHAR(100),

  -- Ubicación
  ubicacion_fisica VARCHAR(150),
  piso VARCHAR(20),
  area VARCHAR(100),

  -- Datos del servicio
  tipo_mantenimiento ENUM('correctivo','preventivo','instalacion','traslado','entrega','calibracion') NOT NULL,
  tipo_atencion ENUM('interno','contrato','garantia','demanda') DEFAULT 'interno',
  falla_reportada TEXT,
  descripcion_servicio TEXT,
  condiciones_encontradas TEXT,
  condicion_final TEXT,
  observaciones TEXT,
  recomendaciones TEXT,

  -- Tiempos
  fecha DATE NOT NULL,
  hora_inicio TIME NULL,
  hora_termino TIME NULL,
  tiempo_estimado_hrs DECIMAL(5,2) NULL,
  tiempo_real_hrs DECIMAL(5,2) NULL,

  -- Personal
  tecnico_id INT UNSIGNED NULL,
  tecnico_nombre VARCHAR(150),
  empresa_externa VARCHAR(150) NULL,
  folio_externo VARCHAR(50) NULL,
  no_contrato VARCHAR(50) NULL,
  reporta_nombre VARCHAR(150) NULL,

  -- Firmas/conformidad
  jefe_servicio VARCHAR(150) NULL,
  jefe_conservacion VARCHAR(150) NULL,
  recibe_conformidad_nombre VARCHAR(150) NULL,
  recibe_conformidad_matricula VARCHAR(20) NULL,
  entrega_nombre VARCHAR(150) NULL,
  entrega_matricula VARCHAR(20) NULL,

  -- Estado del ticket
  estado ENUM('abierta','en_progreso','cerrada','cancelada') DEFAULT 'abierta',
  prioridad ENUM('critica','alta','media','baja') DEFAULT 'media',
  origen ENUM('whatsapp','dashboard','manual','openclaw') DEFAULT 'manual',

  -- Metadatos
  clave_formato VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,

  FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  FOREIGN KEY (tecnico_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_os_estado ON ordenes_servicio(estado);
CREATE INDEX IF NOT EXISTS idx_os_equipo ON ordenes_servicio(equipo_id);
CREATE INDEX IF NOT EXISTS idx_os_fecha ON ordenes_servicio(fecha);
CREATE INDEX IF NOT EXISTS idx_os_tipo ON ordenes_servicio(tipo_mantenimiento);

-- 7. MATERIALES/REFACCIONES usados por orden
CREATE TABLE IF NOT EXISTS os_materiales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  orden_id INT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  cantidad INT DEFAULT 1,
  FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. EVIDENCIA FOTOGRÁFICA por orden
CREATE TABLE IF NOT EXISTS os_evidencias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  orden_id INT UNSIGNED NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tipo ENUM('antes','despues','durante','equipo','documento') DEFAULT 'durante',
  descripcion VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. MANTENIMIENTOS PREVENTIVOS PROGRAMADOS
CREATE TABLE IF NOT EXISTS preventivos_programados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT UNSIGNED NOT NULL,
  tipo_preventivo VARCHAR(100) NOT NULL,
  frecuencia_dias INT NOT NULL DEFAULT 90,
  ultima_ejecucion DATE NULL,
  proxima_ejecucion DATE NOT NULL,
  tecnico_asignado_id INT UNSIGNED NULL,
  descripcion_procedimiento TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  FOREIGN KEY (tecnico_asignado_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_prev_proxima ON preventivos_programados(proxima_ejecucion);
CREATE INDEX IF NOT EXISTS idx_prev_equipo ON preventivos_programados(equipo_id);

-- 10. ALERTAS Y NOTIFICACIONES
CREATE TABLE IF NOT EXISTS alertas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('mantenimiento_vencido','mantenimiento_proximo','equipo_fuera_servicio','ticket_abierto_mucho_tiempo','reserva_conflicto','traslado_no_autorizado') NOT NULL,
  equipo_id INT UNSIGNED NULL,
  orden_id INT UNSIGNED NULL,
  mensaje TEXT NOT NULL,
  prioridad ENUM('critica','alta','media','baja') DEFAULT 'media',
  leida BOOLEAN DEFAULT FALSE,
  enviada_whatsapp BOOLEAN DEFAULT FALSE,
  usuario_destino_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id) REFERENCES equipos(id),
  FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id),
  FOREIGN KEY (usuario_destino_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_alertas_leida ON alertas(leida);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON alertas(tipo);

-- 11. LOG DE ACTIVIDAD (auditoría)
CREATE TABLE IF NOT EXISTS log_actividad (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id INT UNSIGNED NOT NULL,
  accion ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  usuario_id INT UNSIGNED NULL,
  origen ENUM('dashboard','whatsapp','openclaw','sistema','manual') DEFAULT 'sistema',
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  ip_origen VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_log_tabla ON log_actividad(tabla_afectada, registro_id);
CREATE INDEX IF NOT EXISTS idx_log_fecha ON log_actividad(created_at);

-- 12. INVENTARIO DE REFACCIONES (almacén)
CREATE TABLE IF NOT EXISTS refacciones_almacen (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  codigo_interno VARCHAR(50),
  compatible_con_modelo VARCHAR(200) NULL,
  cantidad_disponible INT DEFAULT 0,
  cantidad_minima INT DEFAULT 1,
  ubicacion_almacen VARCHAR(100),
  proveedor VARCHAR(150),
  costo_unitario DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. VISTA PARA DASHBOARD (consulta principal)
CREATE OR REPLACE VIEW v_dashboard_equipos AS
SELECT
  e.id,
  e.serie,
  e.inventario,
  e.nombre,
  e.marca,
  e.modelo,
  e.ubicacion,
  e.piso,
  e.area,
  e.estado,
  e.criticidad,
  e.fecha_proximo_mantenimiento,
  e.fotos,
  (SELECT COUNT(*) FROM ordenes_servicio os WHERE os.equipo_id = e.id AND os.estado IN ('abierta','en_progreso')) AS tickets_abiertos,
  (SELECT MAX(os2.fecha) FROM ordenes_servicio os2 WHERE os2.equipo_id = e.id AND os2.estado = 'cerrada') AS ultimo_mantenimiento,
  (SELECT COUNT(*) FROM alertas a WHERE a.equipo_id = e.id AND a.leida = FALSE) AS alertas_pendientes,
  (SELECT r.area_reserva FROM reservas r WHERE r.equipo_id = e.id AND r.estado = 'activa' LIMIT 1) AS reservado_para
FROM equipos e;

-- 14. VISTA PARA ALERTAS PENDIENTES
CREATE OR REPLACE VIEW v_alertas_pendientes AS
SELECT
  a.*,
  e.nombre AS equipo_nombre,
  e.serie AS equipo_serie,
  e.area AS equipo_area
FROM alertas a
LEFT JOIN equipos e ON a.equipo_id = e.id
WHERE a.leida = FALSE
ORDER BY
  FIELD(a.prioridad, 'critica','alta','media','baja'),
  a.created_at DESC;

-- 15. TRIGGERS: Auto-actualizar estado del equipo al abrir/cerrar OS
DELIMITER //

DROP TRIGGER IF EXISTS trg_os_after_insert//
CREATE TRIGGER trg_os_after_insert AFTER INSERT ON ordenes_servicio
FOR EACH ROW
BEGIN
  IF NEW.tipo_mantenimiento = 'correctivo' AND NEW.estado = 'abierta' AND NEW.equipo_id IS NOT NULL THEN
    UPDATE equipos SET estado = 'en_mantenimiento' WHERE id = NEW.equipo_id;
  END IF;
END//

DROP TRIGGER IF EXISTS trg_os_after_update//
CREATE TRIGGER trg_os_after_update AFTER UPDATE ON ordenes_servicio
FOR EACH ROW
BEGIN
  IF NEW.estado = 'cerrada' AND OLD.estado != 'cerrada' AND NEW.equipo_id IS NOT NULL THEN
    UPDATE equipos
    SET estado = 'operativo',
        fecha_ultimo_mantenimiento = NEW.fecha
    WHERE id = NEW.equipo_id;
  END IF;
END//

-- 16. EVENT: Generar alerta cuando preventivo está por vencer (3 días)
DROP EVENT IF EXISTS evt_check_preventivos//
CREATE EVENT IF NOT EXISTS evt_check_preventivos
ON SCHEDULE EVERY 6 HOUR
DO
BEGIN
  INSERT INTO alertas (tipo, equipo_id, mensaje, prioridad)
  SELECT
    'mantenimiento_proximo',
    pp.equipo_id,
    CONCAT('Mantenimiento preventivo "', pp.tipo_preventivo, '" programado para ', pp.proxima_ejecucion),
    IF(pp.proxima_ejecucion <= CURDATE(), 'critica', 'alta')
  FROM preventivos_programados pp
  WHERE pp.activo = TRUE
    AND pp.proxima_ejecucion <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    AND NOT EXISTS (
      SELECT 1 FROM alertas a
      WHERE a.equipo_id = pp.equipo_id
        AND a.tipo = 'mantenimiento_proximo'
        AND DATE(a.created_at) = CURDATE()
    );
END//

DELIMITER ;
