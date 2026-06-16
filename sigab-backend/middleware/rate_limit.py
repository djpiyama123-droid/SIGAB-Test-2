"""
middleware/rate_limit.py — Rate limiting de la app (Capa 2 del diseño).

Implementa la Capa 2 de `DISENO_RATE_LIMITING.md`: un token bucket por
identidad (usuario autenticado o IP) con reglas finas por endpoint, allowlist
de la LAN del hospital + Tailscale, y respuesta 429 con `Retry-After` y
cabeceras `X-RateLimit-*`.

Decisiones:
- **ASGI puro** (no BaseHTTPMiddleware) para NO bufferizar respuestas en
  streaming como el SSE de `/api/v1/events/subscribe`.
- **En memoria por proceso**: el diseño recomienda Redis para consistencia
  entre procesos/instancias; aquí basta porque producción corre un solo
  uvicorn. Migrar a Redis es el siguiente paso (ver §6 del diseño).
- La identidad se toma del JWT (claim `sub`) sin tocar la BD; si no hay token
  válido, se cae a la IP del cliente (respetando `X-Forwarded-For` de Traefik).

Configuración por entorno:
- `SIGAH_RL_ENABLED`   "1" (default) activa; "0" desactiva el middleware.
- `SIGAH_RL_ALLOWLIST` CIDRs separados por coma con límites holgados (LAN).
                        Default: rangos privados + 127/8 + Tailscale 100.64/10.
"""
from __future__ import annotations

import ipaddress
import os
import threading
import time
from collections import OrderedDict
from typing import Optional
from urllib.parse import parse_qs

from jose import JWTError, jwt

from config import JWT_ALG, JWT_SECRET


# ── Configuración ──────────────────────────────────────────────────────────
_ENABLED = os.getenv("SIGAH_RL_ENABLED", "1").strip().lower() in ("1", "true", "yes")

_DEFAULT_ALLOWLIST = (
    "127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,100.64.0.0/10"
)


def _parse_nets(raw: str):
    nets = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            nets.append(ipaddress.ip_network(part, strict=False))
        except ValueError:
            pass
    return nets


_ALLOW_NETS = _parse_nets(os.getenv("SIGAH_RL_ALLOWLIST", _DEFAULT_ALLOWLIST))

# Nº de proxies CONFIABLES por delante (Traefik = 1). La IP real del cliente es
# la que añadió el proxy más cercano: la entrada `depth`-ésima desde la DERECHA
# del X-Forwarded-For. Tomar la izquierda (default ingenuo) es spoofeable: el
# cliente manda "X-Forwarded-For: 10.0.0.1" y Traefik antepone su valor, así que
# la izquierda es atacante-controlada. depth<=0 → ignorar XFF (usar IP directa).
_XFF_DEPTH = int(os.getenv("SIGAH_RL_XFF_DEPTH", "1"))


# ── Token bucket en memoria ──────────────────────────────────────────────────
class _Bucket:
    __slots__ = ("tokens", "last")

    def __init__(self, capacity: float):
        self.tokens = float(capacity)
        self.last = time.monotonic()


_store: "OrderedDict[str, _Bucket]" = OrderedDict()
_lock = threading.Lock()
# Tope DURO real de claves con evicción LRU O(1) (popitem del más antiguo).
# Acota la memoria incluso bajo flood activo desde muchas identidades distintas
# (antes solo se descartaban buckets "llenos", que bajo flood nunca lo están →
# el dict crecía sin límite hasta OOM). Ahora siempre se libera espacio.
_MAX_KEYS = 50_000


def _take(key: str, capacity: int, rate: float):
    """Consume 1 token. Devuelve (permitido, restante, reset_segundos)."""
    now = time.monotonic()
    with _lock:
        b = _store.get(key)
        if b is None:
            # Evicción LRU garantizada y O(1): saca el menos usado recientemente.
            while len(_store) >= _MAX_KEYS:
                _store.popitem(last=False)
            b = _Bucket(capacity)
            _store[key] = b
        else:
            _store.move_to_end(key)  # marca como usado recientemente (LRU)
        # Recarga proporcional al tiempo transcurrido.
        b.tokens = min(float(capacity), b.tokens + (now - b.last) * rate)
        b.last = now
        if b.tokens >= 1.0:
            b.tokens -= 1.0
            return True, int(b.tokens), 0
        reset = 1 if rate <= 0 else max(1, int((1.0 - b.tokens) / rate) + 1)
        return False, 0, reset


