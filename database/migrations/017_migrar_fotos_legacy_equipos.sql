-- Migración 017: rescata las 3 columnas de fotos legacy de
-- `dummyequipomedicoimss.equipomedico` (ruta_equipo, ruta_serie,
-- ruta_inventario) que nunca llegaron a `equipos.fotos` — la galería real
-- que lee todo el frontend (EquipoForm, EquipoDetail, EquipoTable) y
-- alimenta el badge de "fotos incompletas".
--
-- HALLAZGO (revisando las 14 columnas de dummyequipomedicoimss.equipomedico,
-- todas cruzadas contra equipos):
--   ruta_equipo      (foto del equipo)               690/751 — sí llegó a
--                     equipos.foto_path, pero quedó huérfana ahí (columna
--                     fuera del modelo actual, ver migraciones 015/016).
--   ruta_serie       (foto de la placa de serie)      586/751 — nunca migrada.
--   ruta_inventario  (foto de etiqueta de inventario)  412/751 — nunca migrada.
--
-- `equipos.fotos` es un array JSON de hasta 3 URLs (ver
-- subir_imagenes_equipo en routes/equipos.py ~línea 405); `imagen_url`
-- siempre se sincroniza con fotos[0], por eso el orden es
-- [ruta_equipo, ruta_serie, ruta_inventario] (el equipo va primero). Los
-- 1720 archivos referenciados viven en
-- sigab-backend/static/uploads/FOTOSEQUIPO/ (gitignored, hay que copiarlos
-- a mano al servidor de destino).
--
-- Distribución resultante: 384 equipos quedan con galería completa (3/3),
-- 229 con 2/3, 78 con 1/3, 60 sin ninguna (huérfanos genuinos, sin dato
-- legacy en ninguna de las 3 columnas).
--
-- Requiere que la base `dummyequipomedicoimss` exista en el mismo servidor
-- (igual requisito que database/migrate_equipos_sigab.sql, el import
-- original). Idempotente: solo toca equipos con `fotos` vacío.

USE sigah;

UPDATE equipos e
JOIN dummyequipomedicoimss.equipomedico em ON em.Serie = e.serie
SET
  e.fotos = CONCAT('[', CONCAT_WS(',',
      IF(em.ruta_equipo IS NOT NULL AND em.ruta_equipo != '', JSON_QUOTE(CONCAT('/static/uploads/', em.ruta_equipo)), NULL),
      IF(em.ruta_serie IS NOT NULL AND em.ruta_serie != '', JSON_QUOTE(CONCAT('/static/uploads/', em.ruta_serie)), NULL),
      IF(em.ruta_inventario IS NOT NULL AND em.ruta_inventario != '', JSON_QUOTE(CONCAT('/static/uploads/', em.ruta_inventario)), NULL)
    ), ']'),
  e.imagen_url = CONCAT('/static/uploads/', COALESCE(
      NULLIF(em.ruta_equipo, ''), NULLIF(em.ruta_serie, ''), NULLIF(em.ruta_inventario, '')
    )),
  e.imagen_referencial = 0
WHERE (e.fotos IS NULL OR e.fotos = '')
  AND (
    (em.ruta_equipo IS NOT NULL AND em.ruta_equipo != '') OR
    (em.ruta_serie IS NOT NULL AND em.ruta_serie != '') OR
    (em.ruta_inventario IS NOT NULL AND em.ruta_inventario != '')
  );
