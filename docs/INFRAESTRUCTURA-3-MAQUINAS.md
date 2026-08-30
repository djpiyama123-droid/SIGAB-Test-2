# Infraestructura SIGAH — 3 máquinas + 1 fuente de verdad

> Última actualización: 2026-08-28
> Decisiones confirmadas por Gustavo: **Tailscale** (acceso) · **Ubuntu nativo** (ThinkCentre) · **Syncthing** (sync no-git)

---

## 0. Split código vs. estado de agentes (decisión 2026-08-28)

El **código** sigue viviendo solo en GitHub (principio de la sección 1, sin cambios). Pero el **estado de los agentes** (memorias, skills, credenciales, bot de Telegram) tiene un master distinto: el **ThinkCentre** es ahora el único lugar vivo para eso — memorias de Hermes/Claude/Orca, skills instaladas, `.env`/credenciales de los agentes, y el bot `@pragma_aibot`. La ASUS es cliente/respaldo dormido de ese estado, no una réplica activa. No confundir los dos planos: código = GitHub (las 3 máquinas), estado de agentes = ThinkCentre (un solo lugar).

## 1. Principio de diseño

**GitHub (repo `SIGAH`) es la ÚNICA fuente de verdad para el código.**
Las máquinas son réplicas de código que se sincronizan con `git pull`. Ninguna máquina física
es "el master" del código — eso evita el punto único de falla. (Para el estado de agentes, ver sección 0: ese master sí es el ThinkCentre.)

```
                  ┌──────────────────────────────┐
                  │   GitHub: djpiyama123-droid/SIGAH   │  ← FUENTE DE VERDAD
                  │   (código + CLAUDE.md + memorias)   │
                  └───────────────┬──────────────┘
                                  │ git pull / push
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐        ┌──────────────────┐      ┌──────────────────┐
│  ASUS TUF A16 │        │ ThinkCentre M720q │      │  VPS Bluehost     │
│  Windows+WSL2 │        │  Ubuntu 25.10     │      │  CAÍDO desde      │
│  cliente/     │        │  nativo, 24/7     │      │  jun-2026         │
│ respaldo      │        │  master de estado │      │  (reactivar:      │
│ dormido       │        │  de agentes       │      │   pendiente)      │
└───────┬───────┘        └────────┬─────────┘      └────────┬─────────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                    Red privada Tailscale (100.x.x.x)
                    + Syncthing para lo que NO va en git
```

---

## 2. Qué se sincroniza con qué

| Tipo de archivo | Mecanismo | Notas |
|-----------------|-----------|-------|
| Código (`sigab-*`, `portal-sigah/`) | **git** | GitHub master |
| `CLAUDE.md`, `AGENTS.md`, `docs/` | **git** | Versionado |
| Memorias del agente (`~/.claude/.../memory/`) | **Syncthing** | No va en repo de producto |
| Secretos (`.env`, llaves) | **Manual / Syncthing carpeta cifrada** | NUNCA en git |
| Cerebro / Obsidian vault | **Syncthing** | Notas y contexto maestro |
| Sesiones Claude Code (`~/.claude/projects/`) | **Syncthing** (opcional) | Transcripts; pesado, evaluar |

---

## 3. Roles de cada máquina

### ASUS TUF Gaming A16 (Windows 11 + WSL2 Ubuntu 24.04)
- Cliente / respaldo dormido. Ya no es el nodo de desarrollo principal ni réplica activa de estado de agentes (ver sección 0).
- Ruta repo: `C:\Users\djpiy\Desktop\Bioingeneria\SIGAB`

### ThinkCentre M720q (Ubuntu 25.10 nativo) — nodo 24/7 y master de estado de agentes
- Servidor de desarrollo siempre encendido con Orca (Claude Code, OpenCode) y Hermes (`hermes-gateway.service`).
- Se controla en remoto vía Tailscale SSH desde cualquier lugar.
- Master del **estado de agentes** (memorias, skills, credenciales, bot `@pragma_aibot`) — ver sección 0.
- Protegido por UPS APC (apagado seguro ante cortes).

