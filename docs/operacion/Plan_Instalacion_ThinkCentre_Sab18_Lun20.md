# 🏥 SIGAB — Plan de Instalación ThinkCentre + Refactor Prototipo
## Sábado 18 → Lunes 20 · abril 2026 · HGR No.1 IMSS Tijuana (Clínica 1)

> **Autor:** Arquitecto de Software y Bioingeniero Senior del proyecto SIGAB
> **Destinatario:** Gustavo Aguilar Urias (ejecución) — Ing. Carlos Oswaldo (validación)
> **Compromiso:** Dejar el mini servidor Lenovo ThinkCentre M720q en línea y el prototipo SIGAB V2.0 funcional el mismo sábado. Domingo: consolidar módulos. Lunes: ensayo general en el Ambigu. Martes: presentación oficial.

---

## 0. Resumen ejecutivo del plan

| Día | Hora clave | Entregable |
|---|---|---|
| **Sábado 18** | 10:00 → 19:00 | ThinkCentre instalado físicamente, IP estática LAN IMSS, stack Docker arriba, BD IMSS conectada (solo lectura), Dashboard v2 desplegado con **Mapa de Zonas + MTBF/MTTR + Tabla Recientes** |
| **Domingo 19** | 09:00 → 17:00 | Refactor de módulos: se eliminan/consolidan pantallas redundantes (ver §4). E2E de los 7 flujos críticos. Túnel local para bot WhatsApp con OCR Ollama. |
| **Lunes 20** | 14:00 → 19:00 | Auditoría de datos recolectados viernes–domingo. Ensayo formal en el Ambigu (15 min demo + 10 min Q&A). Corrección de últimos defectos. |
| **Martes 21** | Ambigu | Presentación oficial. |

---

## 1. Pre-requisitos — lista a preparar ANTES de salir (sáb ≤ 09:30)

### 1.1 Hardware en mochila
- [ ] Lenovo ThinkCentre M720q (mini PC, ya con Ubuntu 24.04 LTS + stack SIGAB preinstalado desde viernes)
- [ ] Cable de poder + cable de corriente
- [ ] Cable Ethernet Cat6 (≥ 2 m, reserva extra de 5 m)
- [ ] Cable HDMI (para boot inicial)
- [ ] Teclado + mouse USB (boot inicial)
- [ ] Monitor portátil o acceso al monitor de la oficina
- [ ] USB booteable Ubuntu 24.04 (respaldo si corrompe el SO)
- [ ] USB 64 GB con imagen completa del stack (respaldo total)
- [ ] Etiqueta impresa: `SIGAB-PROD · Serial: <#> · Ing. Biomédica · NO DESCONECTAR`

### 1.2 Software ya listo en el ThinkCentre (verificar desde la Asus antes de salir)
```bash
# Desde la Asus TUF, hacer ping al ThinkCentre (si estuvo prendido)
ping -c 3 sigab-server.local

# O verificar imagen local guardada
ls -la ~/sigab/backups/sigab-production-image.tar.gz
```

### 1.3 Credenciales a llevar (en papel, sobre sellado)
- Password root ThinkCentre
- Password DB MySQL (usuario `sigab_admin`)
- Password usuario `ADMIN001` (para demo)
- Token API del bot OpenClaw
- SSID + password de la red LAN IMSS Conservación (si aplica)

### 1.4 Documentos impresos
- [ ] 2 copias Resumen Ejecutivo firmado por Carlos
- [ ] 1 copia Layout arquitectónico Clínica 1 (dónde va el ThinkCentre)
- [ ] 1 copia Checklist de Instalación (éste documento, sección 2)

---

## 2. Sábado 18 · abril — Instalación en sitio (10:00 → 19:00)

### 2.1 10:00–10:20 · Llegada y recepción (oficina de Conservación)
- [ ] Saludo a personal en turno
- [ ] Registro de entrada en bitácora del área
- [ ] Identificar punto de red y toma eléctrica reservados para el ThinkCentre
- [ ] Verificar espacio físico: superficie nivelada, ventilación ≥ 10 cm libres, sin humedad
- [ ] Tomar **foto de evidencia** del lugar ANTES de la instalación (para audit NOM-016)

### 2.2 10:20–10:45 · Conexión física
```
☐ Poder — toma reguladora (si existe UPS, conectar al UPS, NO directo al muro)
☐ Ethernet Cat6 → switch del área de Conservación
☐ HDMI → monitor disponible
☐ Teclado + mouse USB
☐ Etiqueta SIGAB-PROD pegada al chasis
```

### 2.3 10:45–11:15 · Boot inicial + verificación BIOS
- Power ON. Presionar **F1** o **F2** para entrar a BIOS si es necesario.
- Validar:
  - [ ] Hora del sistema correcta (hora Tijuana / PDT, -7)
  - [ ] Arranque automático tras corte de luz: **BIOS → Power → After Power Loss → Power On**
  - [ ] Secure Boot: OFF (para Docker sin fricciones)
  - [ ] Arranque desde disco interno (NVMe) prioritario
