# SIGAH — Directriz de Contextualización para Agentes LLM

**SIGAH — Sistema Integral de Activos Hospitalarios** (plataforma SaaS B2B multi-tenant)
**Instancia desplegada actual:** SIGAB V2.0 on-premise — HGR No. 1 IMSS Tijuana
Versión: 2.0 (instancia HGR) | Fecha: Mayo 2026 | Fase actual del proyecto: Fase 0

> **Nota de transición SIGAB → SIGAH.** SIGAH es la empresa y la plataforma SaaS multi-tenant en construcción (S. de R.L. de C.V. + RESICO PM, infraestructura Hetzner Cloud). SIGAB es la instancia on-premise actualmente desplegada en HGR No.1, que se conserva como cliente ancla y como referencia técnica de los módulos ya construidos. La descripción técnica que sigue aplica a esa instancia. Para la visión SaaS objetivo, ver `docs/SIGAH/Plan_de_Trabajo_Maestro_SIGAH.docx`.

## 1. Identidad del Sistema

La instancia desplegada actualmente, llamada SIGAB, es una plataforma web de gestión de activos biomédicos desarrollada por estudiantes de la Universidad Xochicalco para el HGR No. 1 del IMSS en Tijuana, Baja California. El sistema corre 100% on-premise en un VPS Bluehost (16GB RAM, 8 vCPU, NVMe) accesible en https://sigab.129-121-100-147.sslip.io. **No envía datos a la nube.** Todo el procesamiento de IA ocurre localmente mediante Ollama. Este servicio se conserva sin cambios mientras se construye la plataforma SIGAH SaaS.

## 2. Infraestructura Técnica

- **Frontend:** React + Vite + TailwindCSS (bundle 2.85 MB, 4681 módulos)
- **Backend:** FastAPI (Python 3.11) + uvicorn, ~30 rutas `/api/*`
- **Base de datos:** MySQL 8.0 — base `sigab` con 19 tablas
- **Reverse proxy:** Traefik v3 + Let's Encrypt (HTTPS automático)
- **Agente IA:** OpenClaw 2026.3.13 gateway en https://usg.tpf.mybluehost.me
- **LLM local (Ollama):**
  - `qwen2.5:7b-instruct-q4_K_M` (4.7 GB, 32k contexto) — razonamiento complejo primario
  - `gemma3:4b` / `gemma3-sigab` (3.3 GB, 32k contexto) — secundario con capacidad visual
- **Mensajería:** Bot de Telegram `@sigab_imss_tj_bot` → OpenClaw → Ollama
- **Contenedores Docker:** `sigab-frontend`, `sigab-backend`, `sigab-mysql`, `openclaw`, `traefik`

## 3. Base de datos — estado real

Base `sigab` (MySQL 8.0) — 19 tablas: `equipos` (778), `usuarios` (5), `ubicaciones`, `zonas_mapa` (11), `alertas`, `capacitaciones`, `ordenes_servicio` (244), `os_casillas`, `os_evidencias`, `os_materiales`, `preventivos_programados`, `metrologia_calibracion`, `refacciones_almacen`, `reservas`, `tecnovigilancia_eventos`, `tecnovigilancia_evidencias`, `trazabilidad`, `poka_yoke_logs`, `log_actividad` / `log_auditoria_nom016`.

**Estado actual del inventario:**
- Total equipos: **778** · Operativos: **774** (99.5%) · Mantenimiento: **3** · Fuera de servicio: **1**
- Tickets abiertos: **244** · Alertas pendientes: **0** · Preventivos vencidos: **0**

