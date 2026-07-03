# Directrices — Antigravity CLI (herramienta humana, ASUS)

Antigravity se usa SOLO cuando Gustavo lo lanza. Históricamente hizo trabajo
full-stack puntual (LandingPage, SuperAdmin, charset utf8mb4, PDF CENEVAL).

**Carril:** tareas puntuales supervisadas por Gustavo — prototipos, páginas
nuevas aisladas, scripts de datos. Por su historial de tocar backend, SUS
CAMBIOS DE BACKEND NUNCA SE DESPLIEGAN DIRECTO: van a rama y esperan la
revisión + ventana manual (regla "backend = OK de Gustavo").

**Protocolo:**
1. Rama `antigravity/<tema>-<fecha>` desde `origin/v4.0/piloto-clinica-1`.
2. Marcar sus commits con `[Antigravity]` al final del mensaje (costumbre ya
   establecida en el historial — se conserva).
3. Si toca `sigab-backend/`: además de la rama, dejar en la descripción del
   PR qué migraciones/dependencias nuevas trae. El director NO lo integra
   automáticamente; lo integra Gustavo.
4. PROHIBIDO: deploys, force-push, tocar la rama oficial.
