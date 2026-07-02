# SIGAB v4.0 — Consolidación del código y mapa del ecosistema

> Generado 2026-07-02 durante la consolidación pre-piloto. Fuente de verdad
> sobre qué rama es qué, qué máquina corre qué, y dónde quedó cada pieza de
> trabajo. Si tocas ramas o despliegas, lee esto primero.

## 1. Qué es `v4.0/piloto-clinica-1`

Rama oficial del piloto en la Clínica/HGR No. 1 IMSS Tijuana. Se construyó
unificando TODO el trabajo disperso del ecosistema:

```
main (histórica, 2026-05)
 └─ pulido/2026-06-16 (línea REAL de producción, vivía solo en el VPS)
     ├─ … calendario Reservas, tipo_adquisicion, badges, landing, import 2026 …
     └─ vps/pulido-2026-07-01  ← respaldo íntegro del working tree del VPS
         └─ v4.0/piloto-clinica-1  ← ESTA rama
             + fix PDFs/descargas iOS-Android (9bc2935)
             + merge feat/expediente-equipo-2026 (tabla equipo_documentos,
               endpoint /expediente, ficha Contrato y Documentos)
             + cherry-picks feat/piloto-hgr1-batch-endpoints (2 endpoints
               batch QR/Excel + 17 tests) y fix/t8-zonecards (timeout mapa)
             + rescate de código nunca versionado del VPS (admin_contratos,
               tests, scripts de piloto) y de la ASUS (piloto_hgr1/,
               generate_referencial.py, fix tooltip HospitalMap)
```

**Advertencia histórica:** `feat/ui-cinematic` es una rama SOLO-frontend
(no contiene `sigab-backend/`). `autocycle/v3.0` fue una línea divergente
sin calendario que causó una regresión al desplegarse por error el 29-jun.
La línea con backend real siempre fue `pulido/2026-06-16` → `vps/pulido-*`
→ `v4.0/*`. El nombre "v3.0" en docs/releases se refiere a la migración de
tema dark→Verde-Blanco IMSS, no a una rama.

## 2. Mapa de máquinas

| Máquina | Rol | Repo | Rama | Notas |
|---|---|---|---|---|
| VPS Bluehost (`sigab-vps`, 100.107.39.80) | Producción viva (sslip.io) | `/opt/sigab` | `pulido/2026-06-16` local ≡ `vps/pulido-2026-07-01` en origin | El dist servido sale de `sigab-frontend/dist` (nginx). La rama local origin homónima DIVERGIÓ (~150 commits duplicados, historia reescrita) — por eso el respaldo vive como `vps/pulido-2026-07-01`. |
| VPS ídem | Autocycle (agente headless) | `/opt/sigab-v3` | `autocycle/ui-cinematic` | Propone a `autocycle/ui-cinematic`, NUNCA toca prod. |
| ASUS TUF (`asus-gustavo`) | Desarrollo Gustavo | `Desktop/Bioingeneria/SIGAB` | `security/hardening-2026-06-20` | 16 worktrees en `.claude/worktrees/` (ver §4). |
| ASUS ídem | Consolidación v4.0 | `~/sigab-v4` | `v4.0/piloto-clinica-1` | Clon de trabajo de esta consolidación + preview localhost:4173. |
| ThinkCentre M720q (`sigah-thinkcentre-m720q`, 100.98.18.51) | Nodo edge 24/7 (réplica) | `/opt/sigab` | `hermes/thinkcentre-*` | Provisionado 01-jul (docker, Claude Code, ufw solo-tailnet). NO corre la stack; réplica + agente. |

Acceso entre nodos: SSH clásico por llaves sobre Tailscale. **NUNCA correr
`tailscale up --ssh` en el VPS** (reencamina el puerto 22 y corta el acceso).

## 3. Estado de ramas (censo 2026-07-02)

### Integradas en v4.0
`vps/pulido-2026-07-01` (base) · `feat/expediente-equipo-2026` (merge) ·
`feat/piloto-hgr1-batch-endpoints` (cherry-pick f75ea0d+852ad5c) ·
`fix/t8-zonecards-2026-06-24` (cherry-pick 0d976ec) · fix PDFs iOS (nuevo).

### Respaldadas en GitHub, pendientes de revisión humana
Estaban SOLO en el disco de la ASUS; hoy existen en origin con su nombre:

