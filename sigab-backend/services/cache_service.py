"""
services/cache_service.py — Caché en memoria para SIGAH.

TTL tiers recomendados:
  STATIC  = 300s  — catálogos (áreas, zonas) que cambian raramente
  WARM    = 120s  — preventivos próximos, reporte diario
  HOT     = 30s   — dashboard/resumen, alertas pendientes, mapa

Uso con decorador:
    @cache_service.cached("mapa_{tenant_id}", ttl=WARM)
    async def get_mapa_equipos(tenant_id: int, session): ...

Invalidación al mutar:
    cache_service.invalidate_prefix("dashboard_")
    cache_service.invalidate_prefix(f"alertas_{tenant_id}")
"""
import time
import asyncio
import functools
import logging
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# TTL tiers (segundos)
STATIC = 300
WARM   = 120
HOT    = 30


class CacheService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._hits   = 0
        self._misses = 0

    # ── Operaciones básicas ──────────────────────────────────────────

    def get(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if entry and time.monotonic() < entry["expiry"]:
            self._hits += 1
            return entry["value"]
        if entry:
            del self._cache[key]
        self._misses += 1
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = HOT) -> None:
        self._cache[key] = {
            "value":  value,
            "expiry": time.monotonic() + ttl_seconds,
            "ts":     time.time(),
        }

    def invalidate(self, key: str) -> bool:
        return self._cache.pop(key, None) is not None

    def invalidate_prefix(self, prefix: str) -> int:
        """Elimina todas las entradas cuya clave empiece con `prefix`."""
        keys = [k for k in list(self._cache) if k.startswith(prefix)]
        for k in keys:
            del self._cache[k]
        if keys:
            logger.debug("cache invalidate_prefix=%r  removed=%d", prefix, len(keys))
        return len(keys)

    def clear(self) -> None:
        self._cache.clear()

    # ── Stats ─────────────────────────────────────────────────────────

    def stats(self) -> Dict[str, Any]:
        now = time.monotonic()
        active = sum(1 for e in self._cache.values() if now < e["expiry"])
        total  = self._hits + self._misses
        return {
            "keys_active": active,
            "keys_total":  len(self._cache),
            "hits":        self._hits,
            "misses":      self._misses,
            "hit_rate":    round(self._hits / total, 3) if total else 0.0,
        }

    # ── Decorador ────────────────────────────────────────────────────

    def cached(self, key_template: str, ttl: int = HOT) -> Callable:
        """
        Decorador para funciones async.

        El `key_template` puede usar cualquier nombre de parámetro de la función:
            @cache_service.cached("dashboard_{tenant_id}", ttl=HOT)
            async def dashboard_resumen(tenant_id: int, session): ...

        La clave se resuelve con str.format_map sobre los kwargs recibidos
        en cada llamada (los args posicionales se ignoran en el format, pero
        la función los recibe con normalidad).
        """
        def decorator(fn: Callable) -> Callable:
            @functools.wraps(fn)
            async def wrapper(*args, **kwargs):
                try:
                    cache_key = key_template.format_map(kwargs)
                except KeyError:
                    cache_key = key_template

                hit = self.get(cache_key)
                if hit is not None:
                    return hit

                result = await fn(*args, **kwargs)
                self.set(cache_key, result, ttl_seconds=ttl)
                return result
            return wrapper
        return decorator

    # ── Purga de expirados (llamar periódicamente si se desea) ───────

    def purge_expired(self) -> int:
        now   = time.monotonic()
        stale = [k for k, e in self._cache.items() if now >= e["expiry"]]
        for k in stale:
            del self._cache[k]
        return len(stale)


cache_service = CacheService()
