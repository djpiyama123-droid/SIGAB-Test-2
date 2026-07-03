# Directrices — OpenCode (herramienta humana, ASUS)

OpenCode se usa SOLO cuando Gustavo lo lanza en la ASUS. No corre 24/7.

**Carril (regla histórica del repo, AGENTS.md):** estilos y CSS del frontend
— temas, contraste, spacing, animaciones. No lógica, no backend.

**Protocolo:**
1. Antes de empezar: `git fetch` + crear rama `opencode/<tema>-<fecha>` DESDE
   `origin/v4.0/piloto-clinica-1` (nunca desde ramas viejas).
2. Design system vigente: Verde-Blanco IMSS (#047857 / #065F46 / #E0F0E9,
   Inter, roundness 8, targets 48px). Las pantallas Stitch de referencia
   están en `docs/CONSOLIDACION-V4.md` §6.
3. Al terminar: push de su rama + avisar (Telegram o PETICIONES-LOOP.md).
   El director evalúa e integra en el siguiente ciclo con nota de versión.
4. PROHIBIDO: push a la rama oficial, deploys, tocar `api/sigab.js`
   (helpers PDF iOS) y `Reservas.jsx` (heatmap) sin coordinarlo.
