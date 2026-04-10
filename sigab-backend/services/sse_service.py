"""
SSE (Server-Sent Events) manager for SIGAB.
Manages connected clients and broadcasts events.
"""

import asyncio
import json
from typing import Dict, Set
from datetime import datetime


class SSEManager:
    def __init__(self):
        self._clients: Set[asyncio.Queue] = set()

    async def subscribe(self):
        queue = asyncio.Queue()
        self._clients.add(queue)
        try:
            while True:
                data = await queue.get()
                yield data
        finally:
            self._clients.discard(queue)

    async def broadcast(self, event_type: str, data: dict):
        for k, v in data.items():
            if hasattr(v, "isoformat"):
                data[k] = v.isoformat()

        message = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
        dead = set()
        for queue in self._clients:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                dead.add(queue)
        self._clients -= dead


sse_manager = SSEManager()
