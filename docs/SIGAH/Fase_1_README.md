# Fase 1 — Multi-tenancy en base de datos

> **Estado:** scaffold listo. La migración **NO se ha corrido** en ninguna BD.
> **Objetivo:** que todas las tablas del dominio sepan a qué hospital pertenece cada fila, sin romper la instancia que corre hoy en HGR No.1.
> **Audiencia:** Gustavo (ejecución técnica), Carlos (revisión funcional).

---

## 1. Qué entrega esta fase

### 1.1 Código nuevo

| Archivo | Propósito |
|---------|-----------|
| `sigah-backend/alembic/versions/a1b2c3d4e5f6_phase_1_multitenancy_init.py` | Migración: crea tabla `hospitales`, inserta tenant por defecto (HGR No.1), agrega `tenant_id` a 19 tablas, backfill, FKs e índices. |
| `sigah-backend/models/hospital.py` | Modelo SQLModel del tenant. |
| `sigah-backend/models/tenancy.py` | Mixin `TenantMixin` para nuevos modelos que se creen después. |
| `sigah-backend/auth/tenancy.py` | Dependencias FastAPI `get_current_tenant`, `get_current_tenant_optional` y `require_superadmin`. |

### 1.2 Código modificado

| Archivo | Cambio |
|---------|--------|
| `sigah-backend/auth/jwt_handler.py` | `create_access_token` ahora incluye `tenant_id` en el payload si el user lo trae. |
| `sigah-backend/models/usuario.py` | Agregado `tenant_id` (FK → `hospitales.id`). |
| `sigah-backend/models/equipo.py` | Agregado `tenant_id` (FK → `hospitales.id`). Ejemplo canónico. |
| `sigah-backend/alembic/env.py` | Import de `Hospital` para autogenerate. |

### 1.3 Lo que falta y por qué quedó pendiente

La migración SQL ya prepara la BD entera; del lado del código Python, solo se actualizaron `usuario.py` y `equipo.py` como **ejemplos canónicos**. Los otros 17 modelos siguen el mismo patrón mecánico:

```python
from sqlalchemy import ForeignKey
from models.tenancy import TenantMixin  # opción 1: usar el mixin

# opción 2: pegar el bloque tenant_id manualmente (igual que en equipo.py)
```

Modelos que faltan actualizar (lista para checkear en una sola sesión de PR):

- `ubicacion.py`
- `alerta.py`
- `preventivo.py` (PreventivoProgramado)
- `reserva.py`
- `trazabilidad.py`
- `mapa.py` (ZonasMapa)
- `soporte.py` (LSMaterial, OSEvidencia, LogActividad — son tres clases en un archivo)
- `modulos_extra.py` (Refaccion, MetrologiaCalibracion, Capacitacion)
- `orden_servicio.py` (OrdenServicio + posibles relacionadas como OSCasilla)

No se tocaron en este scaffold para no inflar el PR. Cada uno requiere agregar 8 líneas y replicarse igual.

---

## 2. Cómo correrla — paso a paso (solo en staging, primero)

### 2.1 Pre-requisitos

- Servidor `sigah-staging` provisionado (ver `Runbook_Provisioning_Hetzner.md`).
- **Snapshot Hetzner tomado AHORA MISMO**, antes de tocar nada (Hetzner Console → server → Snapshots → Take Snapshot).
- **Dump completo de la BD** descargado a otro lugar:
  ```bash
  mysqldump -u root -p sigah > sigah_pre_fase1_$(date +%Y%m%d_%H%M).sql
  ```
- Rama git con esta fase: `git checkout -b sigah-saas` (si aún no existe).

### 2.2 Verificar el árbol actual de migraciones

```bash
cd sigah-backend
source venv/bin/activate   # o el entorno que estés usando
alembic history --verbose
```

Esperado: la última cabeza es `b2c3d4e5f6g7` (Phase 2: UTC + Poka-Yoke). La nueva migración (`a1b2c3d4e5f6`) la sigue.

### 2.3 Dry-run — generar el SQL sin aplicarlo

```bash
alembic upgrade a1b2c3d4e5f6 --sql > /tmp/fase1_upgrade.sql
less /tmp/fase1_upgrade.sql
```

Leer el SQL completo. Verificar:

- Se crea `CREATE TABLE hospitales (...)` con todos los campos.
- Se inserta el registro HGR No.1 con `id=1`.
- Hay 20 `ALTER TABLE ... ADD COLUMN tenant_id` (uno por tabla del dominio).
- Hay 20 `UPDATE ... SET tenant_id = 1` (backfill).
- Hay 20 `ALTER TABLE ... MODIFY tenant_id ... NOT NULL`.
- Hay 20 `ALTER TABLE ... ADD CONSTRAINT fk_..._tenant FOREIGN KEY ...`.
- Hay 20 `CREATE INDEX ix_..._tenant_id ...`.
- Hay 7 `CREATE INDEX ix_..._tenant_<col>` (índices compuestos).

Si algo se ve mal, **no aplicar**: ajustar la migración o reportarlo.

### 2.4 Aplicar en staging

```bash
alembic upgrade a1b2c3d4e5f6
```

