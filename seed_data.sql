-- ================================================================
-- SIGAB SEED DATA v1.0 — Datos reales del HGR No.1
-- Ejecutar DESPUÉS de sigab_schema.sql
-- ================================================================

SET NAMES utf8mb4;

-- Ubicaciones
INSERT INTO ubicaciones (nombre, piso, area) VALUES
('Quirófano', 'Segundo', 'Quirófano'),
('Urgencias', 'Primero', 'Urgencias'),
('UCIN', 'Segundo', 'UCIN'),
('Terapias', 'Segundo', 'Terapias'),
('Clínica de Mamá', NULL, 'Clínica de Mamá'),
('Hospitalización', 'Tercero', 'Hospitalización'),
('Anestesiología', 'Segundo', 'Anestesiología'),
('Almacén Biomédica', 'Primero', 'Almacén'),
('Tococirugía', 'Primero', 'Tococirugía'),
('Recuperación', 'Segundo', 'Recuperación'),
('Central de Equipos', 'Primero', 'Central de Equipos')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Usuarios (del equipo real)
INSERT INTO usuarios (nombre, matricula, rol, whatsapp) VALUES
('Félix Sainz', NULL, 'biomedico', NULL),
('Carlos Oswaldo Ramírez González', '99024980', 'jefe_conservacion', NULL),
('Jonathan Miguel Bautista García', NULL, 'biomedico', '6646270963'),
('Gustavo López Carballo', NULL, 'admin', NULL)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Actualizar equipos existentes con campos nuevos
UPDATE equipos SET estado = 'operativo', criticidad = 'alta' WHERE serie = '82-0751';
UPDATE equipos SET estado = 'operativo', criticidad = 'alta' WHERE serie = '82-0745';
UPDATE equipos SET estado = 'operativo', criticidad = 'alta' WHERE serie = '82-0744';

-- Equipos de los PDFs que tal vez no estén en la tabla
INSERT IGNORE INTO equipos (serie, inventario, nombre, marca, modelo, ubicacion, piso, area, estado, criticidad, numero_contrato)
VALUES
('SK416381232HA', NULL, 'Monitor de Signos Vitales', 'GE', 'CARESCAPE B650', 'Hospital General Regional No.1', 'Segundo', 'Quirófano', 'operativo', 'alta', NULL),
('STF244011695A', NULL, 'Monitor de Signos Vitales', 'GE', 'CARESCAPE B650', 'Hospital General Regional No.1', 'Segundo', 'Quirófano', 'operativo', 'alta', NULL),
('MB203775', NULL, 'Ventilador Neonatal Pediátrico Adulto', 'Vyaire Medical', 'Bellavista 1000', 'Hospital General Regional No.1', NULL, NULL, 'en_mantenimiento', 'alta', '050GYR019N09125-019-00');

-- Órdenes de servicio reales (de los PDFs)
INSERT INTO ordenes_servicio
(numero_orden, tipo_formato, equipo_serie, equipo_nombre, equipo_marca, equipo_modelo, ubicacion_fisica, tipo_mantenimiento, tipo_atencion, falla_reportada, descripcion_servicio, observaciones, tecnico_nombre, fecha, estado, origen, empresa_externa, folio_externo, no_contrato)
VALUES
('MC-20260326-001', 'correctivo_corto', NULL, 'Incubadora Dual', NULL, NULL, 'UCIN', 'correctivo', 'interno',
 'Ajuste de ventilador y reparación de humidificador',
 'Se realiza ajuste de ventilador de doble núcleo y reparación de humidificador. Se revisa humificador para distribución de aire y se revisa ventilador para distribución funcional.',
 'Se realiza ajuste de ventilador para distribución de aire funcional.',
 'Félix Sainz', '2026-03-26', 'cerrada', 'manual', NULL, NULL, NULL),

('MC-20260113-001', 'correctivo_largo', NULL, 'Silla de Estereotaxia', NULL, NULL, 'Clínica de Mamá', 'correctivo', 'interno',
 NULL,
 'Se realiza remplazo de pistón. Se realiza reparación de mecanismo de elevación. Se realiza reparación de brazaderas. Se realiza lubricación del sistema.',
 'Se realiza reparación del sistema de silla de estereotaxia. Equipo queda funcional al 100% para lo que fue diseñado.',
 NULL, '2026-01-13', 'cerrada', 'manual', NULL, NULL, NULL),

