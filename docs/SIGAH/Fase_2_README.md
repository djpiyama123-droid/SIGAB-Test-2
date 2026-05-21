# Fase 2 — Aislamiento de datos en el backend (refactor de endpoints)

> **Estado:** scaffold y ejemplos canónicos listos. El refactor mecánico de los 20 archivos `routes/` queda pendiente.
> **Objetivo:** que ninguna ruta del backend retorne ni modifique datos de un hospital que no sea el del usuario autenticado, sin excepciones.
> **Audiencia:** Gustavo (ejecutor del refactor), Carlos (revisor funcional).

---

## 1. Lo que entregó esta preparación

| Archivo | Propósito |
|---------|-----------|
| `sigab-backend/routes/_examples_tenant_pattern.py` | **Plantilla canónica**. 9 ejemplos cubriendo LIST, GET, POST, PUT, DELETE, dashboard, ruta pública, ruta SuperAdmin y relación padre-hijo. + 5 anti-patrones explícitos. No se monta en `main.py`, sirve solo de referencia. |
| `sigab-backend/tests/test_tenant_isolation.py` | Suite pytest de 7 pruebas que validan la promesa: ningún hospital ve datos de otro. TDD — fallan hasta que el refactor está hecho. |
| `sigab-backend/alembic/versions/b1c2d3e4f5a6_phase_3_superadmin_nullable_tenant.py` | Migración complementaria que vuelve `usuarios.tenant_id` nullable para el rol `superadmin_sigah`, con CHECK constraint. Se aplica en Fase 3, está lista. |

---

## 2. Patrón canónico de refactor (resumen)

El detalle vive en `routes/_examples_tenant_pattern.py`. Resumen para los PRs:

| Tipo de endpoint | Cambio |
|------------------|--------|
| `GET /coleccion` | Añadir `tenant_id: int = Depends(get_current_tenant)` y `.where(M.tenant_id == tenant_id)` en el SELECT. |
| `GET /coleccion/{id}` | Igual que arriba, más `M.id == id` en el WHERE. Si no existe → **404** (nunca 403). |
| `POST /coleccion` | Inyectar `tenant_id` desde la dependencia. Borrar `tenant_id` del payload si viene (`payload.pop("tenant_id", None)`). |
| `PUT / PATCH /coleccion/{id}` | Cargar primero con filtro de tenant; rechazar mutación del propio `tenant_id`. |
| `DELETE /coleccion/{id}` | Mismo filtro doble (id + tenant) en el WHERE. |
| Rutas públicas (sin auth) | NO usar `get_current_tenant`. Devolver solo campos no sensibles. |
| Rutas globales SIGAH | Usar `require_superadmin`, sin filtro de tenant. Montar bajo `/api/admin-global/...`. |

### Reglas de oro

1. `tenant_id` **siempre** desde `get_current_tenant`. **Nunca** del body, query o header.
2. Cross-tenant retorna **404**, no 403 (no revelar existencia).
3. SELECTs con `aiomysql` y SQL crudo deben parametrizar `tenant_id` igual que los SQLModel.
4. Defensa en profundidad: en relaciones padre-hijo, filtrar **también** por `tenant_id` aunque el FK al padre ya lo garantice.

---

## 3. Checklist de refactor por archivo

Cada archivo necesita revisión completa endpoint por endpoint. Marcar cuando los tests del archivo pasen y un PR esté merged.

| # | Archivo | Endpoints (aprox) | Notas |
|---|---------|-------------------|-------|
| 1 | `routes/auth.py` | login, refresh, me, change_password | Login DEBE leer `tenant_id` del Usuario y meterlo en el JWT (ya soportado por `create_access_token`). |
| 2 | `routes/equipos.py` | 16 | El más crítico. Cuidar las rutas públicas (`/public/{qr_token}`). |
| 3 | `routes/ordenes.py` | varias | Filtrar OS y materiales por tenant; reportes y dashboard también. |
| 4 | `routes/preventivos.py` | varias | Calendario y notificaciones por tenant. |
| 5 | `routes/alertas.py` | varias | Centro de alertas por hospital. |
| 6 | `routes/tecnovigilancia.py` | varias | Eventos NOM-240 estrictamente por tenant. |
| 7 | `routes/trazabilidad.py` | varias | Movimientos y bitácora por tenant. |
| 8 | `routes/dashboard.py` | KPIs, gráficas | Cada métrica debe ser del tenant. |
| 9 | `routes/reportes.py` | PDFs / Excel | Generados con datos del tenant del usuario. |
| 10 | `routes/copilot.py` | LLM | El contexto que se envía al LLM debe filtrar por tenant — riesgo de filtrar datos en el prompt. |
| 11 | `routes/almacen.py` | refacciones | Almacén por tenant. |
| 12 | `routes/auditoria.py` | log_actividad | Logs por tenant (excepto vista global del SuperAdmin). |
| 13 | `routes/capacitaciones.py` | — | Por tenant. |
| 14 | `routes/casillas.py` | os_casillas | Por tenant. |
| 15 | `routes/checklists.py` | — | Por tenant. |
| 16 | `routes/events.py` | tecnovigilancia o SSE | Verificar suscripción solo a eventos del propio tenant. |
| 17 | `routes/metrologia.py` | metrologia_calibracion | Por tenant. |
| 18 | `routes/ocr.py` | upload + extracción | El archivo subido se asocia al tenant. |
| 19 | `routes/openclaw.py` | gateway IA | Verificar que el contexto LLM no filtre tenants. |
| 20 | `routes/reservas.py` | — | Por tenant. |

