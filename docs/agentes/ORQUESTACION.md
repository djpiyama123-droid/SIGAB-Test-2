# Orquestación de agentes — ecosistema Pragma AI / SIGAH / SIGAB

> Contrato de convivencia entre agentes. Cada agente tiene UN carril, UNA
> rama y UN harness. El director integra; nadie más despliega.

## Topología

```
                    ┌─────────────────────────────────┐
                    │  DIRECTOR: Claude Fable 5        │
                    │  ThinkCentre (homelab 24/7)      │
                    │  sigab-loop.timer cada 6h        │
                    │  · implementa pulido Stitch v4   │
                    │  · integra PRs de los workers    │
                    │  · versiona (semver + notas)     │
                    │  · ÚNICO que despliega frontend  │
                    └───────┬─────────────────────────┘
            ┌───────────────┼───────────────────┐
            ▼               ▼                   ▼
   ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ MiniMax M3     │ │ Hermes       │ │ OpenClaw          │
   │ autocycle VPS  │ │ VPS gateway  │ │ VPS contenedor    │
   │ propone en     │ │ Telegram/ops │ │ gateway IA + bot  │
   │ autocycle/v4.0 │ │ NO toca git  │ │ NO toca git       │
   └────────────────┘ └──────────────┘ └──────────────────┘
   Herramientas humanas (cuando Gustavo las usa en la ASUS):
   OpenCode → estilos/CSS · Antigravity CLI → tareas puntuales supervisadas
```

## Protocolo de ramas (regla de oro)
- `v4.0/piloto-clinica-1` — rama oficial. SOLO escriben: el director (loop) y
  Gustavo. Se despliega a prod desde aquí, nunca desde otra.
- `autocycle/v4.0` — propuestas de MiniMax (force-with-lease sobre SÍ misma,
  jamás sobre la oficial). El director las revisa cada ciclo: cherry-pick de
  lo bueno → versiona → descarta el resto.
- `hermes/*`, `opencode/*`, `antigravity/*` — carriles de cada herramienta si
  llegan a commitear. PR hacia la oficial; el director o Gustavo mergean.
- Espejo `SIGAB-v4` (privado): snapshots de la oficial; lo empuja SOLO el
  runner del loop. Nadie trabaja ahí.

## Reglas comunes a TODOS los agentes
1. Nunca `git push` a la rama oficial salvo el director.
2. Nunca desplegar a producción salvo el runner del loop (frontend) o
   Gustavo (backend/BD).
3. Nunca `tailscale up --ssh` en ningún nodo (corta el acceso SSH clásico).
4. Antes de trabajar: `git pull` + leer `docs/cerebro/CONTEXTO-COMPARTIDO.md`
   y `versions.json` (saber en qué versión vive prod).
5. Todo deploy deja nota de versión (`versions.json` + `docs/releases/`) y
   registro en `/home/cloud/proyectos/DEPLOY_*.md` del VPS.
6. Problema con otro agente (rama pisada, conflicto, servicio caído): se
   reporta por Telegram (Hermes) y se documenta en el handoff del ciclo; no
   se "arregla" apagando el servicio del otro (lección del 29-jun).

## Harness por agente
Cada agente tiene su documento en este directorio: contexto que carga,
reglas duras, memoria que persiste y cómo se mide su trabajo.
- [HARNESS-LOOP-FABLE.md](HARNESS-LOOP-FABLE.md) — el director (ThinkCentre)
- [HARNESS-MINIMAX-AUTOCYCLE.md](HARNESS-MINIMAX-AUTOCYCLE.md) — worker VPS
- [HARNESS-HERMES.md](HARNESS-HERMES.md) — ops y mensajería
- [HARNESS-OPENCLAW.md](HARNESS-OPENCLAW.md) — gateway IA / bot
- [DIRECTRICES-OPENCODE.md](DIRECTRICES-OPENCODE.md) — herramienta humana
- [DIRECTRICES-ANTIGRAVITY.md](DIRECTRICES-ANTIGRAVITY.md) — herramienta humana

## Trazabilidad de versiones
`VERSION` (actual) + `versions.json` (historial estructurado: qué cambió,
qué verificar si algo se ve mal, cómo revertir) + `docs/releases/v*.md`
(nota humana por versión). El panel superadmin de SIGAH lee `versions.json`
vía panel-api y muestra la línea de tiempo — si algo no se mira bien en la
app, la entrada de la versión dice exactamente qué se tocó y cómo volver.
