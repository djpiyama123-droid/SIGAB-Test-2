import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    cargar(filtros);

    // Setup SSE para el dashboard principal
    const token = localStorage.getItem('token');
    const url = token ? `/api/dashboard/stream?token=${token}` : '/api/dashboard/stream';
    const sse = new EventSource(url);

    sse.addEventListener('nueva_orden', (e) => {
      try {
        const payload = JSON.parse(e.data);
        toast.success(`Nueva orden de servicio: OS-${payload.orden_id}`, {
          icon: '🛠️',
        });
        cargar(filtros);
      } catch (err) {}
    });

    sse.addEventListener('nueva_alerta', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const isCritico = payload.prioridad === 'critica';
        toast[isCritico ? 'error' : 'custom'](
          `Nueva Alerta: ${payload.mensaje}`, 
          { icon: isCritico ? '🚨' : '⚠️', duration: 5000 }
        );
        cargar(filtros);
      } catch (err) {}
    });

    return () => {
      sse.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtros)]);

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
