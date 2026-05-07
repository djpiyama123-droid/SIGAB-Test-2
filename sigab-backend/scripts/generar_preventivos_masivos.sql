-- ─────────────────────────────────────────────────────────────────
-- Genera 1 preventivo programado por equipo activo (no en baja).
-- Idempotente: omite equipos que ya tengan un preventivo activo.
--
-- Frecuencias por tipo:
--   • autoclave, laboratorio                       → 90 d (trimestral)
--   • monitor, ventilador, bomba_infusion,
--     desfibrilador, anestesia, electrocardiografo → 180 d (semestral)
--   • rayos_x, arco_c, ultrasonido                 → 365 d (anual)
--   • cama, incubadora, otro y default             → 180 d (semestral)
--
-- Distribución de proxima_ejecucion: algunas vencidas, algunas en los
-- próximos 30 días y otras más lejanas, usando el id del equipo como
-- pseudo-aleatorio reproducible.
-- ─────────────────────────────────────────────────────────────────
INSERT INTO preventivos_programados
  (equipo_id, tipo_preventivo, frecuencia_dias, ultima_ejecucion,
   proxima_ejecucion, descripcion_procedimiento, activo)
SELECT
  e.id AS equipo_id,
  CASE
    WHEN e.tipo_equipo IN ('autoclave', 'laboratorio') THEN 'Trimestral'
    WHEN e.tipo_equipo IN ('rayos_x', 'arco_c', 'ultrasonido') THEN 'Anual'
    ELSE 'Semestral'
  END AS tipo_preventivo,
  CASE
    WHEN e.tipo_equipo IN ('autoclave', 'laboratorio') THEN 90
    WHEN e.tipo_equipo IN ('rayos_x', 'arco_c', 'ultrasonido') THEN 365
    ELSE 180
  END AS frecuencia_dias,
  -- ultima_ejecucion: 60-180 días atrás según el id (algunos NULL aleatorio)
  CASE WHEN MOD(e.id, 5) = 0 THEN NULL
       ELSE DATE_SUB(CURDATE(), INTERVAL (60 + CAST(MOD(e.id * 7, 120) AS SIGNED)) DAY)
  END AS ultima_ejecucion,
  -- proxima_ejecucion distribuida: -30 a +180 días (CAST a SIGNED para permitir resta negativa)
  DATE_ADD(CURDATE(), INTERVAL (CAST(MOD(e.id * 11, 210) AS SIGNED) - 30) DAY) AS proxima_ejecucion,
  CONCAT(
    'Mantenimiento preventivo programado para ',
    COALESCE(e.tipo_equipo, 'equipo'),
    '. Incluye inspección visual, prueba funcional, calibración y verificación de alarmas.'
  ) AS descripcion_procedimiento,
  1 AS activo
FROM equipos e
LEFT JOIN preventivos_programados pp
  ON pp.equipo_id = e.id AND pp.activo = 1
WHERE pp.id IS NULL
  AND e.estado != 'baja';
