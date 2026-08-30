-- Migración 015: elimina 2 columnas legacy muertas de `equipos`, confirmadas
-- sin uso en el código (models/equipo.py, routes/equipos.py, ningún grep en
-- todo el repo) y sin datos que valga la pena conservar en el esquema:
--
--   - cobertura: 0/751 equipos con dato (BD real del ThinkCentre, 2026-08-29).
--     Nunca hubo código que la leyera ni la escribiera.
--   - observaciones: 6/751 equipos con dato. Contenido real (repuesto,
--     desinstalación, traspaso) respaldado en
--     ~/orca-workspace/REPORTE-PENDIENTES-2026-08-29.md antes de dropear.
--
-- Las otras 3 columnas legacy revisadas en la misma sesión (numero_inventario,
-- unidad, foto_path) NO se tocan aquí: tienen datos reales sin decisión
-- tomada todavía (foto_path en particular es un hallazgo de fotos huérfanas
-- pendiente de PR separado, ver el mismo reporte).

USE sigah;

ALTER TABLE equipos DROP COLUMN cobertura;
ALTER TABLE equipos DROP COLUMN observaciones;
