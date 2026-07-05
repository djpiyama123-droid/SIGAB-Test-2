# Flujo completo: de un cambio de código a producción (sslip.io)

> Complementa `ORQUESTACION.md` (topología) y los `HARNESS-*.md` (contrato
> por agente). Este documento responde una pregunta concreta que ya generó
> confusión una vez: **"¿por qué git tiene una versión más nueva que lo que
> corre en `sslip.io`?"**. Escrito 2026-07-05 tras diagnosticar exactamente
> ese caso (prod atorada en v4.0.8 con v4.0.9-v4.0.12 ya en la rama oficial).

## 1. Hay UN solo camino a producción

Ningún agente que edita código (director, MiniMax, OpenCode, Antigravity,
rutinas cloud, Gustavo) despliega directo. Todos convergen en la rama
oficial `v4.0/piloto-clinica-1` vía PR o push directo (según el agente, ver
`ORQUESTACION.md`). **El único proceso que toca el VPS de producción es
`sigab-loop.service` de la ThinkCentre**, corriendo `scripts/loop/ciclo-mejora.sh`
cada 6h (00:20 / 06:20 / 12:20 / 18:20 hora Tijuana, `sigab-loop.timer`).

```
┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐
│  MiniMax     │  │ OpenCode │  │Antigravity│  │ Rutina cloud /│
│  autocycle   │  │(rama     │  │(rama      │  │ Gustavo (rama │
│  (autocycle/ │  │opencode/*)│  │antigravity│  │ o push directo│
│   v4.0)      │  │           │  │/*)        │  │ si autorizado)│
└──────┬───────┘  └────┬─────┘  └─────┬─────┘  └──────┬───────┘
       │  el director revisa    │  PR → Gustavo   │
       │  y cherry-pickea ───────┴────revisa──────┘
       ▼
┌─────────────────────────────────────────────┐
│   v4.0/piloto-clinica-1  (rama oficial)      │
└──────────────────┬────────────────────────────┘
                    │ cada 6h, sigab-loop.service
                    ▼
     ┌─────────────────────────────────────┐
     │ 1. git checkout -B RAMA origin/RAMA  │  ← recoge TODO lo ya mergeado
     │ 2. claude -p PROMPT-CICLO.md         │  ← el director hace SU propio
     │    (director elige 1 ítem)           │     trabajo de este ciclo
     │ 3. ¿CICLO-RESULTADO.md dice           │
     │    "estado: cambios"?                │
     │        NO → git checkout -- . ; exit │  ⚠️ AQUÍ SE SALTA TODO LO DE
     │        SÍ → sigue ↓                  │     ABAJO, incluido el deploy
     │ 4. npm run build && vitest           │
     │ 5. discriminadores (calendario, PDF) │
     │ 6. git push origin RAMA              │
     │ 7. espejo SIGAB-v4 (best-effort)     │
     │ 8. ssh VPS · backup dist · rsync     │  ← EL DEPLOY REAL es aquí
     │ 9. smoke test (200 + /health)        │
     │    falla → rollback automático       │
     └─────────────────────────────────────┘
```

## 2. La trampa: el deploy está condicionado al trabajo DE ESE CICLO

Este es el detalle que causó la confusión del 2026-07-05: el runner
**no despliega "lo que haya nuevo en git"** — despliega solo si, en la
sesión de Claude de ESE ciclo específico, el director reporta
`estado: cambios` en `CICLO-RESULTADO.md`. Si el director no encuentra nada
que valga la pena ese ciclo (`sin-cambios`) o su sesión aborta, el script
hace `git checkout -- .` y sale en el paso 3 — **build, push, y el deploy
completo (pasos 4-9) nunca corren**, aunque el paso 1 ya haya bajado commits
nuevos de otros agentes.

Esto significa que un PR mergeado por otra vía (cloud-routine, o
directamente por Claude Code/Gustawo en una sesión interactiva) **no llega
solo a producción** — necesita "viajar" en un ciclo donde el director
también haga su propia parte. En la práctica casi siempre pasa (el backlog
de UI/tests/docs es grande), pero no es automático ni instantáneo.

