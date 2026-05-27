-- database/migrations/008_mantenimiento_predictivo.sql
-- Agrega columnas de soporte para mantenimiento predictivo asistido por IA (NOM-016-SSA3-2012)
-- en la tabla de ordenes_servicio.

ALTER TABLE ordenes_servicio
ADD COLUMN horas_uso_acumuladas INT NULL DEFAULT 0,
ADD COLUMN antiguedad_equipo VARCHAR(100) NULL,
ADD COLUMN indice_salud INT NULL DEFAULT 100,
ADD COLUMN probabilidad_falla INT NULL DEFAULT 0,
ADD COLUMN ventana_recomendada INT NULL,
ADD COLUMN confianza_modelo INT NULL DEFAULT 0,
ADD COLUMN componente_riesgo TEXT NULL,
ADD COLUMN indicadores_monitoreados TEXT NULL,
ADD COLUMN validacion_ia VARCHAR(50) NULL DEFAULT 'acepta',
ADD COLUMN justificacion_validacion TEXT NULL;
