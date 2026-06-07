"""Rate limiting in-memory para endpoints sensibles (sin dependencias externas).

Limita intentos por IP usando una ventana deslizante simple. Es por-proceso
(no se comparte entre workers de uvicorn), pero eleva significativamente el
costo de un ataque de fuerza bruta sobre /auth/login. Para múltiples workers
o varios nodos, migrar a un backend compartido (Redis) más adelante.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Ventana deslizante por clave (IP). Thread-safe vía Lock."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    @staticmethod
    def _client_ip(request: Request) -> str:
        # Detrás de Traefik la IP real viene en X-Forwarded-For (primera de la lista).
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, request: Request) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        key = self._client_ip(request)
        with self._lock:
            dq = self._hits[key]
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= self.max_attempts:
                retry = int(self.window_seconds - (now - dq[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiados intentos. Espera un momento e inténtalo de nuevo.",
                    headers={"Retry-After": str(max(retry, 1))},
                )
            dq.append(now)
            # Limpieza oportunista para que el dict no crezca sin límite.
            if len(self._hits) > 10000:
                for k in list(self._hits):
                    if not self._hits[k] or self._hits[k][-1] < cutoff:
                        self._hits.pop(k, None)


def rate_limit_dependency(max_attempts: int, window_seconds: int):
    """Construye una dependencia FastAPI que aplica el límite por IP."""
    limiter = InMemoryRateLimiter(max_attempts, window_seconds)

    async def _dep(request: Request) -> None:
        limiter.check(request)

    return _dep


# Límite para /auth/login: 10 intentos por minuto por IP.
login_rate_limit = rate_limit_dependency(max_attempts=10, window_seconds=60)
