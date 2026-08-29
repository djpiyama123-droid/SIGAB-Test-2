# Spike: reemplazar la importación de `.sql` crudo en `setup.sh` por `alembic upgrade head`

**Resultado: NO converge. No se modificó `setup.sh`.**

## Método

Análisis estático de la cadena de migraciones Alembic (`sigab-backend/alembic/versions/`,
8 archivos, cadena confirmada vía `revision`/`down_revision`) contra `database/sigab_schema_fresh.sql`
y las `.sql` sueltas de `database/migrations/`. No se ejecutó `alembic upgrade head` en vivo:
el intento de aislar una BD de prueba (crear `sigah_alembic_spike` o vaciar/recrear la `sigah`
local) fue bloqueado por el propio harness como operación destructiva/irreversible sobre datos
reales (751 equipos en la `sigah` local) — no se forzó el bypass, se optó por leer el código de
las migraciones directamente, que es suficiente para responder la pregunta.

## Cadena Alembic confirmada (head = `e4f5a6b7c8d9`)

```
fc59a6b78c4f (initial) → b2c3d4e5f6g7 (phase2 utc/poka_yoke) → a1b2c3d4e5f6 (phase1 multitenancy)
→ b1c2d3e4f5a6 (phase3 superadmin) → fb21941638ba (contract fields) → c7d8e9f0a1b2 (imagen_referencial)
→ d3e4f5a6b7c8 (conformidad_localizacion_os) → e4f5a6b7c8d9 (equipos columnas faltantes) [HEAD]
```

## Hallazgo central

`fc59a6b78c4f` (la migración "initial") **no contiene ningún `op.create_table`** para
`equipos`, `usuarios`, `zonas_mapa` ni ninguna otra tabla base — solo `op.alter_column` /
`op.create_index`. Fue autogenerada contra una BD que YA tenía esas tablas creadas por SQL
crudo; nunca fue pensada para levantar el esquema desde cero.

En **toda** la cadena Alembic (los 8 archivos), las únicas `op.create_table` son:
- `a1b2c3d4e5f6` → tabla `hospitales`
- `b2c3d4e5f6g7` → tabla `poka_yoke_logs`

Todo lo demás son `add_column`/`alter_column` sobre tablas que deben preexistir.

## Qué crea cada fuente (comparación)

`database/sigab_schema_fresh.sql` crea 12 tablas: `equipos`, `ubicaciones`, `usuarios`,
`trazabilidad`, `reservas`, `ordenes_servicio`, `os_materiales`, `os_evidencias`,
`preventivos_programados`, `alertas`, `log_actividad`, `refacciones_almacen`.

Tablas que el código (modelos SQLModel / rutas) usa pero que **no crea ni el schema fresh ni
ninguna migración Alembic** — solo existen como `.sql` suelto en `database/migrations/`,
fuera del árbol de Alembic:
- `zonas_mapa` — solo en `014_zonas_mapa_y_equipos_columnas.sql` (agregada anoche, 2026-08-28)
- `equipo_documentos` — solo en `010_equipo_documentos.sql`
- `tecnovigilancia_eventos`, `tecnovigilancia_evidencias` — solo en `011_tecnovigilancia.sql`

## Por qué no converge

Si `setup.sh` reemplazara el bloque `[5/9]` por `alembic upgrade head` puro contra una BD
vacía, la primera migración (`fc59a6b78c4f`) fallaría de inmediato: `ALTER TABLE usuarios ...`
sobre una tabla que no existe. Si en cambio se mantiene `sigab_schema_fresh.sql` como paso
previo (como hoy) y solo se sustituyen las `.sql` de `database/migrations/*` por Alembic,
igual faltarían `zonas_mapa`, `equipo_documentos`, `tecnovigilancia_eventos`,
`tecnovigilancia_evidencias` — Alembic nunca las crea.

## Qué se necesitaría para que converja (no implementado, es una decisión de arquitectura)

1. Una migración Alembic base nueva (`down_revision=None`, antes de `fc59a6b78c4f`) que haga
   `create_table` de las 12 tablas de `sigab_schema_fresh.sql` — o re-generar `fc59a6b78c4f`
   desde cero con `alembic revision --autogenerate` contra una BD vacía.
2. Migraciones Alembic nuevas para `zonas_mapa`, `equipo_documentos`,
   `tecnovigilancia_eventos`, `tecnovigilancia_evidencias` (portar el DDL ya escrito en
   010/011/014, que está probado y es idempotente).
3. Decidir qué pasa con `fix_encoding.sql` y `generate_all_zones.sql` (no son DDL de
   esquema, son transformaciones de datos puntuales — no les corresponde vivir en Alembic).

Esto es trabajo de una tarde, no un spike de una sesión, y toca decisiones de las que Gustavo
debería estar al tanto (p.ej. si vale la pena mantener dos sistemas de migración en paralelo
mientras tanto, o congelar el `.sql` suelto). Se documenta aquí en vez de improvisar el
create_table faltante para no inventar columnas/tipos que no están verificados contra prod.