Total: **20 archivos**, ~80–120 endpoints por revisar.

---

## 4. Cómo correr la suite de aislamiento

### 4.1 Pre-requisitos

- BD `sigab_test` levantada (ya existe en `docker-compose`).
- Migración Fase 1 aplicada en `sigab_test`:
  ```bash
  SIGAB_TEST=true alembic upgrade a1b2c3d4e5f6
  ```
- (Opcional, para test 7) Migración Fase 3 aplicada en `sigab_test`:
  ```bash
  SIGAB_TEST=true alembic upgrade b1c2d3e4f5a6
  ```

### 4.2 Ejecución

```bash
cd sigab-backend
pytest tests/test_tenant_isolation.py -v
```

### 4.3 Interpretación

| Resultado | Significado |
|-----------|-------------|
| Todos pasan | El aislamiento funciona para los endpoints cubiertos. |
| 5 (post forjado) falla devolviendo 422 | El endpoint POST rechaza `tenant_id` en el body — está bien para alguna validación, pero el ideal es ignorarlo silenciosamente. Ajustar el test si es la decisión del proyecto. |
| 7 (SuperAdmin) se salta | Fase 3 no aplicada — esperado hasta entonces. |
| 1, 2, 3, 4 fallan | El endpoint correspondiente **NO está refactorizado todavía**. Es un puntero a un archivo de `routes/` por revisar. |
| 6 (legacy token) pasa con 200 | Hay un endpoint que **no** usa `get_current_tenant`. Fugaz crítico — auditar. |

### 4.4 Expansión

Agregar nuevos tests al archivo conforme se refactorizan más routers. Patrón sugerido:

```python
@pytest.mark.asyncio
async def test_ordenes_aisladas(client, users_for_tenants, ...):
    # Crear OS para tenant A
    # Pedir desde tenant B → 404
    ...
```

---

## 5. Orden de despliegue (crítico)

Las piezas tienen dependencias estrictas. El orden que NO rompe la instancia HGR No.1 es:

1. **En staging**, primero:
   1. Aplicar migración Fase 1 (`a1b2c3d4e5f6`).
   2. Verificar las 4 queries del `Fase_1_README.md` sección 2.5.
   3. Mergear el refactor de los 20 archivos `routes/` a `sigah-saas`.
   4. Correr `pytest tests/test_tenant_isolation.py -v` — debe pasar todo.
2. **En producción** (HGR No.1), con ventana de mantenimiento corta:
   1. Snapshot Hetzner.
   2. Aplicar migración Fase 1.
   3. Forzar relogin a los 5 usuarios actuales (los tokens previos no tienen `tenant_id`).
   4. Desplegar el código con los 20 routes refactorizados.
   5. Smoke test.

> Migración Fase 3 (SuperAdmin nullable) NO se aplica todavía — se aplica en Fase 3 cuando se construya el panel `/admin-global`.

---

## 6. Criterios para cerrar Fase 2

- [ ] Los 20 archivos `routes/*.py` están refactorizados.
- [ ] `pytest tests/test_tenant_isolation.py` pasa al 100% (los 6 tests base, sin Fase 3).
- [ ] Se ejecutó una **auditoría manual** del log de queries en staging: ninguna consulta SQL sin `tenant_id` cuando proviene de una sesión de hospital.
- [ ] El refactor está en producción y la instancia HGR No.1 sigue funcionando sin regresiones visibles para los usuarios.
- [ ] Documentado en la bitácora de avance del checklist Fase 0.

Cuando los cinco estén ✓ → arranca **Fase 3** (Panel SuperAdmin — Centro de Mando SIGAH).

---

## 7. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Olvidar refactorizar un endpoint deja una fuga silenciosa. | Suite de tests obligatoria + auditoría manual de queries en staging. |
| Algunas rutas usan `aiomysql` con SQL crudo en lugar de SQLModel. | Buscar `cursor.execute` y `await cursor.fetchall` en todos los routes; añadir `tenant_id = %s` en cada WHERE manualmente. |
| El Copilot IA puede filtrar datos cross-tenant en el contexto enviado al LLM. | Revisar `routes/copilot.py` y `services/` que construyen el contexto. Filtrar todo por tenant antes de pasarle al modelo. |
| Tests pasan en local pero la BD de prod tiene esquema viejo. | Aplicar Fase 1 en prod ANTES de desplegar el código refactorizado. Si el orden se invierte, las queries lanzan errores 500. |
| Tokens viejos (sin tenant_id) siguen activos. | Forzar relogin tras Fase 1. Documentar en notas de release. |

---

_v1.0 — Mayo 2026. Actualizar conforme se vayan cerrando archivos del checklist._