- Boot a Ubuntu. Login usuario `sigab`.

### 2.4 11:15–11:45 · Configuración de red estática LAN IMSS

> **⚠️ Crítico:** El sistema NO debe tener salida a internet por normatividad. Solo LAN hospital.

Identificar interfaz de red:
```bash
ip link show
# Suponer que la interfaz es "enp0s31f6" o "eth0"
```

Pedir a TI IMSS (o confirmar con Carlos) estos datos:
- IP estática asignada al servidor: `<p.e. 172.16.40.50>`
- Máscara: `<p.e. 255.255.255.0>`
- Gateway (si existe dentro de la LAN): `<p.e. 172.16.40.1>`
- DNS interno (si existe): `<p.e. 172.16.40.10>`

Configurar con netplan:
```bash
sudo tee /etc/netplan/01-sigab-static.yaml > /dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s31f6:
      dhcp4: no
      addresses: [172.16.40.50/24]
      routes:
        - to: default
          via: 172.16.40.1
      nameservers:
        addresses: [172.16.40.10, 127.0.0.1]
EOF
sudo chmod 600 /etc/netplan/01-sigab-static.yaml
sudo netplan apply

# Verificar
ip a show enp0s31f6
ping -c 3 172.16.40.1   # gateway interno
```

Definir hostname y hosts:
```bash
sudo hostnamectl set-hostname sigab-server
echo "172.16.40.50  sigab-server.imss.local sigab-server" | sudo tee -a /etc/hosts
```

Firewall (solo puertos necesarios dentro de la LAN):
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 172.16.40.0/24 to any port 22 proto tcp    # SSH solo LAN
sudo ufw allow from 172.16.40.0/24 to any port 5173 proto tcp  # Frontend
sudo ufw allow from 172.16.40.0/24 to any port 8000 proto tcp  # Backend
sudo ufw allow from 172.16.40.0/24 to any port 3306 proto tcp  # MySQL (solo si se requiere acceso remoto)
sudo ufw allow from 172.16.40.0/24 to any port 11434 proto tcp # Ollama
sudo ufw enable
sudo ufw status verbose
```

### 2.5 11:45–12:15 · Levantar el stack Docker
```bash
cd ~/sigab
docker compose down   # asegurar arranque limpio
docker compose up -d
docker compose ps     # los 4 contenedores en estado "healthy"
```

Esperar 90 s. Healthchecks:
```bash
curl -s localhost:8000/health | jq .
curl -s -o /dev/null -w "%{http_code}\n" localhost:5173   # espera 200
curl -s localhost:11434/api/tags | jq '.models[].name'    # espera gemma3
```

### 2.6 12:15–13:00 · Conexión a la BD existente del área de Conservación

> El área ya mantiene un inventario de equipos (posiblemente en Excel, Access o SQL). Objetivo: conectar en **solo lectura** para la primera carga.

**Ruta A — Excel/CSV del área (más probable):**
```bash
# Colocar el archivo en ~/sigab/inbox/
mkdir -p ~/sigab/inbox
cp /media/usb/inventario_conservacion.xlsx ~/sigab/inbox/

# Ejecutar importador
docker exec -it sigab-backend python -m scripts.import_inventario_imss \
    --input /app/inbox/inventario_conservacion.xlsx \
    --mode upsert \
    --dry-run

# Si el dry-run luce bien:
docker exec -it sigab-backend python -m scripts.import_inventario_imss \
    --input /app/inbox/inventario_conservacion.xlsx \
    --mode upsert
```

**Ruta B — BD remota (si el IMSS expone una):**
```bash
# Configurar string de conexión readonly en .env
echo "IMSS_SOURCE_DB_URL=mysql+pymysql://readonly:<pwd>@172.16.40.80:3306/conservacion" >> ~/sigab/.env
docker compose restart sigab-backend

# Importar
docker exec -it sigab-backend python -m scripts.sync_from_imss_source
```

Verificar en la BD local:
```bash
docker exec -it mysql-sigab mysql -usigab_admin -p sigab \
    -e "SELECT COUNT(*) as total, MAX(fecha_actualizacion) as ult FROM equipos;"
```

### 2.7 13:00–14:00 · ALMUERZO (no saltar — turno largo)

### 2.8 14:00–16:30 · Refactorización Dashboard v2 (punto crítico)

**Layout objetivo del Dashboard principal:**

```
┌──────────────────────────────────────────────────────────────┐
│   🏥 SIGAB · Dashboard · HGR No.1 IMSS Tijuana               │ ← Header
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [ MAPA DE ZONAS — 6 zonas con círculos de equipos ]        │ ← 1. Mapa interactivo
│                                                              │
│        Urgencias 🟢 12    Imagenología 🟡 8                  │
│        UCI 🟢 6           Quirófano 🔴 4                     │
│        Laboratorio 🟢 15  Consulta Ext 🟢 22                 │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│   📊 KPIs Industria 4.0                                      │ ← 2. Métricas MTBF/MTTR
│                                                              │
│   MTBF: 420 h    MTTR: 3.2 h    Disp: 98.7%    Backlog: 7   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│   📋 Equipos recientes (últimos modificados)                 │ ← 3. Tabla recientes
│                                                              │
│   [ Filtros ] Zona ▾ Estado ▾ Tipo ▾  🔍 Buscar              │
│   [ Tabla idéntica a /equipos, ordenada por fecha DESC ]     │
│   Nº Inv · Equipo · Zona · Estado · Última Modif · Ver       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Acción:** refactorizar `sigab-frontend/src/pages/Dashboard.jsx` + backend `routes/dashboard.py`. Código listo en la sección 5.