# ── Identidad / red ──────────────────────────────────────────────────────────
def _client_ip(scope, headers: dict) -> str:
    if _XFF_DEPTH > 0:
        xff = headers.get(b"x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.decode("latin-1").split(",") if p.strip()]
            if parts:
                # depth-ésima desde la derecha; si hay menos saltos, la más a la izq.
                idx = max(0, len(parts) - _XFF_DEPTH)
                return parts[idx]
    client = scope.get("client")
    return client[0] if client else "0.0.0.0"


def _is_lan(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(addr in net for net in _ALLOW_NETS)


def _sub_de_token(raw: str) -> Optional[str]:
    """Devuelve el `sub` si el token es un access token válido; si no, None."""
    try:
        payload = jwt.decode(raw, JWT_SECRET, algorithms=[JWT_ALG])
    except (JWTError, ValueError):
        return None
    if payload.get("type") != "access":   # ignora refresh tokens (consistencia)
        return None
    sub = payload.get("sub")
    return str(sub) if sub else None


def _identity(headers: dict, ip: str, query_token: Optional[str] = None) -> str:
    # Bearer en header (REST) o ?token= (EventSource no manda headers): así el
    # SSE se contabiliza por user:<sub> y no cae a ip:<IP> compartida tras un NAT.
    raw = None
    auth = headers.get(b"authorization")
    if auth and auth.startswith(b"Bearer "):
        raw = auth[7:].decode("latin-1")
    elif query_token:
        raw = query_token
    if raw:
        sub = _sub_de_token(raw)
        if sub:
            return f"user:{sub}"
    return f"ip:{ip}"


# ── Reglas por endpoint (capacity = burst, rate = recarga/s) ──────────────────
def _rule(path: str, method: str, is_lan: bool):
    """Devuelve (nombre, capacity, rate_por_segundo)."""
    if path == "/api/auth/login" and method == "POST":
        # Anti fuerza bruta: ~5/min LAN, ~3/min fuera.
        return ("login", 5, 5 / 60) if is_lan else ("login", 3, 3 / 60)
    if path == "/api/v1/events/subscribe":
        # SSE: 1 conexión persistente (no alta frecuencia). Regla holgada para no
        # dar 429 a varias pestañas/usuarios tras el mismo NAT al reconectar.
        return ("sse", 30, 1.0) if is_lan else ("sse", 15, 0.5)
    if path.startswith("/api/copilot"):
        # Inferencia cara en una sola GPU: ~10/min LAN, muy estricto fuera.
        return ("copilot", 10, 10 / 60) if is_lan else ("copilot", 3, 3 / 60)
    if method in ("POST", "PUT", "PATCH", "DELETE"):
        # Escrituras: protegen la BD.
        return ("write", 10, 5.0) if is_lan else ("write", 3, 1.0)
    # Lecturas (incluye polling del dashboard cada 15s).
    return ("read", 40, 20.0) if is_lan else ("read", 10, 5.0)


def _skip(path: str, method: str) -> bool:
    if method == "OPTIONS":          # preflight CORS
        return True
    if path == "/health":            # healthcheck de Docker/Traefik
        return True
    if path.startswith("/static"):   # assets estáticos
        return True
    return False


# ── Middleware ASGI ──────────────────────────────────────────────────────────
class RateLimitMiddleware:
    """Middleware ASGI de rate limiting. Registrar con app.add_middleware()."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or not _ENABLED:
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        method = scope.get("method", "GET")
        if _skip(path, method):
            return await self.app(scope, receive, send)

        headers = dict(scope.get("headers") or [])
        ip = _client_ip(scope, headers)
        is_lan = _is_lan(ip)
        name, capacity, rate = _rule(path, method, is_lan)

        # Token por query (?token=) para identificar el SSE por usuario; solo se
        # parsea si aparece "token=" en el query string (barato en el caso común).
        query_token = None
        qs = scope.get("query_string") or b""
        if b"token=" in qs:
            vals = parse_qs(qs.decode("latin-1")).get("token")
            if vals:
                query_token = vals[0]

        subject = _identity(headers, ip, query_token)
        allowed, remaining, reset = _take(f"{subject}:{name}", capacity, rate)

        # Nota: X-RateLimit-Limit expone el burst (capacity) del cubo, no el rate
        # sostenido; X-RateLimit-Remaining es el piso entero de tokens disponibles.
        rl_headers = [
            (b"x-ratelimit-limit", str(capacity).encode()),
            (b"x-ratelimit-remaining", str(max(0, remaining)).encode()),
            (b"x-ratelimit-reset", str(reset).encode()),
        ]

        if not allowed:
            retry = max(1, reset)
            body = (
                b'{"detail":"Demasiadas peticiones. Reintenta en '
                + str(retry).encode()
                + b' s."}'
            )
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json; charset=utf-8"),
                    (b"retry-after", str(retry).encode()),
                    *rl_headers,
                ],
            })
            await send({"type": "http.response.body", "body": body})
            return

        async def send_wrapper(message):
            # Solo tocamos el inicio de la respuesta (seguro para streaming/SSE).
            if message.get("type") == "http.response.start":
                hdrs = list(message.get("headers") or [])
                hdrs.extend(rl_headers)
                message = {**message, "headers": hdrs}
            await send(message)

        await self.app(scope, receive, send_wrapper)