| Rama | Contenido | Recomendación |
|---|---|---|
| `fase4a-minimax-layer` | Capa integración MiniMax M3: router híbrido + circuit breaker | Evaluar para v4.1 (IA) |
| `feat/router-ia-hibrida` | Router Ollama local ↔ MiniMax nube con fallback | Junto con la anterior |
| `fix/bugs-bloqueantes-ia` | 2 bugs IA/bot + plan migración edge ThinkCentre | Revisar si sigue vigente |
| `fase1-tests-fix` | Fixes de aserciones de tests de equipos | Cherry-pick fácil a v4.0 |
| `worktree-fix-tenant-tests-session` | Fix suite multi-tenant (fixture session) | Ídem |
| `fix/traefik-sigab-domain` | WIP config IA/copilot/gemma + sigab-monitor | WIP, revisar |
| `worktree-feat-pistola-hid-scanner` | WIP marcado físico / pistola HID | WIP del piloto |
| `worktree-cleanup-deps-weekend-plan` | Panel SuperAdmin SIGAH (fase 3) | Evaluar |
| `worktree-fase5-formatos-scaffold`, `worktree-sigab-bot-jwt-auth`, `worktree-sileo-themes`, `worktree-sigah-worker-loop`, `worktree-sigab-fullstack-polish`, `worktree-sigah-github-setup`, `worktree-sigah-stitch-workflow-setup`, `worktree-silly-sleeping-engelbart` | Trabajo histórico de worktrees ya mayormente re-implementado en la línea pulido | Probablemente muertas; confirmar y borrar |
| `vps-prod-snapshot-2026-06-08`, `backup/vps-20260530`, `backup/asus/feat/sileo-toasts-hermes-context` | Snapshots históricos | Conservar como archivo |
| `security/hardening-2026-06-20` | Rama activa de la ASUS (tooltip mapa + piloto_hgr1) | Su contenido único ya se rescató a v4.0 |

### Muertas / no usar
`autocycle/v3.0` (divergente sin calendario, causó la regresión del 29-jun) ·
`pulido/2026-06-16` de ORIGIN (historia vieja reescrita; la real es
`vps/pulido-2026-07-01`) · `feat/ui-cinematic` (solo-frontend; congelada tras
recibir los cherry-picks del 01-jul — el frontend canónico ahora vive en v4.0).

## 4. Worktrees de la ASUS (`.claude/worktrees/`)

16 worktrees históricos de sesiones multi-agente. Sus ramas ya están TODAS
respaldadas en GitHub (censo §3). Política: los que estén limpios pueden
borrarse con `git worktree remove <path>`; los que tengan cambios sin
commitear se conservan hasta rescatarlos. El worktree del VPS
`/root/wt-expediente` queda como checkout de referencia del expediente;
`/root/merge-20260701` (scratch de la consolidación) ya se eliminó.

## 5. Deploy y preview

- **Preview local (ASUS):** `~/sigab-v4/sigab-frontend && npx vite preview
  --port 4173` + túnel `ssh -N -L 8000:127.0.0.1:8000 sigab-bluehost`
  (backend REAL de producción — cuidado con escrituras).
- **Deploy prod:** build de `v4.0/piloto-clinica-1` → `cp -r dist dist.bak-<ts>`
  → `rsync -a dist/ /opt/sigab/sigab-frontend/dist/` en el VPS. Verificar
  SIEMPRE antes: `grep -rl ActividadHeatmap dist/assets` (calendario presente).
  Rollback: `rsync -a --delete dist.bak-<ts>/ dist/`.
- El backend en prod corre en contenedor con imagen horneada: cambios de
  backend requieren rebuild del contenedor, no basta editar `/opt/sigab`.

## 6. Diseño v4.0 (Google Stitch)

Proyecto **"SIGAB v4.0 Piloto HGR1"** — https://stitch.withgoogle.com/projects/7684283430601085634
Design system "Verde-Blanco IMSS": Inter, roundness 8, primary `#047857`,
secondary `#065F46`, tertiary `#E0F0E9`, neutral `#F8FAF9`, targets táctiles 48px.

| Pantalla | Screen ID |
|---|---|
| Dashboard desktop (KPIs, gráfica 30d, alertas) | `f0a7d832f5c54a9491da2f699e137490` |
| Equipos (filtros criticidad/adquisición, badges, QR) | `aa22f6401767433fbaf79ca5362948cf` |
| Orden de servicio NOM-016 (checklist, firmas, PDF) | `2f2602417a2d44a0bfe33051e267fe48` |
| Dashboard móvil + bottom-bar con Escanear central | `8af028299b1c4cd4af17babd042028b8` |
| Detalle de equipo (expediente, historial por serie) | `f9b01c3c7232494e9bb95899c10d40b2` |

Pendiente: pantalla de Reservas (timeouts del servidor Stitch, 5 intentos) y
variantes móviles de Equipos/Detalle/Orden. Nota MCP: `list_screens` devuelve
vacío para este proyecto (bug); usar `get_screen` por ID.

## 7. Pendientes conocidos hacia el piloto

1. Probar fix de PDFs en iPhone/iPad reales (post-deploy).
2. Implementar en código el pulido visual de las pantallas Stitch.
3. Recortar bundle de gráficas (1.3 MB / 361 kB gzip).
4. Generar pantalla Stitch de Reservas cuando el servidor coopere.
5. Revisar ramas "pendientes de revisión" (§3) — decidir merge o cierre.
6. `claude login` en ThinkCentre + agregar `gustavo` al grupo docker.
7. Decidir repo espejo `SIGAB-v4` en GitHub (opcional; esta rama ya es la
   fuente de verdad).
