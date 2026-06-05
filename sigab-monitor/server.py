#!/usr/bin/env python3
"""
SIGAB Monitor — Dashboard local para desarrolladores
Puerto 4001 | Solo stdlib Python | Sin dependencias pip

Configuración: crea sigab-monitor/.monitor.env con tus credenciales SIGAH.
Ver .monitor.env.example para el formato.
"""

import http.server
import socketserver
import json
import os
import subprocess
import time
import threading
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

# ── Cargar .monitor.env si existe ────────────────────────────────
_env_file = Path(__file__).parent / ".monitor.env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

# ── Configuración ─────────────────────────────────────────────────
PORT             = 4001
VPS_HOST         = os.environ.get("VPS_HOST",         "129.121.100.147")
SSH_ALIAS        = os.environ.get("SSH_ALIAS",        f"root@{VPS_HOST}")
SIGAH_BASE       = os.environ.get("SIGAH_BASE",       f"http://{VPS_HOST}:8000")
BOT_BASE         = os.environ.get("BOT_BASE",         f"http://{VPS_HOST}:3000")
SIGAH_MATRICULA  = os.environ.get("SIGAH_MATRICULA",  "")   # matrícula IMSS del admin
SIGAH_PASSWORD   = os.environ.get("SIGAH_PASSWORD",   "")   # contraseña SIGAH
TOKEN_BUDGET_USD = float(os.environ.get("TOKEN_BUDGET_USD", "20"))  # plan mensual
GITHUB_REPO      = os.environ.get("GITHUB_REPO",      "djpiyama123-droid/SIGAB-Test-2")

CLAUDE_PROJECTS_DIR = Path.home() / ".claude" / "projects"

# ── Cache ─────────────────────────────────────────────────────────
_cache: dict = {}
_cache_lock = threading.Lock()

CACHE_TTL = {
    "claude": 45, "vps": 15, "sigah": 30,
    "tasks": 30, "ollama": 25, "github": 120,
    "git": 20, "feed": 10,
}

def cache_get(key):
    with _cache_lock:
        e = _cache.get(key)
        if e and time.time() - e["ts"] < CACHE_TTL.get(key, 30):
            return e["data"]
    return None

def cache_set(key, data):
    with _cache_lock:
        _cache[key] = {"ts": time.time(), "data": data}

# ── JWT SIGAH ─────────────────────────────────────────────────────
_jwt_token = None
_jwt_expires = 0

def get_sigah_token() -> str:
    global _jwt_token, _jwt_expires
    if _jwt_token and time.time() < _jwt_expires:
        return _jwt_token
    if not SIGAH_MATRICULA or not SIGAH_PASSWORD:
        return ""
    try:
        payload = json.dumps({"matricula": SIGAH_MATRICULA, "password": SIGAH_PASSWORD}).encode()
        req = urllib.request.Request(
            f"{SIGAH_BASE}/api/auth/login",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read())
            _jwt_token = data.get("access_token", "")
            _jwt_expires = time.time() + 3000
            return _jwt_token
    except Exception:
        return ""

def sigah_get(path: str):
    token = get_sigah_token()
    if not token:
        return None
    try:
        req = urllib.request.Request(
            f"{SIGAH_BASE}{path}",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read())
    except Exception:
        return None

# ── Ping helper ───────────────────────────────────────────────────
def ping(url, timeout=5):
    t0 = time.time()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            body = r.read().decode(errors="replace")[:800]
            return {"ok": True, "ms": int((time.time()-t0)*1000), "body": body}
    except urllib.error.HTTPError as e:
        return {"ok": True, "ms": int((time.time()-t0)*1000), "status": e.code, "body": ""}
    except Exception as ex:
        return {"ok": False, "ms": int((time.time()-t0)*1000), "error": str(ex)[:80], "body": ""}

# ── SSH helper ────────────────────────────────────────────────────
def ssh_run(cmd: str, timeout=12) -> tuple[bool, str]:
    """Ejecuta un comando en el VPS via SSH."""
    try:
        r = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=8", "-o", "BatchMode=yes",
             SSH_ALIAS, cmd],
            capture_output=True, text=True, timeout=timeout,
        )
        return r.returncode == 0, (r.stdout + r.stderr).strip()
    except Exception as e:
        return False, str(e)

