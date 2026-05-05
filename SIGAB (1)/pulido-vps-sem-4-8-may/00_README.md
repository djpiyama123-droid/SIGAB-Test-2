# Entregables — Semana de pulido SIGAB 4-8 may 2026

Esta carpeta contiene el resultado del **arranque (lunes 4-may)** y la **continuación (martes 5-may)** de la semana de pulido. Por restricciones del sandbox de ejecución (sin SSH al VPS, sin credenciales de push a GitHub), **nada se aplicó al repo remoto ni al VPS**. Los archivos están listos para que tú o una sesión con acceso los apliques.

## Archivos

| #  | Archivo                                              | Día    | Qué es                                                                                                                            |
|----|------------------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------|
| 00 | `00_README.md`                                       | —      | Este índice.                                                                                                                      |
| 01 | `01_patch_equipos_ubicacion.py.diff`                 | Lun    | Diff `git apply`. Resuelve `IntegrityError` de `equipos.ubicacion` derivándolo de `area`/`piso` cuando llega null.                |
| 02 | `02_test_equipos_ubicacion_bugfix.py`                | Lun    | Test pytest del fix anterior. Va en `sigab-backend/tests/`.                                                                       |
| 03 | `03_matriz_defectos_lunes_4may.md`                   | Lun    | Auditoría P0/P1/P2/P3 + matriz de botones por página + diagnóstico estructural de `equipos`.                                      |
| 04 | `04_hotfix_equipos_auth.py.diff`                     | **Mar**| Hotfix P0-01 (security): exige Bearer token en `GET /api/equipos/`, `/areas/catalogo` y `/zonas/catalogo`.                        |
| 05 | `05_test_equipos_auth_required.py`                   | **Mar**| 6 tests de regresión del hotfix. Confirma que el QR público sigue accesible (regresión inversa).                                  |
| 06 | `06_patch_delete_equipo_409_y_put_integrity.py.diff` | **Mar**| `DELETE /equipos/{id}`: pre-flight 409 si hay trazabilidad/preventivo/reserva. `PUT`: `IntegrityError → 400` con detalle.         |
| 07 | `07_test_baja_y_edicion_p1.py`                       | **Mar**| 8 tests P1 — edición de ubicación (refuerzo), baja sin/con relaciones, serie duplicada → 400, biomedico → 403.                    |
| 08 | `08_patch_frontend_ubicacion_defense.jsx.diff`       | **Mar**| `EquipoForm.jsx`: defensa cliente que deriva `ubicacion` de `area`/`piso` antes de enviar (P2-02).                                |
| —  | `BITACORA_PULIDO_2026-05.md`                         | Lun+Mar| Bitácora de la semana, decisiones, riesgos, **CHECKPOINT** para la próxima rutina/sesión interactiva.                              |

## Lo más importante (TL;DR martes 5-may)

1. **🚨 P0-01 SIGUE EXPUESTO en producción** — `curl -s https://sigab.../api/equipos/` (sin token) devuelve el catálogo (verificado 5-may 13:24 UTC). El hotfix está listo en el diff `04`. **Decisión pendiente del usuario:** lo aplicas en `feature/pulido-vps-sem-4-8-may` (Opción A) o en `hotfix/equipos-auth-leak` con merge a `main` hoy mismo (Opción B, recomendada). Ver `BITACORA_PULIDO_2026-05.md` § "Pregunta concreta".
2. **Bundle del martes cubre lo que el plan pedía** ("dejar editar y dar de baja equipos sin errores de integridad"): patch DELETE con pre-flight 409, mapeo `IntegrityError → 400`, defensa frontend.
3. **Hallazgo nuevo:** `/api/equipos/zonas/catalogo` también estaba sin auth — no aparecía en la matriz del lunes. Cubierto por el diff `04`.
4. **Pasos exactos para aplicar todo** (orden, comandos `git apply`, tests, commits) están en `BITACORA_PULIDO_2026-05.md` § "CHECKPOINT PARA RUTINA DE CONTINUACIÓN".

## Aún pendiente (próxima sesión interactiva con SSH)

- Aplicar diffs lunes+martes en VPS, correr pytest, smoke en URL pública, commits convencionales individuales, push.
- Producir/extender `sigab-backend/tests/conftest.py` con las fixtures que asumen los tests `02`, `05`, `07`. Sin esto los tests no corren.
- Decidir Opción A vs B para el hotfix P0-01.

## Pregunta abierta para Gustavo

¿Opción A (todo en feature branch) o Opción B (hotfix-auth a main hoy + resto en feature branch)? Mi voto: **B**, porque el endpoint lleva expuesto al menos desde el lunes y el demo es viernes.