## 4. Módulos funcionales

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/dashboard` | Resumen ejecutivo, KPIs, mapa de zonas |
| Inventario | `/equipos` | Tabla + tarjetas de 778 equipos con fotos |
| Escanear QR | `/qr-scanner` | Cámara web/móvil, jsqr, redirección a equipo |
| Órdenes | `/ordenes` | Gestión de órdenes de servicio/mantenimiento |
| Preventivos | `/preventivos` | Programación de mantenimiento preventivo |
| Alertas | `/alertas` | Centro de alertas del sistema |
| Reportes | `/reportes` | Generación de reportes PDF/Excel |
| Tecnovigilancia | `/tecnovigilancia` | Eventos adversos NOM-240 |
| Copilot IA | `/copilot` | Chat con LLM local, diagnóstico de fallas |

## 5. Capacidades del agente SIGAB

### 5.1 Copilot web (`/copilot`)
- **Diagnóstico de falla:** LLM sugiere causas, verificaciones y acciones correctivas
- **Visión (Gemma 3):** sube foto de etiqueta o reporte de servicio → extracción automática
- **Resumen ejecutivo IA:** análisis del estado SIGAB → resumen narrativo para jefatura
- **Chat libre:** preguntas sobre equipos, mantenimiento, NOM-016, NOM-240, ISO 13485
- **Contexto configurable:** General, Mantenimiento, NOM-016, Diagnóstico

### 5.2 Bot Telegram `@sigab_imss_tj_bot`
- Conectado a OpenClaw Gateway → Ollama qwen2.5:7b
- Comandos: `/status`, `/help`, `/new`, `/reset`, `/model`, `/fast`, `/verbose`, `/think`
- Modo: polling (no webhook)
- Política DM: abierta

## 6. Normativas aplicables

- **NOM-016-SSA3-2012** — Gestión de tecnología biomédica
- **NOM-240-SSA1-2012** — Tecnovigilancia
- **ISO 13485:2016** — QMS para dispositivos médicos
- **IEC 60601** — Seguridad eléctrica biomédica
- **MTBF / MTTR** — Indicadores de confiabilidad
- **Poka-Yoke** — Prevención de errores en mantenimiento

## 7. Usuarios del sistema

| Rol | Descripción |
|---|---|
| Administrador SIGAB | Acceso total, gestión de usuarios y configuración |
| Ingeniero Biomédico | Gestión de equipos, órdenes, mantenimiento |
| Técnico | Ejecución de órdenes, registro de actividades |
| Jefe de Departamento | Reportes ejecutivos, dashboard, tecnovigilancia |
| Enfermería / Operativo | Consulta de equipos, reporte de fallas |

Credenciales demo: `ADMIN001 / sigab_admin_2026`

## 8. Contexto hospitalario

- **Hospital:** HGR No. 1 IMSS Tijuana, Baja California
- **Servicio:** Depto. de Ingeniería Biomédica / Ingeniería Clínica
- **Zonas:** 11 zonas (Lab Clínico, UCIN, Radiología, Urgencias, Quirófano, Hemodinamia, etc.)
- **Equipos típicos:** monitores, ventiladores, desfibriladores, bombas de infusión, analizadores, equipos de imagen, electrocirugía
- **Imágenes:** 345 MB fotos equipos (`/static/uploads/FOTOSEQUIPO/`) + 279 MB evidencias (`/static/uploads/ORDENESIMSS/`)

## 9. System prompt para agentes LLM

Ver `workspace/SOUL.md`, `workspace/IDENTITY.md` y `workspace/USER.md` en el volumen `openclaw_data`. Esos archivos definen la identidad *SIGAB Copilot* y el contexto institucional que carga OpenClaw automáticamente.

## 10. Variables de entorno clave (VPS)

```bash
# Backend SIGAB
SIGAB_OLLAMA_HOST=http://host-gateway:11434
SIGAB_PUBLIC_BASE_URL=https://sigab.129-121-100-147.sslip.io
SIGAB_GEMMA_MODEL=gemma3:4b
SIGAB_QWEN_MODEL=qwen2.5:7b

# Ollama (systemd override)
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_ORIGINS=*
OLLAMA_KEEP_ALIVE=30m

# OpenClaw (dentro del contenedor)
OLLAMA_API_KEY=ollama-local
OLLAMA_HOST=http://172.17.0.1:11434
```

---

## 11. Contexto SIGAH (empresa y plataforma SaaS)

- **Empresa:** SIGAH — co-fundada por **Gustavo López Carballo** (CEO, ingeniero biomédico) y **Ing. Carlos Oswaldo Ramírez González** (subjefe de Conservación, HGR No.1).
- **Figura legal propuesta:** S. de R.L. de C.V. con régimen RESICO PM. Ver `docs/SIGAH/Propuesta_Fiscal_SAT_SIGAH.docx`.
- **Infraestructura objetivo:** Hetzner Cloud (CX32 / CX42) + Edge Nodes en cada hospital cliente. Ver `docs/SIGAH/Calculo_de_Costos_Cloud_IA_SIGAH.docx`.
- **Modelo comercial:** Setup Fee único $15K-$25K MXN + mensualidad $3.5K-$5K MXN por hospital.
- **Roadmap:** 7 fases en 24 semanas. Ver `docs/SIGAH/Plan_de_Trabajo_Maestro_SIGAH.docx`.
- **Formatos operativos SIGAH:** 4 plantillas + especificación de salida del sistema. Ver `docs/SIGAH/Formato_*.docx` y `Especificacion_Formatos_SIGAH.docx`.

## 12. Cómo distinguir referencias en el repo

- Cuando el código o doc dice **SIGAB**, se refiere a la instancia desplegada en HGR No.1 (legacy/single-tenant). Mantener.
- Cuando se habla de **SIGAH**, se refiere a la plataforma SaaS multi-tenant en construcción y a la empresa.
- Carpetas con prefijo `sigab-` (sigab-backend, sigab-frontend, sigab-bot) se renombran a `sigah-` en Fase 1 cuando empiece la migración multi-tenant — hacerlo antes rompería los servicios en producción.

---
_Este documento es la referencia institucional de contexto para los agentes LLM que trabajan sobre el repositorio SIGAH/SIGAB. Úsalo al arrancar conversaciones sobre el proyecto._
