import { useEffect, useRef, useState, useCallback } from 'react';

export function useSSE({ assetId = null, onEvent = null } = {}) {
  const lastEventIdRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const hardRefreshTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Exponential backoff parameters
  const baseTimeoutMs = 1000;
  const maxTimeoutMs = 30000; // Cap to 30 seconds
  const maxConnectionTimeMs = 5 * 60 * 1000; // 5 minutes max connection

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (hardRefreshTimeoutRef.current) {
      clearTimeout(hardRefreshTimeoutRef.current);
      hardRefreshTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const token = localStorage.getItem('token') || '';
    // El SSE ahora exige sesión (antes era público). Sin token no tiene sentido
    // intentar: evita un bucle de reconexión 401 cuando no hay sesión. Si el
    // access token EXPIRA con la pestaña abierta, el handshake dará 401 y caerá
    // al polling de respaldo (useDashboard); renovar el token en caliente queda
    // como follow-up (hoy se recupera al recargar / re-login).
    if (!token) {
      setIsConnected(false);
      return;
    }
    // Append necessary query params
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (assetId) params.append('asset_id', assetId);
    if (lastEventIdRef.current) params.append('last_event_id', lastEventIdRef.current);

    const base = `${window.location.protocol}//${window.location.host}`;
    const url = `${base}/api/v1/events/subscribe?${params.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onerror = (err) => {
      // Reconnect with exponential backoff
      cleanup();
      
      setHasError(true);
      setIsConnected(false);
      
      const attempts = reconnectAttemptsRef.current;
      const timeoutMs = Math.min(baseTimeoutMs * Math.pow(2, attempts), maxTimeoutMs);
      reconnectAttemptsRef.current += 1;
      
      console.warn(`[SSE] Connection error. Reconnecting in ${timeoutMs}ms...`);
      reconnectTimeoutRef.current = setTimeout(connect, timeoutMs);
    };

    es.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      setHasError(false);
      reconnectAttemptsRef.current = 0; // Reset consecutive failures
    };

    es.addEventListener('ping', () => {
      // Used to keep connection alive by proxies
      // Ignore ping events logically
    });

    // We can abstract handling different events
    // Assuming backend sends JSON payload in e.data
    // You can handle standard messages here or bind specific event names
    es.onmessage = (e) => {
      try {
        lastEventIdRef.current = e.lastEventId;
        if (onEventRef.current) {
          const parsed = JSON.parse(e.data);
          onEventRef.current('message', parsed);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse message', err);
      }
    };

    // Support custom events if they happen
    const customTypes = ['status_change', 'equipo_update', 'nueva_orden', 'nueva_alerta'];
    customTypes.forEach(type => {
      es.addEventListener(type, (e) => {
        try {
          lastEventIdRef.current = e.lastEventId;
          if (onEventRef.current) {
             const parsed = JSON.parse(e.data);
             onEventRef.current(type, parsed);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse custom event', err);
        }
      });
    });

    // 5-min max connection timeout
    hardRefreshTimeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current === es) {
          console.log('[SSE] Hard refreshing connection (5min limit)');
          connect();
      }
    }, maxConnectionTimeMs);

  }, [assetId, cleanup, maxConnectionTimeMs]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const setLastEventId = useCallback((id) => {
    lastEventIdRef.current = id;
  }, []);

  return { setLastEventId, isConnected, hasError };
}
