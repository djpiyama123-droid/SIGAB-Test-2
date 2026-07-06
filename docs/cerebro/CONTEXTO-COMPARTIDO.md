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

## Petición directa de Gustavo — Módulo Inventario (2026-07-05)

> **Prioridad sobre el backlog genérico**: estos 5 puntos van ANTES que
> cualquier ítem de `scripts/loop/PROMPT-CICLO.md` en los próximos ciclos.
> No retomar el backlog genérico hasta cerrarlos — sigue la norma ya
> vigente de un ítem por ciclo, así que puede tomar varios ciclos, pero el
> orden de trabajo es este primero.

1. **UX general de Inventario/Equipos**: pedido explícito de Gustavo de que
   el módulo sea "más intuitivo y fácil de usar". No especificó qué
   fricciones atacar — el director elige con criterio propio, informado por
   los puntos 2-5 de abajo (que son ejemplos concretos de esa misma
   fricción).

2. ✅ **Resuelto (v4.0.15, loop-thinkcentre)**: el footer de
   `sigab-frontend/src/components/EquipoDetail.jsx` ahora tiene "🎫 Nueva OS"
   (abre `OrdenServicioRapidaModal.jsx` pre-llenado con el equipo, sin salir
   del detalle) y "🕒 Historial" (abre `HistorialEquipoModal.jsx`, que suma
   la pestaña "Preventivos" que el resumen inline del detalle no mostraba).
   Además, el campo "Estado" de la grilla de info pasó de badge de solo
   lectura a un `<select>` que llama `api.updateEquipo(id, { estado })`
   directo (optimista + rollback si falla el POST) para los 3 estados que
   Gustavo pidió explícitamente (operativo/en_mantenimiento/fuera_servicio);
   "en_traslado" y "baja" quedan fuera del quick-change a propósito porque
   dependen de otros flujos (traslados, baja definitiva), no de un simple
   cambio de campo — si el equipo ya está en uno de esos dos, el select lo
   muestra como opción deshabilitada para no perder el estado real. Pendiente
   NO cubierto: el punto 1 (UX general de Inventario) sigue abierto como
   paraguas; con los puntos 2/3/4 resueltos, el candidato que queda de la
   petición de Gustavo es el punto 5 (calendario de mantenimiento).

3. ✅ **Resuelto (v4.0.14, loop-thinkcentre)**: `sigab-frontend/src/pages/Equipos.jsx`
   ahora refleja `filtros`, `orden`, `vista` y la página actual en
   `searchParams` (efecto de sincronización + inicialización perezosa de
   cada `useState` leyendo la URL). El equipo abierto en `EquipoDetail`
   también vive en `?equipoId=` (antes se borraba de inmediato tras abrir;
   ahora persiste mientras el modal está abierto y se limpia al cerrarlo).
   Se unificó la selección de "vista tabla": `EquipoTable.jsx` tenía su
   propio `useState` interno + su propio `EquipoDetail` desconectado del de
   la vista tarjeta — se eliminó y ahora usa el `onSelect` del padre, así
   que ambas vistas comparten el mismo estado y el mismo modal. Resultado:
   abrir el detalle de un equipo, navegar a otra sección y volver a
   Inventario ahora restaura filtro, página/offset, vista y la selección
   abierta. Pendiente NO cubierto por este fix: scroll vertical de la
   lista (no persistido; alcance menor, no reportado como bloqueante).

4. ✅ **Resuelto (v4.0.13, loop-thinkcentre)**: `EquipoForm.jsx` ya tiene un
   `<select>` de "Tipo de adquisición" (sección "Mantenimiento y contrato",
   junto a proveedor/N° contrato) que usa el mismo enum que el badge de
   `EquipoDetail.jsx`. Se centralizó `TIPO_ADQ_OPTIONS` en
   `utils/constants.js` (antes vivía duplicable solo en `Equipos.jsx`) para
   que filtro, badge y formulario compartan una sola fuente de verdad.

5. **Calendario en "Próximo mantenimiento"**: hoy es un date picker simple
   (`mm/dd/yyyy`) dentro de `EquipoForm.jsx`. Gustavo quiere que esa
   sección (en el detalle, o en un apartado nuevo) muestre una vista tipo
   calendario, con el mismo patrón visual del heatmap de actividad que ya
   existe en `pages/Reservas.jsx` (componente `ActividadHeatmap`, línea
   263). Revisado el inventario Stitch en `docs/CONSOLIDACION-V4.md` §6
   (proyecto "SIGAB v4.0 Piloto HGR1"): no hay una pantalla dedicada a
   calendario de mantenimiento; las 4 variantes de "Reservas de Equipos"
   (heatmap) son la referencia visual más cercana disponible para
   reutilizar/adaptar, no una pantalla lista para copiar tal cual.
