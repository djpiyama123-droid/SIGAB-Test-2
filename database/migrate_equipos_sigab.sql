USE sigab;

ALTER TABLE equipos ADD COLUMN numero_inventario VARCHAR(45) NULL;
ALTER TABLE equipos ADD COLUMN unidad VARCHAR(100) NULL;
ALTER TABLE equipos ADD COLUMN foto_path VARCHAR(255) NULL;
ALTER TABLE equipos ADD COLUMN observaciones TEXT NULL;

INSERT IGNORE INTO sigab.equipos (serie,marca,modelo,nombre,numero_inventario,piso,area,unidad,estado,criticidad,fecha_instalacion,foto_path,observaciones)
SELECT e.Serie,COALESCE(e.Marca,'Sin marca'),COALESCE(e.Modelo,'Sin modelo'),COALESCE(e.Nombre,'Sin nombre'),e.Clave,COALESCE(e.Piso,'Sin piso'),COALESCE(e.Area,'Sin area'),COALESCE(e.Unidad,'H.G.R. No.1 IMSS'),'operativo','media',CASE WHEN e.YrCompra IS NOT NULL THEN MAKEDATE(e.YrCompra,1) ELSE NULL END,e.ruta_equipo,e.Observaciones
FROM dummyequipomedicoimss.equipomedico e;

UPDATE sigab.equipos eq JOIN (SELECT m.Serie,MAX(m.FechaServicio) AS ultimo FROM dummyequipomedicoimss.mantenimientos m WHERE m.FechaServicio IS NOT NULL GROUP BY m.Serie) h ON h.Serie=eq.serie SET eq.fecha_ultimo_mantenimiento=h.ultimo WHERE eq.fecha_ultimo_mantenimiento IS NULL;

INSERT IGNORE INTO sigab.ubicaciones (nombre,piso,area,unidad)
SELECT DISTINCT CONCAT(COALESCE(e.Piso,'?'),' - ',COALESCE(e.Area,'?')),COALESCE(e.Piso,'Sin piso'),COALESCE(e.Area,'Sin area'),COALESCE(e.Unidad,'H.G.R. No.1 IMSS')
FROM dummyequipomedicoimss.equipomedico e WHERE e.Piso IS NOT NULL OR e.Area IS NOT NULL;

SELECT COUNT(*) AS total_equipos FROM sigab.equipos;
SELECT piso, area, COUNT(*) AS equipos FROM sigab.equipos GROUP BY piso, area ORDER BY piso, area LIMIT 25;
