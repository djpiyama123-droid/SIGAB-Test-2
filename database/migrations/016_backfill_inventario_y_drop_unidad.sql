-- Migración 016: cierra la revisión de columnas legacy de `equipos` iniciada
-- en la 015.
--
-- HALLAZGO: la tabla tiene DOS columnas de inventario distintas —
-- `inventario` (la que usa models/equipo.py, el frontend entero
-- —EquipoDetail, EquipoTable, EquipoForm— y la Triple Validación Poka-Yoke
-- de routes/equipos.py, QR+Inventario+Serie) y `numero_inventario` (legacy
-- del import original migrate_equipos_sigab.sql). `inventario` estaba
-- 0/751 poblada mientras `numero_inventario` tenía 515/751 datos reales:
-- la Triple Validación llevaba semanas sin poder matchear inventario para
-- ningún equipo porque el campo que lee siempre estaba vacío.
--
-- Fix (datos, ya ejecutado a mano en la BD del ThinkCentre 2026-08-29,
-- replicado aquí para que quede versionado):
--   UPDATE equipos SET inventario = numero_inventario
--   WHERE numero_inventario IS NOT NULL AND numero_inventario != ''
--     AND (inventario IS NULL OR inventario = '');
--
-- `numero_inventario` se conserva (no se dropea): sirve como rastro de
-- dónde vino el valor legacy, es nullable y no estorba.
--
-- `unidad` sí se dropea: 751/751 poblada pero sin ninguna referencia en
-- models/equipo.py, routes/equipos.py, ni frontend — el dato equivalente
-- ya vive normalizado en la tabla `ubicaciones` (unidad/clave_unidad),
-- que sí usa la app. Piloto es de un solo hospital, sin pérdida real de
-- información al dropearla.

USE sigah;

UPDATE equipos SET inventario = numero_inventario
WHERE numero_inventario IS NOT NULL AND numero_inventario != ''
  AND (inventario IS NULL OR inventario = '');

ALTER TABLE equipos DROP COLUMN unidad;