# ══════════════════════════════════════════════════════════════════
# COLECTORES
# ══════════════════════════════════════════════════════════════════

def collect_claude() -> dict:
    cached = cache_get("claude")
    if cached:
        return cached

    total_in = total_out = total_cc = total_cr = 0
    today_in = today_out = 0
    session_count = sessions_today = 0
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hour_buckets = {str(h).zfill(2): 0 for h in range(24)}

    try:
        for proj_dir in CLAUDE_PROJECTS_DIR.iterdir():
            if not proj_dir.is_dir():
                continue
            for jsonl in proj_dir.glob("*.jsonl"):
                try:
                    with open(jsonl, encoding="utf-8", errors="replace") as f:
                        lines = f.readlines()
                    if not lines:
                        continue
                    session_count += 1
                    has_today = False
                    for line in lines:
                        try:
                            obj = json.loads(line)
                        except Exception:
                            continue
                        ts = obj.get("timestamp", "")
                        is_today = today_str in ts
                        if is_today:
                            has_today = True
                            hour = ts[11:13] if len(ts) > 13 else "00"
                        usage = obj.get("usage") or obj.get("message", {}).get("usage") or {}
                        i = usage.get("input_tokens", 0)
                        o = usage.get("output_tokens", 0)
                        cc = usage.get("cache_creation_input_tokens", 0)
                        cr = usage.get("cache_read_input_tokens", 0)
                        total_in += i; total_out += o; total_cc += cc; total_cr += cr
                        if is_today:
                            today_in += i; today_out += o
                            if hour in hour_buckets:
                                hour_buckets[hour] += o
                    if has_today:
                        sessions_today += 1
                except Exception:
                    continue
    except Exception:
        pass

    result = {
        "total_input_tokens":  total_in,
        "total_output_tokens": total_out,
        "cache_create_tokens": total_cc,
        "cache_read_tokens":   total_cr,
        "today_input_tokens":  today_in,
        "today_output_tokens": today_out,
        "total_sessions":      session_count,
        "sessions_today":      sessions_today,
        "hour_buckets":        hour_buckets,
        "plan":                f"Claude.ai ${TOKEN_BUDGET_USD:.0f}/mes",
        "plan_usd":            TOKEN_BUDGET_USD,
        # No billed cost — plan fijo
    }
    cache_set("claude", result)
    return result


def collect_vps() -> dict:
    cached = cache_get("vps")
    if cached:
        return cached

    backend_r = ping(f"{SIGAH_BASE}/health")
    bot_r     = ping(f"{BOT_BASE}/health")

    bot_data = {}
    try:
        bot_data = json.loads(bot_r.get("body", "{}"))
    except Exception:
        pass

    # Estado de credenciales configuradas
    creds_ok = bool(SIGAH_MATRICULA and SIGAH_PASSWORD)

    result = {
        "backend":    {"ok": backend_r["ok"], "ms": backend_r.get("ms", 0)},
        "bot":        {
            "ok": bot_r["ok"], "ms": bot_r.get("ms", 0),
            "connected":       bot_data.get("connected", False),
            "grupo_resuelto":  bot_data.get("grupo_resuelto", False),
            "grupo_nombre":    bot_data.get("grupo_nombre", ""),
        },
        "vps_ip":     VPS_HOST,
        "creds_ok":   creds_ok,
        "checked_at": datetime.now().strftime("%H:%M:%S"),
    }
    cache_set("vps", result)
    return result


