USE sigab;

-- Primero borramos la llave foranea temporalmente o actualizamos equipos a NULL
UPDATE equipos SET zona_id = NULL;

-- Limpiamos zonas_mapa y reseteamos el autoincrement
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE zonas_mapa;
SET FOREIGN_KEY_CHECKS = 1;

-- Insertar nuevas zonas basadas en todas las areas y pisos de los 751 equipos
INSERT INTO zonas_mapa (nombre, codigo, piso, color_bg, color_borde, orden)
SELECT 
    area, 
    UPPER(SUBSTRING(MD5(CONCAT(area, '_', piso)), 1, 15)), 
    piso,
    '#1e293b', 
    '#334155', 
    1
FROM equipos 
GROUP BY area, piso
HAVING area IS NOT NULL AND area != 'Sin area';

-- Asignar el zona_id a todos los equipos basados en su area y piso
UPDATE equipos e
JOIN zonas_mapa z ON e.area = z.nombre AND e.piso = z.piso
SET e.zona_id = z.id;

-- Crear una zona genérica para los equipos sin area o sin piso
INSERT INTO zonas_mapa (nombre, codigo, piso, color_bg, color_borde, orden)
VALUES ('Otras Áreas', 'OTRAS', 'Sin piso', '#0f172a', '#1e293b', 99);

-- Asignar equipos restantes a 'Otras Áreas'
UPDATE equipos 
SET zona_id = (SELECT id FROM zonas_mapa WHERE codigo = 'OTRAS' LIMIT 1)
WHERE zona_id IS NULL;

-- Revisar conteo final
SELECT z.piso, z.nombre, COUNT(e.id) as total_equipos
FROM zonas_mapa z
LEFT JOIN equipos e ON e.zona_id = z.id
GROUP BY z.id, z.piso, z.nombre
ORDER BY z.piso, total_equipos DESC LIMIT 10;