Tiempo estimado: menos de 30 segundos con los datos actuales (778 equipos, 244 OS).

### 2.5 Verificaciones inmediatas

```sql
-- 1. La tabla hospitales existe y tiene el tenant default
SELECT id, slug, razon_social, estado_suscripcion FROM hospitales;
-- Esperado: una fila id=1, slug='hgr-1-tijuana', estado='activo'

-- 2. Todas las tablas del dominio tienen tenant_id
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'sigah' AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME;
-- Esperado: 20 filas (las 19 listadas en la migración + hospitales no, pero
-- el resto sí)

-- 3. No quedan filas con tenant_id NULL
SELECT 'equipos' AS tabla, COUNT(*) AS nulos FROM equipos WHERE tenant_id IS NULL
UNION ALL SELECT 'ordenes_servicio', COUNT(*) FROM ordenes_servicio WHERE tenant_id IS NULL
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios WHERE tenant_id IS NULL;
-- Esperado: cero en todas

-- 4. Los índices compuestos existen
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'sigah' AND INDEX_NAME LIKE 'ix_%_tenant%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;
-- Esperado: ix_<tabla>_tenant_id en todas + los 7 compuestos definidos.
```

### 2.6 Smoke test del backend

```bash
cd sigah-backend
uvicorn main:app --reload --port 8001
```

Probar:

- `GET /api/equipos` (con un token válido del usuario admin actual) — debe responder igual que antes (los 778 equipos), porque todos quedaron con `tenant_id=1` y el admin actual también.
- Login (`POST /api/auth/login`) — el JWT devuelto ahora debe incluir el claim `tenant_id`. Decodificarlo en [jwt.io](https://jwt.io) y verificar.

---

## 3. Rollback (solo si algo sale mal)

```bash
alembic downgrade b2c3d4e5f6g7
```

La migración tiene `downgrade()` completo: quita índices, FKs, columnas y la tabla `hospitales` en orden inverso. Recuperación esperada: menos de 1 minuto.

Si el downgrade falla por alguna razón (raro), restaurar desde el snapshot de Hetzner o el dump:

```bash
mysql -u root -p sigah < sigah_pre_fase1_<timestamp>.sql
```

---

## 4. Cómo usar `get_current_tenant` en rutas nuevas

```python
from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from auth.tenancy import get_current_tenant
from database import get_async_session
from models.equipo import Equipo

router = APIRouter()


@router.get("/api/equipos")
async def list_equipos(
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Equipo).where(Equipo.tenant_id == tenant_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/api/equipos")
async def crear_equipo(
    payload: dict,
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    # ⚠️ NUNCA tomar tenant_id del payload — siempre de la dependencia.
    equipo = Equipo(**payload, tenant_id=tenant_id)
    session.add(equipo)
    await session.commit()
    return equipo
```

**Regla absoluta:** `tenant_id` **siempre** viene de `get_current_tenant`, **nunca** del body ni del query string. Lo contrario rompe el aislamiento.

---

## 5. Riesgos conocidos y cómo se mitigan

| Riesgo | Mitigación |
|--------|------------|
| La columna `usuarios.tenant_id` es `NOT NULL`, pero el SuperAdmin de SIGAH no pertenece a un hospital. | Se documenta en `models/usuario.py`. En Fase 3 (Panel SuperAdmin) se hará una migración complementaria que vuelva `tenant_id` nullable para usuarios con rol `superadmin_sigah`. Por ahora, no crear usuarios SuperAdmin en producción. |
| Falta actualizar 17 modelos restantes. | Listado explícito en la sección 1.3. Tarea mecánica para una sesión. |
| Los 244 registros de OS y 778 equipos quedan todos con `tenant_id=1` sin distinguir. | Es lo correcto: todos pertenecen al HGR No.1 hoy. Cuando entre el segundo hospital se creará un nuevo tenant (`id=2`) y los inserts irán a ese. |
| Las rutas existentes aún no filtran por `tenant_id`. | Eso es **Fase 2** (refactor de endpoints). Por ahora todas siguen viendo "todos los equipos del único tenant que hay", que coincide con el comportamiento previo. |
| Tokens emitidos antes de la migración no llevan `tenant_id`. | Esos tokens dejan de servir para rutas que dependan de `get_current_tenant` (devuelven 403). Forzar relogin a usuarios activos después de la migración. |

---

## 6. Criterios para cerrar Fase 1

Marcar cada uno cuando se cumpla:

- [ ] Migración aplicada en `staging` y todas las verificaciones de la sección 2.5 pasan.
- [ ] Smoke test del backend pasa: listar equipos y login devuelven respuesta esperada.
- [ ] Los 17 modelos restantes están actualizados con `tenant_id` (o usan `TenantMixin`).
- [ ] Migración aplicada en `producción` (HGR No.1) con snapshot previo y verificación posterior.
- [ ] Documentado en la bitácora de avance del `Fase_0_Checklist_Operativo_SIGAH.docx`.

Cuando los cinco estén ✓ → arranca **Fase 2** (aislamiento de datos en backend: refactor de todos los endpoints).

---

_v1.0 — Mayo 2026. Actualizar al cierre de la fase._
