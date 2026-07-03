# Contexto compartido — memoria común de los agentes SIGAB/SIGAH

> Destilado de las sesiones de consolidación (jun-jul 2026). TODO agente lo
> lee antes de trabajar. Si algo de aquí resulta falso, corrígelo en el mismo
> commit en que lo descubras.

## Qué es esto
- **SIGAH** = la empresa/plataforma SaaS. **SIGAB** = la app de gestión de
  activos biomédicos. Cliente piloto: **Clínica/HGR No. 1 IMSS Tijuana**
  (~881 equipos reales, datos de pacientes → producción se trata como
  hospital, no como demo). Deadline comercial IMSS: nov-2026.
- **Pragma AI** = el entorno/homelab de agentes de Gustavo (ThinkCentre 24/7
  como nodo central, ASUS como estación de desarrollo/gaming, VPS como prod).

## Versión y ramas (vigente 2026-07-03)
- Prod full-stack corre **v4.0.0** = rama `v4.0/piloto-clinica-1` del repo
  `djpiyama123-droid/SIGAB-Test-2` (público). Espejo limpio y privado:
  `djpiyama123-droid/SIGAB-v4` (main; snapshots del loop).
- `VERSION` + `versions.json` + `docs/releases/` = trazabilidad. El panel
  superadmin la muestra. Si algo "no se mira bien" en la app, la entrada de
  versión dice qué se tocó, qué verificar y cómo revertir.
- Ramas muertas: `autocycle/v3.0` (regresión 29-jun), `pulido/2026-06-16` de
  origin (historia reescrita). `feat/ui-cinematic` = congelada, solo-frontend.
- "v3.0" en docs viejos = la migración de tema dark→Verde-Blanco IMSS, NO una
  versión de la app.

## Máquinas y accesos
| Nodo | Tailscale | Rol |
|---|---|---|
| VPS Bluehost | `sigab-vps` (100.107.39.80) | Producción (docker: backend FastAPI, frontend nginx, mysql, bot, openclaw, n8n, panel) |
| ThinkCentre M720q | `sigah-thinkcentre-m720q` (100.98.18.51) | Homelab 24/7: director del loop, réplica del repo |
| ASUS TUF A16 | `asus-gustavo` (100.97.220.115) | Estación de Gustavo (desarrollo + gaming) — NO poner trabajo autónomo aquí |

SSH entre nodos: llaves clásicas sobre el tailnet. **JAMÁS `tailscale up
--ssh`** (reencamina el 22 y rompe todo el acceso).

## Reglas de producción (sangre de regresiones pasadas)
1. El dist vivo se sirve de `/opt/sigab/sigab-frontend/dist` (nginx estático).
   Deploy = build + backup `dist.bak-<ts>` + rsync. Rollback = rsync inverso.
2. Discriminador del calendario en builds: `grep -a anim-cell-pop
   assets/Reservas-*.js`. (`grep ActividadHeatmap` YA NO sirve — minificación.)
3. El backend corre imagen docker horneada: editar `/opt/sigab` NO cambia lo
   que corre; backend = rebuild + up, SOLO con OK humano, SIEMPRE con
   mysqldump previo (backups en `/root/db-backups/`).
4. Helpers PDF iOS en `api/sigab.js` (`prepararVentanaPdf`/`abrirPdf`/
   `triggerDownload`): no tocarlos sin correr el flujo en móvil — el bug de
   PDFs en iPhone fue el reclamo #1 del piloto.
5. Los metadatos de contratos (tipo_adquisicion, 881 equipos) YA están
   importados — no re-importar. `equipo_documentos` espera los PDFs
   escaneados por equipo + manifiesto (aún no existen).

## Diseño v4.0
Design system Verde-Blanco IMSS: primary `#047857`, dark `#065F46`, light
`#E0F0E9`, neutral `#F8FAF9`, Inter, roundness 8, targets táctiles 48px,
mobile-first (técnicos usan iPhone/iPad en piso). Pantallas de referencia:
proyecto Stitch `projects/7684283430601085634` (5 pantallas COMPLETE; falta
Reservas). IDs en `docs/CONSOLIDACION-V4.md` §6.

## Dónde pedir y reportar
- Backlog humano → `/home/cloud/proyectos/PETICIONES-LOOP.md` (VPS).
- Notas de deploy → `/home/cloud/proyectos/DEPLOY_*.md` (VPS).
- Alertas → Telegram vía Hermes/OpenClaw (`/v1/notify`).
- Mapa completo del ecosistema → `docs/CONSOLIDACION-V4.md`.
- Carriles y protocolo de agentes → `docs/agentes/ORQUESTACION.md`.
