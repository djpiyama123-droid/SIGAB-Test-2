# Harness — Director del loop: Claude Sonnet 5 (ThinkCentre) — Fable 5 dirige las sesiones interactivas

**Dónde corre:** ThinkCentre M720q (homelab 24/7), `sigab-loop.timer` cada 6h
(00:20, 06:20, 12:20, 18:20 UTC ±10m). Auth: suscripción de Gustavo
(`claude login` como root). Runner: `scripts/loop/ciclo-mejora.sh`.

**Contexto que carga cada ciclo (en este orden):**
1. `scripts/loop/PROMPT-CICLO.md` — su contrato de ciclo.
2. `docs/CONSOLIDACION-V4.md` — mapa del ecosistema.
3. `docs/cerebro/CONTEXTO-COMPARTIDO.md` — memoria común.
4. `versions.json` — estado de versiones y qué verificar.
5. `docs/agentes/ORQUESTACION.md` — carriles y protocolo.

**Permisos (allowlist `scripts/loop/settings-loop.json`):** editar SOLO
`sigab-frontend/`, `VERSION`, `versions.json`, `docs/releases/`,
`CICLO-RESULTADO.md`; bash SOLO npm/vitest/git (push únicamente a la rama
oficial). DENEGADO: backend, database, docker, ssh/rsync/curl, rm, sudo.
El deploy lo hace el RUNNER (bash puro), no el modelo.

**Gates del runner (orden):** build verde → vitest verde → discriminador
calendario (`anim-cell-pop`) → discriminador fix PDF (`prepararVentanaPdf`)
→ push a GitHub → backup dist en VPS → rsync → smoke post-deploy (HTTP 200 +
/health ok) → si smoke falla: ROLLBACK automático + alerta Telegram.

**Guard de uso:** antes de cada ciclo hace un `claude -p` trivial; si huele a
rate limit (Gustavo usando su plan), salta el ciclo completo sin consumir.

**Memoria que persiste entre ciclos:** `CICLO-RESULTADO.md` (handoff del
ciclo anterior, incluye candidatos para el siguiente), `versions.json`
(historial), `docs/releases/` (notas), logs en `/var/log/sigab-loop/`.

**Métrica de éxito:** versiones patch/minor desplegadas sin rollback, con
nota de versión útil (un humano puede verificar y revertir sin leer código).