### VPS Bluehost (Ubuntu) — CAÍDO desde jun-2026
- **Estado: caído por completo** (ni ICMP ni 22/80/443 responden). No es un nodo activo del stack actual.
- Ruta cuando estaba en producción: `/opt/sigab`. Docker + Traefik.
- Respaldo disponible solo hasta 10-jun-2026 (pre-piloto).
- **Decisión pendiente de Gustavo:** si se reactiva o se da de baja definitivamente.

---

## 4. Runbook — Provisionar el ThinkCentre

> Ejecutar EN el ThinkCentre tras instalar Ubuntu 25.10 Server/Desktop. (Runbook histórico de aprovisionamiento — el ThinkCentre ya está provisionado; queda como referencia si hay que rehacerlo.)

### 4.1 Paquetes base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3.12 python3.12-venv nodejs npm
```

### 4.2 Tailscale (red privada + SSH remoto)
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh          # habilita SSH vía Tailscale
tailscale ip -4                  # anota la IP 100.x.x.x del ThinkCentre
```
Repetir `tailscale up` en la ASUS y en el VPS para que las 3 estén en la misma red.

### 4.3 Evitar que el equipo se suspenda (24/7)
```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
# En Ubuntu Desktop, además: Settings → Power → Screen Blank: Never / Automatic Suspend: Off
```

### 4.4 Claude Code
```bash
npm install -g @anthropic-ai/claude-code     # o el instalador oficial vigente
claude --version
claude login                                  # autenticar
```

### 4.5 Clonar el repo (fuente de verdad)
```bash
cd ~
git clone https://github.com/djpiyama123-droid/SIGAH.git sigah
cd sigah
# Configurar identidad git
git config user.name  "Gustavo (ThinkCentre)"
git config user.email "<tu-email>"
```

### 4.6 Syncthing (contexto no-git)
```bash
sudo apt install -y syncthing
systemctl --user enable --now syncthing
# Abrir http://localhost:8384 → emparejar con ASUS y compartir carpetas:
#   - vault Obsidian / Cerebro
#   - carpeta de memorias del agente
#   - (opcional) ~/.claude/projects
```

### 4.7 Acceso remoto desde la ASUS
```powershell
# Desde la ASUS (PowerShell), con Tailscale activo en ambas:
ssh gustavo@<tailscale-ip-thinkcentre>
# o por hostname Tailscale:
ssh gustavo@thinkcentre
```

---

## 5. Flujo de trabajo diario (idéntico en las 3 máquinas)

```bash
# Al empezar a trabajar en CUALQUIER máquina:
cd ~/sigah          # (o la ruta local)
git pull            # traer lo último de GitHub

# ... trabajar / Claude Code ...

# Al terminar:
git add -A && git commit -m "..."
git push            # subir a GitHub (fuente de verdad)
```

**Regla de oro:** siempre `git pull` antes de empezar y `git push` al terminar.
Así las 3 máquinas convergen al mismo estado vía GitHub.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| ThinkCentre como único master | GitHub es el master; ThinkCentre es réplica |
| Corte de luz a mitad de sesión | UPS APC → apagado seguro |
| Exponer SSH a internet | Tailscale (sin abrir puertos del router) |
| Secretos filtrados a git | `.env` en `.gitignore`; sync por Syncthing carpeta privada |
| Conflictos de merge entre máquinas | Pull antes de trabajar; ramas por sesión; `.claude/shared/` para coordinar |
| Disco del ThinkCentre falla | El código vive en GitHub (+ réplica en ASUS); pérdida de código = re-clonar. El **estado de agentes** (memorias, credenciales) solo vive en el ThinkCentre — sin VPS activo como respaldo, evaluar backup propio |
```
