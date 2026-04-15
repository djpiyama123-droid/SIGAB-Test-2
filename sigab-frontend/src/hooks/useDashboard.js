import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';
import { useSSE } from './useSSE';

export function useDashboard() {
  const [resumen, setResumen] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const cargar = useCallback(async (filtrosActuales = {}) => {
    try {
      setError(null);
      const [res, eqs, als] = await Promise.all([
        api.getDashboard(),
        api.getDashboardEquipos(filtrosActuales),
        api.getAlertasPendientes(),
      ]);
      setResumen(res);
      setEquipos(eqs?.equipos || []);
      setAlertas(Array.isArray(als) ? als : als?.alertas || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Error de conexion');
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Configure SSE via the custom hook
  const { hasError, isConnected } = useSSE({
    onEvent: (type, payload) => {
      if (type === 'nueva_orden') {
        toast.success(`Nueva orden de servicio: OS-${payload.orden_id}`, {
          icon: '🛠️',
        });
        cargar(filtros);
      } else if (type === 'nueva_alerta') {
        const isCritico = payload.prioridad === 'critica';
        toast[isCritico ? 'error' : 'custom'](
          `Nueva Alerta: ${payload.mensaje}`, 
          { icon: isCritico ? '🚨' : '⚠️', duration: 5000 }
        );
        cargar(filtros);
      } else if (type === 'status_change') {
        // generic refresh for state changes
        cargar(filtros);
      }
    }
  });

  useEffect(() => {
    cargar(filtros);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtros)]);

  // Fallback to polling if SSE disconnected/errors out
  useEffect(() => {
    if (hasError || !isConnected) {
      console.warn('[Dashboard] SSE is disconnected. Falling back to polling every 10s.');
      const intervalId = setInterval(() => {
        cargar(filtros);
      }, 10000);
      return () => clearInterval(intervalId);
    }
  }, [hasError, isConnected, cargar, filtros]);

  return {
    resumen,
    equipos,
    setEquipos,
    alertas,
    filtros,
    setFiltros,
    loading,
    error,
    recargar: () => cargar(filtros),
  };
}
