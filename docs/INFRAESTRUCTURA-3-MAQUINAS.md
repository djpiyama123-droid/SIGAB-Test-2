# Infraestructura SIGAH — 3 máquinas + 1 fuente de verdad

> Última actualización: 2026-05-29
> Decisiones confirmadas por Gustavo: **Tailscale** (acceso) · **Ubuntu nativo** (ThinkCentre) · **Syncthing** (sync no-git)

---

## 1. Principio de diseño

**GitHub (repo `SIGAH`) es la ÚNICA fuente de verdad.**
Las 3 máquinas son réplicas que se sincronizan con `git pull`. Ninguna máquina física
es "el master" — eso evita el punto único de falla.

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
│  Windows+WSL2 │        │  Ubuntu 24.04     │      │  Ubuntu (prod)    │
│               │        │  nativo, 24/7     │      │  129.121.100.147  │
│ Sesiones      │        │ Claude Code 24/7  │      │  Docker stack     │
│ largas / dev  │        │ Réplica + cómputo │      │  /opt/sigab       │
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
- Estación de desarrollo principal para **sesiones largas e interactivas**.
- Ruta repo: `C:\Users\djpiy\Desktop\Bioingeneria\SIGAB`

### ThinkCentre M720q (Ubuntu 24.04 nativo) — NUEVO nodo 24/7
- Servidor de desarrollo siempre encendido con Claude Code.
- Se controla en remoto vía Tailscale SSH desde cualquier lugar.
- Ruta repo sugerida: `~/sigah` (o `/opt/sigah` si se quiere paridad con el VPS).
- Protegido por UPS APC (apagado seguro ante cortes).

### VPS Bluehost (Ubuntu, producción)
- Solo producción. Docker + Traefik. Ruta: `/opt/sigab`.
- NO se desarrolla aquí; solo `git pull` + `docker compose up`.

---

## 4. Runbook — Provisionar el ThinkCentre

> Ejecutar EN el ThinkCentre tras instalar Ubuntu 24.04 Server/Desktop.

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
| Disco del ThinkCentre falla | El repo vive en GitHub + ASUS + VPS; pérdida = re-clonar |
```
