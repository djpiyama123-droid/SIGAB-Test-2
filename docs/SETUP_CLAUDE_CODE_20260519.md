# Setup Claude Code — SIGAH
**Fecha:** 2026-05-19 | **Rama:** feat/sileo-toasts-hermes-context

---

## ✅ Skills ya existentes (reutilizadas, sin cambios)

| Skill | Tipo | Notas |
|---|---|---|
| `ui-ux-pro-max` v2.5.0 | SKILL.md completa | `scripts/search.py` ✅, `data/` ✅ |
| `ccpm` | SKILL.md | Gestión de proyectos spec-driven |
| `deep-research` | SKILL.md | Investigación profunda multi-fuente |
| `git-workflow` | SKILL.md | Flujos git, PRs, branches |
| `mcp-builder` | SKILL.md + scripts | Creación de servidores MCP |
| `mysql` | SKILL.md + scripts | Consultas read-only MySQL SIGAH |
| `project-docs` | SKILL.md | Generación de documentación técnica |
| `react-patterns` | SKILL.md | Patrones React 19 / performance |
| `shadcn-ui` | SKILL.md | Componentes shadcn/ui |
| `skill-creator` | SKILL.md + agents | Creación y evaluación de skills |
| `tailwind-theme-builder` | SKILL.md | Tailwind v4 + dark mode |
| `webapp-testing` | SKILL.md + scripts | Testing Playwright UI/UX |

**Total ya instaladas:** 12 skills funcionales.

---

## ✅ Skills instaladas en esta sesión

Todos los repos clonados en `.claude/skills/<nombre>/` con `git clone --depth=1`.
Registradas en `.claude/settings.local.json` bajo `"plugins"`.

| Skill | Versión | Repo | Estado |
|---|---|---|---|
| `ECC` | 2.0.0-rc.1 | affaan-m/ECC | ✅ Clonado — **instalación completa pendiente** |
| `superpowers` | 5.1.0 | obra/superpowers | ✅ Clonado — **instalación completa pendiente** |
| `claude-mem` | 13.2.0 | thedotmack/claude-mem | ✅ Clonado — **instalación completa pendiente** |
| `mempalace` | 3.3.5 | mempalace/mempalace | ✅ Clonado — **requiere `mempalace-mcp` CLI** |
| `spec-kit` | 0.8.12.dev0 | github/spec-kit | ✅ Clonado — **requiere `uv` + `specify-cli`** |

### Aviso importante sobre estas 5 skills

Estos repos **no son skills SKILL.md simples** — son sistemas de plugins con instaladores propios
(`npx`, `/plugin install`, scripts bash). Están clonados y registrados como referencia, pero para
activar sus hooks/agentes/comandos se necesita correr sus instaladores. Ver comandos abajo.

---

## ⚠️ Lo que falló y por qué

### 1. Backend FastAPI — No arranca
**Síntoma:** `ModuleNotFoundError: No module named 'cachetools'`
**Causa:** El commit `e62ab17` (perf: cache TTL contexto) agregó `cachetools==5.5.0` a
`requirements.txt` pero nunca se ejecutó `pip install -r requirements.txt` en el venv.
**Fix (1 comando):**
```bash
cd sigah-backend && source venv/bin/activate && pip install -r requirements.txt
```

### 2. Ollama — No detectado
**Síntoma:** No responde en `localhost:11434` ni en la IP del host Windows (`10.255.255.254`).
**Causa probable:** Ollama no está corriendo. Puede estar instalado en Windows pero sin iniciar.
**Fix:** Abrir Ollama en Windows (ícono de bandeja) o ejecutar `ollama serve` en PowerShell.
Luego verificar modelos disponibles: `ollama list` — si no aparece `qwen2.5:latest` o `gemma3`,
descargar con: `ollama pull qwen2.5:14b`

### 3. Instalación completa de ECC, superpowers, claude-mem, mempalace, spec-kit
**Estado:** Solo clonados. Sus hooks/comandos/agentes NO están activos hasta instalar.
Ver sección "Comandos de instalación de plugins" abajo.

---

## 🔧 Comandos para arrancar SIGAH completo

### Arranque rápido (una vez que se corrija el venv)

```bash
# 1. Reparar dependencias backend (solo necesario una vez)
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAH/sigah-backend \
  && source venv/bin/activate \
  && pip install -r requirements.txt

# 2. Arrancar backend (en terminal 1)
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAH/sigah-backend \
  && source venv/bin/activate \
  && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. Arrancar frontend (en terminal 2)
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAH/sigah-frontend \
  && npm run dev

# 4. Verificar salud
curl http://localhost:8000/health
curl http://localhost:5173
```

### Estado actual de servicios
| Servicio | Puerto | Estado |
|---|---|---|
| MySQL 8.0 | 3306 | ✅ Corriendo |
| Backend FastAPI | 8000 | ❌ `pip install -r requirements.txt` pendiente |
| Frontend Vite | 5173 | ⏸️ Detenido (node_modules ✅ instalados) |
| Ollama | 11434 | ❌ No detectado (iniciar en Windows) |

---

## 📋 Comandos de instalación de plugins (opcionales, requieren confirmación)

> **Nota:** Estos comandos modifican `~/.claude/` globalmente. Ejecutar solo si se desea
> activar los hooks/agentes de cada plugin más allá del clon local.

```bash
# claude-mem (memoria persistente entre sesiones) — MÁS RECOMENDADO
cd .claude/skills/claude-mem && npx claude-mem install

# ECC (sistema completo harness) — instalación mínima sin hooks
cd .claude/skills/ECC && bash install.sh --profile minimal --target claude

# superpowers (vía marketplace oficial de Claude Code)
# Ejecutar dentro de Claude Code:
# /plugin marketplace add obra/superpowers-marketplace
# /plugin install superpowers

# spec-kit (requiere uv instalado primero)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install specify-cli --from "git+https://github.com/github/spec-kit.git@v0.8.12"

# mempalace (requiere npm global)
npm install -g mempalace-mcp
# Luego en Claude Code: /plugin install mempalace
```

---

## 📋 Próximos pasos sugeridos (según CLAUDE.md)

Basado en la **Fase 0** del Plan Maestro SIGAH:

1. **Reparar backend ahora** — `pip install -r requirements.txt` en el venv (bloqueante para todo el resto).

2. **Activar claude-mem** — Es la skill más útil inmediatamente: persiste contexto entre sesiones sin necesidad de re-explicar SIGAH en cada conversación. Comando: `cd .claude/skills/claude-mem && npx claude-mem install`.

3. **Registrar `update-config` skill** — Para configurar hooks automáticos en `settings.local.json` sin edición manual.

4. **Continuar Fase 1 del roadmap** — Columna `tenant_id` en todas las tablas + tabla `hospitales`. Ver `CLAUDE.md` sección "Módulos a construir para SIGAH SaaS".

5. **Instalar Ollama + modelos** — Abrir Ollama en Windows, descargar `qwen2.5:14b` (modelo actual según settings: `qwen-claw` default). Sin Ollama el Copilot SIGAH no funciona on-premise.

---

## Herramientas del sistema verificadas

| Herramienta | Versión | Estado |
|---|---|---|
| Docker | 29.1.3 | ✅ |
| Python | 3.12.3 | ✅ |
| Node.js | v22.22.2 | ✅ (supera req. Node 18+) |
| MySQL client | 8.0.45 | ✅ |
| Git | — | ✅ |
| Ollama | — | ❌ No detectado |
| `uv` (para spec-kit) | — | ❌ No instalado |

---

*Generado automáticamente por Claude Code — SIGAH Setup 2026-05-19*
