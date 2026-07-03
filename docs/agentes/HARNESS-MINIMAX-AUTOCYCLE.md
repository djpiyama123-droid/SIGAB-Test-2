# Harness — Worker: MiniMax M3 (autocycle, VPS)

**Dónde corre:** VPS Bluehost, `sigab-autocycle.timer` (~cada 5h), cwd
`/opt/sigab-v3`, `claude -p --model MiniMax-M3`. **MIGRACIÓN PENDIENTE DE
APLICAR** (la aplica Gustavo o el director con OK): su base pasa de
`origin/feat/ui-cinematic` (congelada) a `origin/v4.0/piloto-clinica-1`.

**Cambios a su PROMPT.md cuando se migre (checklist):**
- [ ] Base: `origin/v4.0/piloto-clinica-1`; rama de salida: `autocycle/v4.0`
      (force-with-lease SOLO sobre autocycle/v4.0).
- [ ] Carril: refactors seguros de frontend, a11y, micro-optimizaciones y
      propuestas de tests. NO pantallas Stitch (eso es del director, evita
      colisiones), NO backend, NO deploys.
- [ ] Verificación pre-push: build verde + `grep -a anim-cell-pop` en el dist
      (reemplaza al viejo `grep ActividadHeatmap`, roto por minificación).
- [ ] Su STATE.md registra qué propuso y qué le aceptó el director (feedback
      loop: lo rechazado 2 veces no se re-propone).

**Cómo se integra su trabajo:** el director, en cada ciclo, revisa
`origin/autocycle/v4.0`; si hay commits nuevos buenos los cherry-pickea a la
oficial y los incluye en la nota de versión (autor: "autocycle-minimax").

**Reglas duras:** jamás push a la rama oficial ni a feat/ui-cinematic; jamás
desplegar; jamás tocar `/opt/sigab` (su cwd es `/opt/sigab-v3`).