### 2.9 16:30–17:30 · Túnel local bot WhatsApp

> El bot OpenClaw corre en Node.js en el ThinkCentre (puerto 3001). Los técnicos envían mensajes al **número Twilio** configurado; Twilio los enruta via webhook al bot local **solo si existe un puente**. En entornos 100% LAN sin internet esto se resuelve con una **gateway intermedia de WhatsApp Business API on-prem** o un cuenta móvil del IMSS con reenvío local.

**Arquitectura aprobada (sin exposición a internet):**
- Un smartphone Android del área (línea IMSS) corre **whatsapp-web.js** vía Chromium headless.
- El bot se conecta al teléfono por USB (ADB) usando `adb reverse tcp:3001 tcp:3001`.
- Todos los mensajes caen al servicio `sigab-bot` que lee multimedia y las pasa a:
  - `sigab-backend:/api/ocr/foto-orden` (para fotos — PaddleOCR local)
  - `sigab-backend:/api/copilot/whatsapp-audio` (para audios — Whisper local)

```bash
# En el ThinkCentre
docker compose logs -f sigab-bot | grep "WhatsApp ready"
# Debe imprimir "WhatsApp client ready, phone=<número IMSS>"
```

Prueba funcional:
1. Desde el teléfono del Ing. Carlos, enviar al número IMSS la foto de una orden impresa.
2. En el Dashboard, ver que aparece una **Orden de Servicio en estado `pendiente_revision`** en < 30 s.

### 2.10 17:30–18:30 · Primera carga masiva y verificación E2E

Cargar los 200+ equipos reales (desde `inventario_conservacion.xlsx` del área). Validar los 7 flujos críticos:

| # | Flujo | Validación |
|---|---|---|
| 1 | Login ADMIN001 | Dashboard carga < 3 s |
| 2 | Equipos → filtro zona Urgencias | Lista muestra N equipos correctos |
| 3 | Nueva Orden desde foto WhatsApp | OCR extrae nº inventario, estado=pendiente |
| 4 | Subjefe valida → asigna técnico | Estado cambia, SSE actualiza dashboard |
| 5 | Cerrar orden → generar PDF NOM-016 | PDF descarga, hash SHA-256 visible |
| 6 | Trazabilidad: ver log cadena | Cadena intacta, último hash = hash actual |
| 7 | Copilot: "¿cuántos equipos hay en UCI?" | Respuesta Gemma local en < 10 s |

### 2.11 18:30–19:00 · Cierre del día

- [ ] Ejecutar respaldo incremental: `docker exec sigab-backend python -m scripts.backup_daily`
- [ ] Confirmar que el servicio systemd `sigab.service` arranca en boot: `systemctl is-enabled sigab`
- [ ] Tomar foto final del equipo instalado y del Dashboard en monitor (evidencia)
- [ ] Dejar un letrero físico: `NO APAGAR · SIGAB EN PILOTO · Contacto: Gustavo <cel>`
- [ ] Registrar salida en bitácora del área

---

## 3. Domingo 19 · abril — Consolidación y pulido remoto

El domingo trabajas **desde casa** conectándote al ThinkCentre por SSH en la LAN del hospital mediante VPN de Conservación (si está disponible) o, en su defecto, **dejando el ThinkCentre en ejecución** con tareas programadas.

### 3.1 09:00–11:00 · Auditoría de datos recolectados viernes–sábado
- Revisar las órdenes creadas por el bot (debe haber ≥ 15)
- Validar que todos los equipos tienen QR asignado
- Identificar inconsistencias: folios duplicados, campos vacíos, fotos sin OCR

### 3.2 11:00–13:00 · Consolidación de módulos (refactor)

Ver §4 para detalle — eliminación / fusión de 5 pantallas redundantes.

### 3.3 13:00–15:00 · Tests E2E con Playwright

```bash
cd ~/sigab/sigab-frontend
npx playwright test --project=chromium --reporter=line
```

### 3.4 15:00–17:00 · Carga demo final para Ambigu

- Sembrar ≥ 30 equipos con fotos reales
- Crear 10 órdenes en diferentes estados (3 pendientes, 4 en progreso, 2 cerradas, 1 escalada)
- Generar 5 reportes PDF NOM-016 para mostrar en vivo

---

## 4. Módulos a consolidar / eliminar (decisión técnica)

Revisión de las **19 pantallas actuales** contra el alcance mínimo del prototipo:

| Pantalla | Decisión | Justificación |
|---|---|---|
| `Dashboard.jsx` | ✅ **REFACTOR v2** | Mapa + KPIs + Recientes (ver §5) |
| `Equipos.jsx` | ✅ **MANTENER** | Core. Tabla + filtros + Triple Validación |
| `Ordenes.jsx` | ✅ **MANTENER** | Core. Máquina de estados + PDF |
| `Preventivos.jsx` | ✅ **MANTENER** | Core. Calendario + auto-generación |
| `Alertas.jsx` | ✅ **MANTENER** | Core. Tecnovigilancia + SSE |
| `Tecnovigilancia.jsx` | ✅ **MANTENER** | NOM-240 crítico |
| `Trazabilidad.jsx` | ✅ **MANTENER** | NOM-016 crítico (hash chain) |
| `Copilot.jsx` | ✅ **MANTENER** | Diferenciador. Widget flotante global |
| `Reportes.jsx` | ✅ **MANTENER** | Generación PDF/Excel ejecutivos |
| `Login.jsx` | ✅ **MANTENER** | Obvio |
| `EquipoPublico.jsx` | ✅ **MANTENER** | QR público (sin login) — NOM compliance |
| `QRBatch.jsx` | 🔀 **FUSIONAR → Equipos** | Debe ser una acción dentro de `/equipos` (botón "Imprimir QR masivo") |
| `ChecklistPage.jsx` | 🔀 **FUSIONAR → Preventivos** | Los checklist son parte del mantenimiento preventivo |
| `AuditPage.jsx` | 🔀 **FUSIONAR → Trazabilidad** | Es la misma función bajo otro nombre |
| `TVDashboard.jsx` | ⏸️ **DIFERIR V2.1** | Modo kiosko para TV — útil pero fuera de alcance prototipo |
| `Analitica.jsx` | ❌ **ELIMINAR** | Redundante con Dashboard v2 + Reportes |
| `Almacen.jsx` | ❌ **ELIMINAR** | Fuera de alcance: no es Conservación, es Insumos |
| `Metrologia.jsx` | ⏸️ **DIFERIR V2.1** | Módulo especializado (CENAM), no core del piloto |
| `Capacitaciones.jsx` | ❌ **ELIMINAR** | Fuera de alcance |

**Resultado:**
- De **19 pantallas → 11 pantallas activas** en menú principal
- **3 fusiones** (QRBatch, Checklist, Audit → a sus pantallas padre)
- **3 eliminaciones** (Analitica, Almacen, Capacitaciones)
- **2 diferidas** (TVDashboard, Metrologia — ocultas, no eliminadas)

### 4.1 Archivos a eliminar (backend + frontend)

```bash
# Frontend
cd ~/sigab/sigab-frontend/src/pages
git mv Analitica.jsx ../_deprecated/
git mv Almacen.jsx ../_deprecated/
git mv Capacitaciones.jsx ../_deprecated/

# Backend — endpoints correspondientes
cd ~/sigab/sigab-backend/routes
# NO ELIMINAR los .py aún — comentar registro en main.py primero:
# Editar sigab-backend/main.py y comentar:
#   # app.include_router(almacen.router, prefix="/api/almacen")
#   # app.include_router(capacitaciones.router, prefix="/api/capacitaciones")
```

### 4.2 Sidebar — actualizar menú

Editar `sigab-frontend/src/components/Sidebar.jsx`: dejar solo las 11 pantallas activas, agrupadas en 3 bloques:

```
📊 OPERACIÓN
  └─ Dashboard
  └─ Equipos (incluye QR Batch)
  └─ Órdenes
  └─ Preventivos (incluye Checklists)
  └─ Alertas

🛡️ CUMPLIMIENTO
  └─ Tecnovigilancia (NOM-240)
  └─ Trazabilidad (NOM-016, incluye Audit)
  └─ Reportes

🤖 INTELIGENCIA
  └─ Copilot IA
```

---

## 5. Código listo para producción

### 5.1 Backend — `routes/dashboard.py` (endpoint MTBF/MTTR + Recientes)