**Caso real de hoy:** el ciclo de las 06:28 PDT sí tuvo `estado: cambios`
(por eso `v4.0.9`/`v4.0.10` ya estaban en git), pasó los gates, pusheó — y
se colgó exactamente en el paso 8 (`ssh "$VPS"`) por el bug de Tailscale ACL
check-mode (ver `sigab-vps-autonomo.md` en memoria). El deploy real nunca
terminó. Cuando esta sesión mergeó `v4.0.11`/`v4.0.12` por fuera del loop
(vía PR revisados por Gustavo), esos tampoco se desplegaron solos — quedan
esperando el próximo ciclo donde el director haga algo Y el SSH ya
funcione (fix aplicado hoy, `VPS=sigab-vps-direct`).

## 3. Cómo llega una propuesta de MiniMax (autocycle) a producción

MiniMax-M3 corre en el VPS (`sigab-autocycle.timer`, ~cada 5h,
`HARNESS-MINIMAX-AUTOCYCLE.md`). Desde 2026-07-05 su base es
`v4.0/piloto-clinica-1` y su rama de salida es `autocycle/v4.0`
(`git push --force-with-lease`, nunca a la oficial).

**El flujo pensado** (documentado en `ORQUESTACION.md` y
`HARNESS-MINIMAX-AUTOCYCLE.md`): *"el director, en cada ciclo, revisa
`origin/autocycle/v4.0`; si hay commits nuevos buenos los cherry-pickea a la
oficial y los incluye en la nota de versión (autor: `autocycle-minimax`)."*

**⚠️ Gap encontrado hoy al leer el `PROMPT-CICLO.md` real (no solo la
documentación):** el contrato del director (`scripts/loop/PROMPT-CICLO.md`,
sección "Tu carril en este ciclo") **no tiene un paso explícito que le diga
"revisa `autocycle/v4.0` y cherry-pickea"** — solo le dice que lea
`docs/agentes/ORQUESTACION.md` como contexto general. En la práctica, el
director puede (y probablemente debe, por contexto) recogerlo, pero no es
un checklist forzado como sí lo es el versionado. **No se corrigió en esta
sesión** (no se pidió, y tocar el prompt del director es una decisión de
Gustavo/diseño, no un bug de código) — queda como ítem para el próximo
ajuste de `PROMPT-CICLO.md` si se quiere hacer explícito.

## 4. Resumen para decidir "¿tengo que pushear algo?"

| Quién hizo el cambio | ¿Llega solo a `v4.0/piloto-clinica-1`? | ¿Se despliega solo? |
|---|---|---|
| Director (loop ThinkCentre) | Sí, es quien pushea | Sí, mismo ciclo si pasa gates |
| MiniMax (autocycle VPS) | No — vive en `autocycle/v4.0` hasta que el director cherry-pickea (ver gap arriba) | No, hasta que el director lo integre Y despliegue en un ciclo suyo |
| OpenCode / Antigravity (ASUS) | No — PR, Gustavo o el director mergean | No, espera el siguiente ciclo del loop |
| Rutina cloud / Claude Code interactivo | Depende — PR (recomendado) o push directo si Gustavo ya revisó | No, espera el siguiente ciclo del loop |
| Gustavo (push directo) | Ya está ahí | No, espera el siguiente ciclo del loop |

**Conclusión: nadie necesita "pushear a producción" manualmente — pero
tampoco basta con mergear a la rama oficial y asumir que ya se ve en
`sslip.io`.** Si urge que algo se vea YA, las opciones son: (a) esperar el
siguiente disparo del timer (máx 6h), o (b) disparar el ciclo a mano
(`sudo systemctl start sigab-loop.service` en la ThinkCentre), o (c) deploy
manual puntual (backup + rsync directo al VPS, fuera del loop, para casos de
urgencia — no es el camino normal).
