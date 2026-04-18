import asyncio
import json
from typing import Dict, Any, Optional

class EventBroadcaster:
    def __init__(self):
        self.subscribers: list[asyncio.Queue] = []

    async def broadcast(self, event_type: str, data: Dict[str, Any], filter_asset_id: Optional[int] = None):
        """Broadcasts an event to all connected clients."""
        payload = {
            "type": event_type,
            "data": data
        }
        if filter_asset_id is not None:
            payload["asset_id"] = filter_asset_id

        for queue in self.subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                pass

    def subscribe(self) -> asyncio.Queue:
        """Create a new queue for a connecting client."""
        queue = asyncio.Queue(maxsize=100)
        self.subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Remove a disconnected client's queue."""
        if queue in self.subscribers:
            self.subscribers.remove(queue)

broadcaster = EventBroadcaster()