```python
# sigab-backend/routes/dashboard.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, text
from datetime import datetime, timedelta
from typing import List, Optional

from database import get_db
from auth.dependencies import get_current_user
from models.equipo import Equipo
from models.orden import OrdenServicio
from models.zona import Zona
from schemas.dashboard import DashboardKPIsOut, ZonaStatOut, EquipoRecienteOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/zonas-mapa", response_model=List[ZonaStatOut])
def zonas_con_equipos(db: Session = Depends(get_db), _u=Depends(get_current_user)):
    """
    Mapa de zonas con conteo de equipos por estado.
    Usado por el componente <HospitalMap /> en el Dashboard v2.
    """
    rows = db.execute(text("""
        SELECT
            z.id                                           AS zona_id,
            z.nombre                                       AS zona,
            z.coord_x, z.coord_y,
            COUNT(e.id)                                    AS total,
            SUM(CASE WHEN e.estado='operativo'        THEN 1 ELSE 0 END) AS operativos,
            SUM(CASE WHEN e.estado='mantenimiento'    THEN 1 ELSE 0 END) AS en_mantto,
            SUM(CASE WHEN e.estado='fuera_servicio'   THEN 1 ELSE 0 END) AS fuera,
            SUM(CASE WHEN e.estado='baja'             THEN 1 ELSE 0 END) AS baja
        FROM zonas z
        LEFT JOIN equipos e ON e.zona_id = z.id AND e.activo = 1
        GROUP BY z.id, z.nombre, z.coord_x, z.coord_y
        ORDER BY z.nombre
    """)).mappings().all()
    return [ZonaStatOut(**r) for r in rows]


@router.get("/kpis-industria40", response_model=DashboardKPIsOut)
def kpis_industria40(
    periodo_dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _u=Depends(get_current_user),
):
    """
    Métricas Industria 4.0 para Biomédica Hospitalaria:
        · MTBF  — Mean Time Between Failures (horas)
        · MTTR  — Mean Time To Repair (horas)
        · Disponibilidad = MTBF / (MTBF + MTTR)
        · Backlog — órdenes abiertas con > 72 h
    """
    desde = datetime.utcnow() - timedelta(days=periodo_dias)

    # MTTR: promedio (cerrada - creada) sobre órdenes cerradas en el periodo
    mttr_row = db.execute(text("""
        SELECT AVG(TIMESTAMPDIFF(MINUTE, o.fecha_creacion, o.fecha_cierre)) / 60.0 AS mttr
        FROM ordenes_servicio o
        WHERE o.estado = 'cerrada'
          AND o.fecha_cierre >= :desde
    """), {"desde": desde}).scalar()
    mttr_h = round(float(mttr_row or 0), 2)

    # MTBF: tiempo de operación total / número de fallas del parque
    # operación total = horas_en_periodo * n_equipos_operativos
    horas_periodo = periodo_dias * 24
    n_equipos = db.query(func.count(Equipo.id)).filter(
        Equipo.activo == True, Equipo.estado == "operativo"
    ).scalar() or 1
    n_fallas = db.query(func.count(OrdenServicio.id)).filter(
        OrdenServicio.tipo == "correctivo",
        OrdenServicio.fecha_creacion >= desde,
    ).scalar() or 1  # evitar div/0
    mtbf_h = round((horas_periodo * n_equipos) / n_fallas, 2)

    disponibilidad = round(mtbf_h / (mtbf_h + mttr_h) * 100, 2) if (mtbf_h + mttr_h) else 0

    backlog = db.query(func.count(OrdenServicio.id)).filter(
        OrdenServicio.estado.in_(["pendiente", "en_progreso"]),
        OrdenServicio.fecha_creacion <= datetime.utcnow() - timedelta(hours=72),
    ).scalar() or 0

    return DashboardKPIsOut(
        mtbf_horas=mtbf_h,
        mttr_horas=mttr_h,
        disponibilidad_pct=disponibilidad,
        backlog_ordenes=backlog,
        periodo_dias=periodo_dias,
        calculado_en=datetime.utcnow(),
    )


@router.get("/equipos-recientes", response_model=List[EquipoRecienteOut])
def equipos_recientes(
    limit: int = Query(20, ge=1, le=100),
    zona_id: Optional[int] = None,
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    _u=Depends(get_current_user),
):
    """
    Últimos equipos modificados/editados. Formato idéntico al inventario
    (/api/equipos) para reutilizar el componente <EquipoTable />.
    Ordenados por fecha_actualizacion DESC.
    """
    query = db.query(Equipo).filter(Equipo.activo == True)

    if zona_id is not None:
        query = query.filter(Equipo.zona_id == zona_id)
    if estado:
        query = query.filter(Equipo.estado == estado)
    if tipo:
        query = query.filter(Equipo.tipo == tipo)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Equipo.numero_inventario.ilike(like))
            | (Equipo.numero_serie.ilike(like))
            | (Equipo.nombre.ilike(like))
            | (Equipo.modelo.ilike(like))
        )

    rows = query.order_by(desc(Equipo.fecha_actualizacion)).limit(limit).all()
    return [EquipoRecienteOut.from_orm(r) for r in rows]
```

### 5.2 Backend — `schemas/dashboard.py`

```python
# sigab-backend/schemas/dashboard.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ZonaStatOut(BaseModel):
    zona_id: int
    zona: str
    coord_x: float
    coord_y: float
    total: int
    operativos: int
    en_mantto: int
    fuera: int
    baja: int

    @property
    def color(self) -> str:
        if self.fuera > 0:
            return "red"
        if self.en_mantto > 0:
            return "amber"
        return "emerald"


class DashboardKPIsOut(BaseModel):
    mtbf_horas: float
    mttr_horas: float
    disponibilidad_pct: float
    backlog_ordenes: int
    periodo_dias: int
    calculado_en: datetime


class EquipoRecienteOut(BaseModel):
    id: int
    numero_inventario: str
    numero_serie: str
    codigo_qr: str
    nombre: str
    modelo: Optional[str]
    marca: Optional[str]
    zona_id: int
    zona_nombre: Optional[str]
    estado: str
    tipo: str
    ultima_orden_id: Optional[int]
    fecha_actualizacion: datetime

    class Config:
        from_attributes = True
```