def collect_ollama() -> dict:
    """
    Obtiene estado de Ollama via SSH (puerto 11434 no está expuesto públicamente).
    Requiere SSH configurado: ssh-copy-id root@VPS o clave en ~/.ssh/config.
    """
    cached = cache_get("ollama")
    if cached:
        return cached

    # Intento 1: SSH a la VPS (más confiable)
    ok_ssh, out = ssh_run("ollama list 2>/dev/null; echo '---PS---'; ollama ps 2>/dev/null")

    if ok_ssh and "NAME" in out:
        models = []
        ps_models = []
        section = "list"
        for line in out.splitlines():
            if "---PS---" in line:
                section = "ps"
                continue
            if section == "list" and line.strip() and not line.startswith("NAME"):
                parts = line.split()
                if parts:
                    name = parts[0]
                    size = parts[2] if len(parts) > 2 else "?"
                    models.append({"name": name, "size_str": size, "size_gb": 0, "family": "", "params": "", "quantization": ""})
            elif section == "ps" and line.strip() and not line.startswith("NAME"):
                parts = line.split()
                if parts:
                    ps_models.append({"name": parts[0], "vram_gb": 0, "expires": ""})

        result = {
            "ok": True, "source": "ssh",
            "models": models, "model_count": len(models),
            "running": ps_models, "running_count": len(ps_models),
            "host": f"VPS {VPS_HOST} (SSH)",
        }
        cache_set("ollama", result)
        return result

    # Intento 2: Via API copilot de SIGAH (proxy interno)
    estado = sigah_get("/api/copilot/estado")
    if estado and estado.get("ollama_activo"):
        models = [{"name": m, "size_gb": 0, "size_str": "", "family": "", "params": "", "quantization": ""}
                  for m in estado.get("modelos_instalados", [])]
        result = {
            "ok": True, "source": "sigah-proxy",
            "models": models, "model_count": len(models),
            "running": [], "running_count": 0,
            "modelo_activo": estado.get("modelo_activo", ""),
            "modelo_configurado": estado.get("modelo_configurado", ""),
            "host": f"{SIGAH_BASE}/api/copilot/estado",
        }
        cache_set("ollama", result)
        return result

    # Fallo — informar qué faltó
    ssh_err = out[:120] if out else "SSH no disponible"
    no_creds = "Sin credenciales SIGAH" if not (SIGAH_MATRICULA and SIGAH_PASSWORD) else ""
    result = {
        "ok": False, "source": "none",
        "models": [], "model_count": 0,
        "running": [], "running_count": 0,
        "host": VPS_HOST,
        "error": ssh_err,
        "hint": "Configura SSH sin contraseña (ssh-copy-id) o añade SIGAH_MATRICULA en .monitor.env" + (f"\n{no_creds}" if no_creds else ""),
    }
    cache_set("ollama", result)
    return result


def collect_sigah() -> dict:
    cached = cache_get("sigah")
    if cached:
        return cached

    if not (SIGAH_MATRICULA and SIGAH_PASSWORD):
        cache_set("sigah", {"_error": "sin_credenciales"})
        return {"_error": "sin_credenciales"}

    equipos    = sigah_get("/api/equipos?limit=2000")  or []
    ordenes    = sigah_get("/api/ordenes?limit=500")   or []
    alertas    = sigah_get("/api/alertas")             or []

    for lst_ref in ("equipos", "ordenes", "alertas"):
        v = locals()[lst_ref]
        if isinstance(v, dict):
            locals()[lst_ref]  # Python scoping — reasignar
    if isinstance(equipos, dict): equipos = equipos.get("items", equipos.get("data", []))
    if isinstance(ordenes, dict): ordenes = ordenes.get("items", ordenes.get("data", []))
    if isinstance(alertas, dict): alertas = alertas.get("items", alertas.get("data", []))

    def cnt(lst, f, v): return sum(1 for x in lst if x.get(f) == v)

    result = {
        "equipos_total":       len(equipos),
        "equipos_operativos":  cnt(equipos, "estado", "operativo"),
        "equipos_mantenim":    cnt(equipos, "estado", "mantenimiento"),
        "equipos_fuera":       cnt(equipos, "estado", "fuera_servicio"),
        "equipos_baja":        cnt(equipos, "estado", "baja"),
        "ordenes_total":       len(ordenes),
        "ordenes_abiertas":    cnt(ordenes,  "estado", "abierta"),
        "ordenes_en_proceso":  cnt(ordenes,  "estado", "en_proceso"),
        "ordenes_cerradas":    cnt(ordenes,  "estado", "cerrada"),
        "alertas_criticas":    cnt(alertas,  "nivel",  "critica"),
        "alertas_alta":        cnt(alertas,  "nivel",  "alta"),
        "alertas_pendientes":  len([a for a in alertas if not a.get("resuelta")]),
    }
    cache_set("sigah", result)
    return result


