import { useEffect, useRef, useState, useCallback } from 'react';

export function useSSE({ assetId = null, onEvent = null } = {}) {
  const [lastEventId, setLastEventId] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
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
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const token = localStorage.getItem('token') || '';
    // Append necessary query params
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (assetId) params.append('asset_id', assetId);
    if (lastEventId) params.append('last_event_id', lastEventId);

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
        setLastEventId(e.lastEventId);
        if (onEvent) {
          const parsed = JSON.parse(e.data);
          onEvent('message', parsed);
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
          setLastEventId(e.lastEventId);
          if (onEvent) {
             const parsed = JSON.parse(e.data);
             onEvent(type, parsed);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse custom event', err);
        }
      });
    });

    // 5-min max connection timeout
    setTimeout(() => {
      if (eventSourceRef.current === es) {
          console.log('[SSE] Hard refreshing connection (5min limit)');
          connect();
      }
    }, maxConnectionTimeMs);

  }, [assetId, lastEventId, cleanup, onEvent, maxConnectionTimeMs]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { setLastEventId, isConnected, hasError };
}