### 5.3 Frontend — `pages/Dashboard.jsx` (refactor v2)

```jsx
// sigab-frontend/src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import Layout from "../components/layout/Layout";
import HospitalMap from "../components/HospitalMap";
import EquipoTable from "../components/EquipoTable";
import FilterBar from "../components/FilterBar";
import { KpiCard } from "../components/cards/KpiCard";
import { api } from "../services/api";
import { useSSE } from "../hooks/useSSE";

export default function Dashboard() {
  const [zonas, setZonas] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [filters, setFilters] = useState({ zona_id: null, estado: null, tipo: null, q: "" });
  const [loading, setLoading] = useState(true);

  // Carga inicial
  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        setLoading(true);
        const [zRes, kRes, rRes] = await Promise.all([
          api.get("/api/dashboard/zonas-mapa"),
          api.get("/api/dashboard/kpis-industria40", { params: { periodo_dias: 30 } }),
          api.get("/api/dashboard/equipos-recientes", { params: { limit: 20 } }),
        ]);
        if (cancel) return;
        setZonas(zRes.data);
        setKpis(kRes.data);
        setRecientes(rRes.data);
      } catch (e) {
        toast.error("No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, []);

  // SSE: actualizar mapa y recientes en tiempo real
  useSSE("/api/events/dashboard", (evt) => {
    if (evt.type === "equipo_actualizado" || evt.type === "orden_cerrada") {
      api.get("/api/dashboard/zonas-mapa").then((r) => setZonas(r.data));
      api.get("/api/dashboard/equipos-recientes", { params: { limit: 20 } }).then((r) => setRecientes(r.data));
    }
  });

  // Filtro sobre recientes
  const recientesFiltrados = useMemo(() => {
    return recientes.filter((e) => {
      if (filters.zona_id && e.zona_id !== filters.zona_id) return false;
      if (filters.estado && e.estado !== filters.estado) return false;
      if (filters.tipo && e.tipo !== filters.tipo) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (
          !e.numero_inventario.toLowerCase().includes(q) &&
          !e.numero_serie.toLowerCase().includes(q) &&
          !(e.nombre || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [recientes, filters]);

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto space-y-6 p-4 md:p-6">
        {/* Título */}
        <header className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">HGR No.1 IMSS Tijuana · Clínica 1 · Conservación</p>
          </div>
          <span className="text-xs text-slate-400">Actualizado en tiempo real · SSE</span>
        </header>

        {/* 1. MAPA DE ZONAS */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Mapa de Zonas</h2>
          <HospitalMap zonas={zonas} loading={loading} />
        </section>

        {/* 2. KPIs INDUSTRIA 4.0 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="MTBF"
            value={kpis ? `${kpis.mtbf_horas.toFixed(0)} h` : "—"}
            hint="Tiempo medio entre fallas (30d)"
            accent="emerald"
          />
          <KpiCard
            title="MTTR"
            value={kpis ? `${kpis.mttr_horas.toFixed(1)} h` : "—"}
            hint="Tiempo medio de reparación"
            accent="blue"
          />
          <KpiCard
            title="Disponibilidad"
            value={kpis ? `${kpis.disponibilidad_pct.toFixed(1)}%` : "—"}
            hint="MTBF / (MTBF + MTTR)"
            accent="indigo"
          />
          <KpiCard
            title="Backlog"
            value={kpis?.backlog_ordenes ?? "—"}
            hint="Órdenes > 72 h sin cerrar"
            accent={kpis && kpis.backlog_ordenes > 10 ? "red" : "slate"}
          />
        </section>

        {/* 3. EQUIPOS RECIENTES */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">
              Equipos recientes <span className="text-slate-400 font-normal text-sm">(últimos modificados)</span>
            </h2>
            <a href="/equipos" className="text-sm text-imss-blue hover:underline">
              Ver inventario completo →
            </a>
          </div>

          <FilterBar
            zonas={zonas}
            onChange={setFilters}
            showReciente={true}
          />

          <EquipoTable
            data={recientesFiltrados}
            loading={loading}
            dense={true}
            emptyText="No hay equipos modificados recientemente"
            columns={[
              "numero_inventario",
              "nombre",
              "zona_nombre",
              "estado",
              "fecha_actualizacion",
              "acciones",
            ]}
          />
        </section>
      </div>
    </Layout>
  );
}
```

### 5.4 Frontend — `components/cards/KpiCard.jsx`

```jsx
// sigab-frontend/src/components/cards/KpiCard.jsx
const ACCENTS = {
  emerald: "border-emerald-500 bg-emerald-50 text-emerald-800",
  blue:    "border-imss-blue bg-blue-50 text-imss-blue",
  indigo:  "border-indigo-500 bg-indigo-50 text-indigo-800",
  red:     "border-red-500 bg-red-50 text-red-800",
  slate:   "border-slate-300 bg-slate-50 text-slate-700",
};

export function KpiCard({ title, value, hint, accent = "blue" }) {
  return (
    <div className={`rounded-xl border-l-4 ${ACCENTS[accent]} bg-white shadow-sm p-5 transition hover:shadow-md`}>
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{title}</div>
      <div className="text-3xl font-extrabold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{hint}</div>
    </div>
  );
}
```