('OES-20260324-001', 'orden_entrega', NULL, 'Monitor de Signos Vitales', 'GE', 'CARESCAPE B650', 'QX 2DO PISO', 'correctivo', 'contrato',
 'Pantalla quebrada',
 'Limpieza general del equipo. Remplazo de pantalla LCD y frame dañada por unidad nueva compatible. Aseguramiento mecánico y reconexión de cableado. Verificación de funcionamiento de pantalla. Validación de alarmas. Pruebas de respuesta de táctil y botones. Remplazo freeze button. Verificación de funcionalidad general. Validación de parámetros estables de ECG, SPO2 y NIBP.',
 'Se realiza mantenimiento correctivo en el área de quirófano. Equipo funcionando correctamente para lo que fue diseñado.',
 'Félix Sainz', '2026-03-24', 'cerrada', 'manual', NULL, NULL, NULL),

('RSE-I260407', 'reporte_externo', NULL, 'Ventilador Neonatal Pediátrico Adulto', 'Vyaire Medical', 'Bellavista 1000', NULL, 'correctivo', 'contrato',
 'Pantalla parpadea', NULL, NULL,
 'Jonathan Bautista', '2026-03-24', 'abierta', 'manual',
 'Servicios de Ingeniería en Medicina S.A. de C.V.', 'I26-0407', '050GYR019N09125-019-00');

-- Materiales usados (de los PDFs)
INSERT INTO os_materiales (orden_id, descripcion, cantidad) VALUES
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'MC-20260326-001'), 'Pegamento', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'MC-20260326-001'), 'Desarmador', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'MC-20260113-001'), 'Pistón nuevo 3/4', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'MC-20260113-001'), 'Tornillos sin fin 1/4', 2),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'MC-20260113-001'), 'Tuercas 1/4', 2),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'MC-20260113-001'), 'Lubricante WD-40', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'OES-20260324-001'), 'Pantalla y frame nuevo', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'OES-20260324-001'), 'Freeze button nuevo', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'OES-20260324-001'), 'Antibacterial', 1),
((SELECT id FROM ordenes_servicio WHERE numero_orden = 'OES-20260324-001'), 'Gasas', 1);

-- Preventivos programados de ejemplo
INSERT INTO preventivos_programados (equipo_id, tipo_preventivo, frecuencia_dias, proxima_ejecucion, descripcion_procedimiento)
SELECT id, 'Limpieza general y calibración', 90, DATE_ADD(CURDATE(), INTERVAL 15 DAY),
'Limpieza exterior e interior, verificación de parámetros, calibración de sensores, pruebas de funcionamiento.'
FROM equipos WHERE serie = 'SK416381232HA' LIMIT 1;

INSERT INTO preventivos_programados (equipo_id, tipo_preventivo, frecuencia_dias, proxima_ejecucion, descripcion_procedimiento)
SELECT id, 'Revisión anual completa', 365, DATE_ADD(CURDATE(), INTERVAL -2 DAY),
'Revisión mecánica completa, cambio de filtros, calibración de flujos, pruebas de alarmas, verificación eléctrica.'
FROM equipos WHERE serie = 'MB203775' LIMIT 1;

-- Refacciones en almacén
INSERT INTO refacciones_almacen (nombre, codigo_interno, compatible_con_modelo, cantidad_disponible, cantidad_minima, ubicacion_almacen, proveedor) VALUES
('Pantalla LCD 15" táctil', 'LCD-15-T01', 'CARESCAPE B650', 2, 1, 'Estante A-3', 'GE Healthcare'),
('Sensor SpO2 adulto', 'SPO2-A01', 'CARESCAPE B650,Bellavista 1000', 5, 3, 'Estante B-1', 'Varios'),
('Filtro HEPA ventilador', 'FLT-HEPA-01', 'Bellavista 1000', 3, 2, 'Estante C-2', 'Vyaire Medical'),
('Cable ECG 5 derivaciones', 'ECG-5D-01', 'CARESCAPE B650', 4, 2, 'Estante B-2', 'GE Healthcare'),
('Freeze button GE', 'BTN-FRZ-01', 'CARESCAPE B650', 1, 1, 'Estante A-3', 'GE Healthcare'),
('Pistón hidráulico 3/4', 'PST-34-01', NULL, 2, 1, 'Estante D-1', 'Nacional'),
('Lubricante WD-40 400ml', 'LUB-WD40', NULL, 6, 3, 'Estante E-1', 'WD-40 Company');
