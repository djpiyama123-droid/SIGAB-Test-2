# Setup de Claude Code para SIGAH en Asus TUF A16

> **Audiencia:** Gustavo (Asus TUF A16, Windows 11) y Carlos (cuando se sume con su equipo).
> **Tiempo total:** ~20 minutos si Node.js ya está instalado.
> **Resultado:** Claude Code corriendo desde terminal, con 25+ skills cargadas (11 a nivel proyecto, 14 a nivel usuario) y conectado por SSH al VPS Bluehost (instancia SIGAB) y al servidor Hetzner (cuando exista).

---

## 1. Resumen de lo que va a quedar instalado

### 1.1 Skills a nivel proyecto (`SIGAB/.claude/skills/`)

Estas viajan con el repo, todo el equipo las tiene cuando hace `git pull`.

| Skill | Origen | Para qué |
|-------|--------|---------|
| `ui-ux-pro-max` | (preexistente) | UI/UX para React + Tailwind del frontend SIGAH |
| `mysql` | `sanjay3290/ai-skills` | Consultas SQL **read-only** contra la BD SIGAB/SIGAH en lenguaje natural |
| `ccpm` | `automazeio/ccpm` | Project management: PRD → Epic → GitHub Issues → agentes en paralelo |
| `git-workflow` | `jezweb/claude-skills` | Preparar PRs, limpiar ramas, resolver merge conflicts |
| `project-docs` | `jezweb/claude-skills` | Generar ARCHITECTURE.md, API_ENDPOINTS.md desde el código |
| `deep-research` | `jezweb/claude-skills` | Investigación a profundidad antes de construir algo nuevo |
| `react-patterns` | `jezweb/claude-skills` | Patrones React 19 (memoización, composición, perf) |
| `shadcn-ui` | `jezweb/claude-skills` | Instalar y configurar componentes shadcn/ui |
| `tailwind-theme-builder` | `jezweb/claude-skills` | Setup de Tailwind v4 + tema SIGAH + dark mode |
| `mcp-builder` | `anthropics/skills` | Crear MCP servers (para exponer endpoints SIGAH a Claude) |
| `skill-creator` | `anthropics/skills` | Crear nuevas skills propias (formatos institucionales, etc.) |

### 1.2 Skills a nivel usuario (`~/.claude/skills/`)

Las instala el script de setup en tu Asus TUF A16. Disponibles en cualquier proyecto, no solo en SIGAH.

`pdf`, `docx`, `xlsx`, `pptx`, `web-artifacts-builder`, `frontend-design`, `skill-creator`, `mcp-builder`, `claude-api`, `brand-guidelines`, `doc-coauthoring`, `internal-comms`, `canvas-design`, `theme-factory`.

### 1.3 SSH

- Alias `sigab-bluehost` → VPS donde corre SIGAB hoy (`129.121.100.147`).
- Alias `sigah-staging` → servidor Hetzner cuando exista (post Fase 0 paso 7 del runbook).

---

## 2. Pre-requisitos en el Asus TUF A16

