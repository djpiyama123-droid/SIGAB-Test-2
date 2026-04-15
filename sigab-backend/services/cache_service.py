import time
import logging
from typing import Any, Optional, Dict

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry['expiry']:
                return entry['value']
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 60):
        self._cache[key] = {
            'value': value,
            'expiry': time.time() + ttl_seconds
        }

    def invalidate(self, key: str):
        if key in self._cache:
            del self._cache[key]
            
    def clear(self):
        self._cache.clear()

cache_service = CacheService()