def collect_tasks() -> dict:
    cached = cache_get("tasks")
    if cached:
        return cached

    if not (SIGAH_MATRICULA and SIGAH_PASSWORD):
        cache_set("tasks", {"_error": "sin_credenciales"})
        return {"_error": "sin_credenciales"}

    prevs = sigah_get("/api/preventivos?limit=500") or []
    if isinstance(prevs, dict):
        prevs = prevs.get("items", prevs.get("data", []))

    today = datetime.now().strftime("%Y-%m-%d")
    def cnt(lst, f, v): return sum(1 for x in lst if x.get(f) == v)

    result = {
        "preventivos_total":       len(prevs),
        "preventivos_pendientes":  cnt(prevs, "estado", "pendiente"),
        "preventivos_en_proceso":  cnt(prevs, "estado", "en_proceso"),
        "preventivos_completados": cnt(prevs, "estado", "completado"),
        "preventivos_vencen_hoy":  sum(1 for p in prevs if (p.get("fecha_programada","") or "")[:10] == today),
        "preventivos_vencidos":    sum(1 for p in prevs
                                       if (p.get("fecha_programada","") or "")[:10] < today
                                       and p.get("estado") not in ("completado","cancelado")),
    }
    cache_set("tasks", result)
    return result


def collect_github() -> dict:
    cached = cache_get("github")
    if cached:
        return cached

    def gh(path):
        try:
            req = urllib.request.Request(
                f"https://api.github.com{path}",
                headers={"User-Agent": "SIGAB-Monitor/2.0", "Accept": "application/vnd.github+json"},
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                return json.loads(r.read())
        except Exception:
            return None

    commits_raw  = gh(f"/repos/{GITHUB_REPO}/commits?per_page=6")
    branches_raw = gh(f"/repos/{GITHUB_REPO}/branches")

    commits = []
    if isinstance(commits_raw, list):
        for c in commits_raw:
            commits.append({
                "sha":     c.get("sha","")[:7],
                "message": c.get("commit",{}).get("message","")[:70],
                "author":  c.get("commit",{}).get("author",{}).get("name","")[:20],
                "date":    c.get("commit",{}).get("author",{}).get("date","")[:10],
            })

    result = {
        "repo": GITHUB_REPO,
        "commits": commits,
        "branch_count": len(branches_raw) if isinstance(branches_raw, list) else 0,
    }
    cache_set("github", result)
    return result


def collect_git() -> dict:
    cached = cache_get("git")
    if cached:
        return cached

    repo_root = str(Path(__file__).parent.parent)
    def run(cmd):
        try:
            r = subprocess.run(cmd, cwd=repo_root, capture_output=True, text=True, timeout=5)
            return r.stdout.strip()
        except Exception:
            return ""

    log_raw = run(["git", "log", "--oneline", "-8"])
    branch  = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    status  = run(["git", "status", "--short"])

    commits = []
    for line in log_raw.splitlines():
        if line.strip():
            parts = line.split(" ", 1)
            commits.append({"sha": parts[0], "message": parts[1] if len(parts) > 1 else ""})

    result = {
        "branch":         branch or "unknown",
        "recent_commits": commits,
        "dirty_files":    len([l for l in status.splitlines() if l.strip()]),
        "status_lines":   [l for l in status.splitlines() if l.strip()][:5],
    }
    cache_set("git", result)
    return result


def collect_feed() -> dict:
    cached = cache_get("feed")
    if cached:
        return cached

    events = []

    # Sesiones Claude recientes
    try:
        sorted_dirs = sorted(CLAUDE_PROJECTS_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)[:4]
        for proj in sorted_dirs:
            for jsonl in sorted(proj.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)[:1]:
                mtime = datetime.fromtimestamp(jsonl.stat().st_mtime).strftime("%H:%M")
                events.append({"type": "claude", "text": f"Sesión: {proj.name[:22]}…", "time": mtime})
    except Exception:
        pass

    # Bot WA
    try:
        r = ping(f"{BOT_BASE}/health", timeout=3)
        data = json.loads(r.get("body", "{}"))
        estado = "conectado" if data.get("connected") else "desconectado"
        grupo  = "grupo ✅" if data.get("grupo_resuelto") else "sin grupo ⚠️"
        events.append({"type": "bot", "text": f"WA Bot {estado} · {grupo}", "time": datetime.now().strftime("%H:%M")})
    except Exception:
        events.append({"type": "bot", "text": "Bot WA — sin respuesta", "time": datetime.now().strftime("%H:%M")})

    result = {"events": events[:10]}
    cache_set("feed", result)
    return result


# ── Acciones rápidas via SSH ───────────────────────────────────────

ALLOWED_ACTIONS = {
    "dc-up":           "cd /root && docker compose up -d",
    "dc-down":         "cd /root && docker compose down",
    "dc-restart":      "cd /root && docker compose down && docker compose up -d",
    "restart-backend": "docker restart sigah-backend",
    "restart-bot":     "docker restart sigah-bot",
    "bot-logs":        "docker logs sigah-bot --tail=50 2>&1",
    "backend-logs":    "docker logs sigah-backend --tail=50 2>&1",
    "dc-ps":           "docker compose -f /root/docker-compose.yml ps 2>/dev/null || docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'",
    "ollama-list":     "ollama list 2>/dev/null",
    "ollama-ps":       "ollama ps 2>/dev/null",
}

def run_action(action: str) -> dict:
    cmd = ALLOWED_ACTIONS.get(action)
    if not cmd:
        return {"ok": False, "error": f"Acción desconocida: {action}"}
    ok, output = ssh_run(cmd, timeout=35)
    return {"ok": ok, "output": output[:3000], "cmd": action}


# ── HTTP Handler ──────────────────────────────────────────────────

DASHBOARD_HTML = Path(__file__).parent / "dashboard.html"

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/")

        if path in ("", "/"):
            if DASHBOARD_HTML.exists():
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self._cors()
                self.end_headers()
                self.wfile.write(DASHBOARD_HTML.read_bytes())
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"dashboard.html not found")
            return

        routes = {
            "/api/claude":  collect_claude,
            "/api/vps":     collect_vps,
            "/api/ollama":  collect_ollama,
            "/api/sigah":   collect_sigah,
            "/api/tasks":   collect_tasks,
            "/api/github":  collect_github,
            "/api/git":     collect_git,
            "/api/feed":    collect_feed,
            "/api/all": lambda: {
                "claude": collect_claude(), "vps":    collect_vps(),
                "ollama": collect_ollama(), "sigah":  collect_sigah(),
                "tasks":  collect_tasks(),  "github": collect_github(),
                "git":    collect_git(),    "feed":   collect_feed(),
                "ts": datetime.now().isoformat(),
            },
        }

        if path in routes:
            try:
                self._json(routes[path]())
            except Exception as e:
                self._json({"error": str(e)}, 500)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        path = self.path.split("?")[0].rstrip("/")
        if path.startswith("/api/action/"):
            action = path.split("/api/action/")[-1]
            self._json(run_action(action))
        else:
            self.send_response(404)
            self.end_headers()


# ── Entry Point ────────────────────────────────────────────────────
if __name__ == "__main__":
    env_loaded = _env_file.exists()
    creds_ok   = bool(SIGAH_MATRICULA and SIGAH_PASSWORD)

    print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  🖥️  SIGAB Monitor — http://localhost:{PORT}")
    print(f"  VPS:     {VPS_HOST}")
    print(f"  GitHub:  {GITHUB_REPO}")
    print(f"  .env:    {'✅ cargado' if env_loaded else '⚠️  no encontrado (crea .monitor.env)'}")
    print(f"  SIGAH:   {'✅ credenciales OK' if creds_ok else '⚠️  sin credenciales — configura SIGAH_MATRICULA'}")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    if not creds_ok:
        print(f"\n  ⚠️  Para ver datos SIGAH en vivo:")
        print(f"     cp sigab-monitor/.monitor.env.example sigab-monitor/.monitor.env")
        print(f"     # Edita .monitor.env con tu matrícula y contraseña SIGAH\n")

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), Handler) as srv:
        srv.serve_forever()