| Software | Versión mínima | Cómo verificar / instalar |
|----------|----------------|---------------------------|
| Windows 11 | 22H2+ | (preinstalado) |
| Node.js LTS | 18+ | `node -v` — si falta: [https://nodejs.org](https://nodejs.org) |
| Git | 2.40+ | `git --version` — si falta: [https://git-scm.com](https://git-scm.com) |
| OpenSSH | 8+ | `ssh -V` — viene con Windows 11; si falta: *Configuración → Aplicaciones → Funciones opcionales → OpenSSH Client* |
| PowerShell | 5.1+ | `$PSVersionTable.PSVersion` — preinstalado |

Recomendado pero opcional:

- **WSL2** con Ubuntu 24.04 — si prefieres terminal Linux para el script `.sh`.
- **Windows Terminal** — para tabs y mejor experiencia que `cmd.exe`.

---

## 3. Paso a paso

### 3.1 Clonar el repo (si todavía no lo tienes en el Asus)

```powershell
mkdir $env:USERPROFILE\Desktop\Bioingeneria -ErrorAction SilentlyContinue
cd $env:USERPROFILE\Desktop\Bioingeneria
git clone <URL_DEL_REPO_SIGAH> SIGAB
cd SIGAB
```

> Si ya está en la misma ruta que en el otro equipo (`C:\Users\djpiy\Desktop\Bioingeneria\SIGAB`), simplemente entra al folder.

### 3.2 Correr el setup automático

**Opción A — Windows nativo (PowerShell):**

```powershell
cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB
# Permitir la ejecución del script solo en esta sesión:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\scripts\setup_claude_code_sigah.ps1
```

**Opción B — WSL / Git Bash:**

```bash
cd /mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAB
chmod +x scripts/setup_claude_code_sigah.sh
./scripts/setup_claude_code_sigah.sh
```

Lo que hace el script (6 pasos):

1. Verifica Node.js + npm.
2. Instala Claude Code CLI (`npm i -g @anthropic-ai/claude-code`) si falta.
3. Clona `anthropics/skills` en temp y copia las 14 oficiales a `~/.claude/skills/`.
4. Anexa el bloque SIGAH a `~/.ssh/config` y genera la llave `sigab_bluehost_ed25519` si no existe.
5. Crea `connections.json` para la skill mysql (placeholders, hay que editar).
6. Imprime el inventario final de skills y los siguientes pasos.

### 3.3 Configurar la llave SSH en el VPS Bluehost

El script generó `~/.ssh/sigab_bluehost_ed25519` y su `.pub` correspondiente. Hay que pegar el contenido del `.pub` en el VPS:

```powershell
# Imprimir la llave pública (cópiala)
type $env:USERPROFILE\.ssh\sigab_bluehost_ed25519.pub
```

En el VPS Bluehost (entrando con tu método actual, por ejemplo cPanel SSH o `ssh root@129.121.100.147` con password):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<LLAVE_PUBLICA_PEGADA>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Probar desde el Asus:

```powershell
ssh sigab-bluehost
```

Si el `Host` del config tiene `<USUARIO_BLUEHOST>` sin reemplazar, edítalo en `~/.ssh/config` y pon el usuario real (típicamente `root` o el usuario que Bluehost te asignó).

### 3.4 Configurar la skill MySQL (read-only)

Editar `SIGAB/.claude/skills/mysql/connections.json` y reemplazar `REEMPLAZAR_CON_PASSWORD_REAL`:

```json
{
  "name": "sigab-prod-hgr1",
  "host": "127.0.0.1",
  "port": 3306,
  "database": "sigab",
  "user": "sigab_readonly",
  "password": "<password real del usuario read-only>"
}
```

> Antes de usarlo, crea el usuario read-only en MySQL del VPS:

```sql
-- En el VPS (mysql -u root -p):
CREATE USER 'sigab_readonly'@'localhost' IDENTIFIED BY '<password seguro>';
GRANT SELECT ON sigab.* TO 'sigab_readonly'@'localhost';
FLUSH PRIVILEGES;
```

Y abrir un túnel SSH para que la skill pueda conectar al MySQL del VPS desde tu Asus:

```powershell
ssh -L 3306:127.0.0.1:3306 sigab-bluehost
# Mantén esa terminal abierta mientras uses la skill mysql
```

> Si el puerto 3306 ya está en uso localmente (porque también tienes MySQL local), usa otro puerto local: `ssh -L 3308:127.0.0.1:3306 sigab-bluehost`, y cambia el `port` en `connections.json` a `3308`.

Probar:

```bash
cd SIGAB/.claude/skills/mysql
python3 scripts/query.py --list
python3 scripts/query.py --db sigab-prod-hgr1 --query "SELECT COUNT(*) FROM equipos"
```

### 3.5 Arrancar Claude Code

```powershell
cd C:\Users\djpiy\Desktop\Bioingeneria\SIGAB
claude
```

Dentro de Claude Code:

```
/skills          # listar todas las skills disponibles
/help            # ayuda general
```

Claude Code carga **automáticamente** `CLAUDE.md` del proyecto al iniciar, así que ya tiene el contexto SIGAH (catálogo de agentes, módulos, fases) sin que tengas que pegar nada.

---

## 4. Verificación final

Marcar cada uno cuando funcione:

- [ ] `node -v` ≥ 18, `npm -v` muestra versión.
- [ ] `claude --version` responde.
- [ ] `ls ~/.claude/skills/` muestra 14 carpetas (pdf, docx, xlsx, ...).
- [ ] `ls C:\Users\djpiy\Desktop\Bioingeneria\SIGAB\.claude\skills` muestra 11 carpetas.
- [ ] `ssh sigab-bluehost` conecta sin pedir password.
- [ ] `connections.json` con el password real del usuario read-only.
- [ ] Túnel `ssh -L 3306:127.0.0.1:3306 sigab-bluehost` activo y `python3 scripts/query.py --list` lista la BD.
- [ ] `claude` arranca dentro del repo y `/skills` muestra al menos 25 skills (11 proyecto + 14 usuario).

Cuando los 8 estén ✓ → tu Asus TUF A16 está listo para desarrollar SIGAH con todo el stack de Claude Code.

---

## 5. Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| `claude: command not found` | Carpeta global de npm no está en PATH | Cierra y reabre PowerShell. Verifica con `npm config get prefix` y agrega esa ruta a PATH manualmente si hace falta. |
| `Set-ExecutionPolicy ... access denied` | Política de ejecución restringida | Usa la variante `-Scope Process` (solo afecta esa terminal). |
| `Permission denied (publickey)` al hacer `ssh sigab-bluehost` | La llave pública no está en el VPS, o el usuario en `~/.ssh/config` está mal | Verifica `~/.ssh/config` y vuelve a pegar la llave en `~/.ssh/authorized_keys` del VPS. |
| `error connect ECONNREFUSED 127.0.0.1:3306` al probar la skill mysql | No hay túnel SSH activo, o el puerto está ocupado | Levanta el túnel en otra terminal: `ssh -L 3306:127.0.0.1:3306 sigab-bluehost`. Si 3306 está ocupado usa otro puerto local. |
| `/skills` muestra 0 skills | Estás corriendo `claude` fuera del repo, sin el proyecto cargado | `cd` al folder del repo y arranca `claude` de nuevo. |
| Quiero compartir skills entre proyectos | Las skills a nivel proyecto solo aplican al repo activo | Mueve la skill a `~/.claude/skills/` y se vuelve global. |

---

## 6. Mantenimiento

### 6.1 Actualizar skills oficiales de Anthropic

Cuando quieras pull de cambios de `anthropics/skills` (por ejemplo, mejoras en docx/xlsx):

```powershell
.\scripts\setup_claude_code_sigah.ps1
```

El script re-clona y sobreescribe; los settings de las skills son seguros (no se borran credenciales custom).

### 6.2 Actualizar Claude Code

```powershell
npm update -g @anthropic-ai/claude-code
```

### 6.3 Agregar una skill nueva al proyecto

```powershell
cd SIGAB\.claude\skills
mkdir mi-skill
# Crear mi-skill/SKILL.md con YAML frontmatter (ver ejemplos en cualquier otra skill)
```

O dentro de `claude`:

```
Activa skill-creator y ayúdame a crear una skill para <descripción>
```

---

## 7. Por qué este split (proyecto vs usuario)

- **Skills a nivel proyecto** viajan con el repo (`git`). Si Carlos clona, las recibe automáticamente. Son las skills **específicas de SIGAH** (mysql con conexiones, ccpm con la organización del repo, etc.).
- **Skills a nivel usuario** son **genéricas** (generar PDFs, Word, presentaciones). No tiene sentido versionarlas en SIGAH porque no son del proyecto, son del usuario.
- Si en el futuro arrancan un segundo proyecto, las skills genéricas siguen disponibles sin reinstalarlas.

---

_v1.0 — Mayo 2026. Mantenedor: Gustavo. Actualizar conforme se añadan skills o servidores._
