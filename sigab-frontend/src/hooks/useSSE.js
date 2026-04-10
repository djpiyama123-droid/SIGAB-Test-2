import { useEffect, useRef, useCallback } from 'react';

export function useSSE(url, onEvent) {
  const eventSourceRef = useRef(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(url);

    es.addEventListener('equipo_update', (e) => {
      onEvent('equipo_update', JSON.parse(e.data));
    });

    es.addEventListener('nueva_orden', (e) => {
      onEvent('nueva_orden', JSON.parse(e.data));
    });

    es.addEventListener('nueva_alerta', (e) => {
      onEvent('nueva_alerta', JSON.parse(e.data));
    });

    es.onerror = () => {
      es.close();
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [url, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);
}