### 5.5 Frontend — `components/HospitalMap.jsx` (refuerzo para el mapa de zonas)

```jsx
// sigab-frontend/src/components/HospitalMap.jsx
import { useNavigate } from "react-router-dom";

const statusColor = (z) => {
  if (z.fuera > 0) return "bg-red-500";
  if (z.en_mantto > 0) return "bg-amber-500";
  if (z.operativos > 0) return "bg-emerald-500";
  return "bg-slate-300";
};

export default function HospitalMap({ zonas, loading }) {
  const nav = useNavigate();

  if (loading) {
    return <div className="h-80 bg-slate-100 animate-pulse rounded-lg" />;
  }

  return (
    <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden border border-slate-200">
      {/* Silueta del hospital (SVG background) */}
      <svg viewBox="0 0 1600 900" className="absolute inset-0 w-full h-full opacity-10">
        <rect x="100" y="100" width="1400" height="700" fill="none" stroke="#334155" strokeWidth="3" rx="16" />
      </svg>

      {/* Zonas como círculos con conteo */}
      {zonas.map((z) => (
        <button
          key={z.zona_id}
          onClick={() => nav(`/equipos?zona_id=${z.zona_id}`)}
          style={{ left: `${z.coord_x}%`, top: `${z.coord_y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 group"
        >
          <div className={`relative w-20 h-20 rounded-full ${statusColor(z)} shadow-lg flex items-center justify-center text-white font-bold text-lg border-4 border-white transition group-hover:scale-110`}>
            {z.total}
            {z.fuera > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-xs flex items-center justify-center animate-pulse">
                !
              </span>
            )}
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-700 whitespace-nowrap">
            {z.zona}
          </div>
        </button>
      ))}
    </div>
  );
}
```

### 5.6 Migration SQL — asegurar columnas necesarias

```sql
-- migrations/007_dashboard_v2.sql
-- Coordenadas de zona para el mapa interactivo
ALTER TABLE zonas
    ADD COLUMN IF NOT EXISTS coord_x DECIMAL(5,2) DEFAULT 50.00,
    ADD COLUMN IF NOT EXISTS coord_y DECIMAL(5,2) DEFAULT 50.00;

-- Índice para ordenamiento por reciente modificación
CREATE INDEX IF NOT EXISTS idx_equipos_fecha_actualizacion
    ON equipos (fecha_actualizacion DESC);

-- Coordenadas por defecto para las 6 zonas (ajustar después in-situ con Carlos)
UPDATE zonas SET coord_x = 20.0, coord_y = 30.0 WHERE nombre = 'Urgencias';
UPDATE zonas SET coord_x = 50.0, coord_y = 25.0 WHERE nombre = 'Imagenología';
UPDATE zonas SET coord_x = 80.0, coord_y = 30.0 WHERE nombre = 'UCI';
UPDATE zonas SET coord_x = 20.0, coord_y = 70.0 WHERE nombre = 'Quirófano';
UPDATE zonas SET coord_x = 50.0, coord_y = 75.0 WHERE nombre = 'Laboratorio';
UPDATE zonas SET coord_x = 80.0, coord_y = 70.0 WHERE nombre = 'Consulta Externa';
```

---

## 6. Lunes 20 · abril — Ensayo Ambigu

### 6.1 13:00 · Auditoría final de datos
- Revisar datos recolectados viernes (Carlos), sábado (técnicos) y domingo (pruebas)
- Validar que no haya órdenes huérfanas (sin equipo referenciado)
- Generar reporte NOM-016 del fin de semana (evidencia para el auditor)

### 6.2 14:00 · Setup en el Ambigu
- [ ] Llegar 1 h antes (13:00)
- [ ] Proyector conectado (HDMI), resolución 1920×1080
- [ ] Asus TUF + ThinkCentre (remoto vía VPN) AMBOS listos
- [ ] Internet de respaldo para Asus (si Ambigu tiene WiFi)
- [ ] Control remoto / clicker probado
- [ ] Agua y caramelos para la voz

### 6.3 Checklist del Ensayo (15 min demo · 10 min Q&A)

```
PRE-DEMO
☐ Browser en modo incógnito, sin extensiones
☐ Zoom del browser a 110% (legibilidad desde el fondo)
☐ Notificaciones silenciadas (Slack, Teams, WhatsApp)
☐ Música de fondo OFF
☐ Batería laptop ≥ 80% + cargador conectado
☐ Dashboard pre-cargado con datos reales del piloto

FLUJO DE DEMOSTRACIÓN (en orden estricto)
☐ 00:00 – Login ADMIN001 (15 s)
☐ 00:15 – Dashboard v2: Mapa de Zonas (2 min)
           · Clic en zona "Quirófano" (roja) → filtra equipos
☐ 02:15 – KPIs Industria 4.0 (1 min)
           · Leer MTBF, MTTR, Disponibilidad y Backlog en voz alta
☐ 03:15 – Equipos recientes (filtros) (1 min)
           · Filtrar por estado=fuera_servicio
☐ 04:15 – Equipos → detalle + Triple Validación (2 min)
☐ 06:15 – Crear orden desde foto WhatsApp (EN VIVO) ⭐ (3 min)
           · Enviar foto desde teléfono Carlos
           · Ver aparecer en Dashboard en < 30 s
☐ 09:15 – Subjefe valida, asigna técnico, cierra (2 min)
☐ 11:15 – Generar PDF NOM-016 + hash SHA-256 (1.5 min)
☐ 12:45 – Trazabilidad: cadena inmutable (1 min)
☐ 13:45 – Copilot IA: "¿Qué equipos requieren preventivo esta semana?" (1 min)
☐ 14:45 – Reporte ejecutivo PDF mensual (15 s)
☐ 15:00 – FIN DEMO. Preguntas.

POST-DEMO
☐ Preguntas frecuentes preparadas (ver §7)
☐ Hoja de feedback impresa (3 copias)
☐ Guardar grabación del ensayo (Zoom o OBS) para revisión
```

### 6.4 Q&A típicas — respuestas ya preparadas

| Pregunta esperada | Respuesta corta |
|---|---|
| ¿Cómo funciona sin internet? | Stack 100% on-premise: MySQL + Ollama + PaddleOCR + Whisper corren localmente. Única dependencia externa: un teléfono del IMSS con WhatsApp Business, conectado por USB al servidor. |
| ¿Qué pasa si se va la luz? | UPS da 10 min de autonomía. MySQL con modo ACID recupera al reinicio. Docker arranca automáticamente con systemd. |
| ¿Cumple LFPDPPP? | Sí. Ningún dato sale de la LAN del hospital. Sin nube. Sin telemetría. Sin tracking. |
| ¿Cuánto tarda la IA en responder? | Primera consulta 8–12 s (carga modelo). Consultas subsecuentes 2–3 s. Gemma 3 4B cuantizado. |
| ¿Puede reportar a COFEPRIS? | Sí. Módulo Tecnovigilancia genera el Formato NOM-240 exportable. |
| ¿Cuánto cuesta mantener? | Licencia anual $120K (soporte + actualizaciones). Hardware es del hospital. Cero costo por consulta IA. |

---

## 7. Martes 21 · abril — Presentación oficial

Documento separado. Usar el **Guion Demo Carlos Oswaldo** + **Resumen Ejecutivo** + **One-Pager Visual** + **Diagrama Flujo Operativo** ya generados.

---

## 8. Criterios de éxito — sáb/dom/lun

| Criterio | Medición | Umbral |
|---|---|---|
| ThinkCentre responde | `ping sigab-server.imss.local` | 100% |
| Dashboard accesible desde 3 PCs del área | HTTP 200 en 5173 | 100% |
| Datos IMSS importados | `SELECT COUNT(*) FROM equipos` | ≥ 200 |
| Órdenes por WhatsApp | Creadas sin intervención manual | ≥ 15 durante fin de semana |
| Tiempo de captura de orden | Desde foto enviada hasta folio en BD | < 2 min |
| Auditoría hash chain | `python scripts/verify_chain.py` | 100% íntegra |
| MTBF/MTTR desplegándose | Valores numéricos, no "—" | ✅ |
| Filtro "Modificación reciente" en Equipos | Ordena DESC por `fecha_actualizacion` | ✅ |

---

## 9. Mitigación de riesgos — sábado

| Riesgo | Mitigación |
|---|---|
| Punto de red sin DHCP del IMSS | Tener PC portátil como hotspot de respaldo para configurar SSH |
| BD del área en formato inesperado (Access, CSV mal separado) | Traer script `scripts/import_inventario_imss.py` con detector automático de formato |
| No hay HDMI en el monitor del área | Traer adaptador HDMI→VGA |
| El bot WhatsApp no se autentica | Plan B: captura manual temporal vía formulario web. Documentar como "pendiente" |
| Carlos no está disponible el sábado | Ejecutar con personal en turno. Enviar video screen-recording del resultado a Carlos por la noche. |
| Rendimiento lento del ThinkCentre (M720q con 8 GB) | Bajar modelo Gemma 3 de 4B → 1B temporalmente. Dejar ajuste documentado. |

---

## 10. Contacto de emergencia

- **Gustavo Aguilar Urias** (implementador) — cel <privado>
- **Ing. Carlos Oswaldo** (validador IMSS) — <en directorio>
- **Soporte Claude (remoto)** — esta sesión + memorias en `/sessions/relaxed-jolly-einstein/mnt/.auto-memory/`

---

> **Próximo hito tras este plan:** Martes 21 · Ambigu · presentación oficial SIGAB V2.0.
> **Próximo hito del piloto:** Viernes 24 · evaluación 1 semana de operación con métricas reales.

🤖 *Documento generado por Arquitecto IA — revisión humana requerida antes de ejecución.*
