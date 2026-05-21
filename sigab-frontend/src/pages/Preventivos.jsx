import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { useToast } from '../components/Toast';

function diasRestantes(fecha) {
  if (!fecha) return null;
  const diff = Math.ceil((new Date(fecha) - new Date()) / 86400000);
  return diff;
}

function BadgeVencimiento({ fecha }) {
  const dias = diasRestantes(fecha);
  if (dias === null) return null;
  if (dias < 0)
    return (
      <span className="bg-red-900/60 text-red-300 text-xs px-2 py-0.5 rounded font-medium">
        Vencido hace {Math.abs(dias)}d
      </span>
    );
  if (dias === 0)
    return (
      <span className="bg-red-900/60 text-red-300 text-xs px-2 py-0.5 rounded font-medium">
        Vence hoy
      </span>
    );
  if (dias <= 7)
    return (
      <span className="bg-orange-900/60 text-orange-300 text-xs px-2 py-0.5 rounded font-medium">
        {dias}d restantes
      </span>
    );
  return (
    <span className="bg-emerald-900/40 text-emerald-400 text-xs px-2 py-0.5 rounded font-medium">
      {dias}d restantes
    </span>
  );
}

export default function Preventivos() {
  const toast = useToast();
  const [preventivos, setPreventivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos | vencidos | proximos

  const cargar = () => {
    setLoading(true);
    api.getPreventivos()
      .then((res) => setPreventivos(res.preventivos || []))
      .catch((err) => {
        console.error(err);
        toast.error('No se pudieron cargar los preventivos');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleEjecutar = async (id) => {
    if (!window.confirm('¿Registrar este preventivo como ejecutado hoy?')) return;
    const tid = toast.loading('Registrando ejecución…');
    try {
      await api.ejecutarPreventivo(id);
      toast.success('Preventivo registrado como ejecutado', { id: tid });
      cargar();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'No se pudo registrar el preventivo', { id: tid });
    }
  };

  const visibles = preventivos.filter((pp) => {
    const dias = diasRestantes(pp.proxima_ejecucion);
    if (filtro === 'vencidos') return dias !== null && dias < 0;
    if (filtro === 'proximos') return dias !== null && dias >= 0 && dias <= 30;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--content-text)]">Mantenimientos Preventivos</h1>
        <p className="text-[var(--content-muted)] text-sm">
          Programación y seguimiento de preventivos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[['todos','Todos'],['vencidos','Vencidos'],['proximos','Próximos 30d']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === v ? 'bg-emerald-800/60 text-emerald-300' : 'bg-[var(--content-surface)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[var(--content-muted)] py-12 text-center">Cargando preventivos...</div>
      ) : visibles.length === 0 ? (
        <div className="text-[var(--content-muted)] py-12 text-center">
          Sin preventivos en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((pp) => {
            const dias = diasRestantes(pp.proxima_ejecucion);
            const urgente = dias !== null && dias <= 3;
            return (
              <div key={pp.id}
                className={`bg-[var(--content-surface)] rounded-xl border p-5 ${
                  urgente ? 'border-red-700' : 'border-[var(--content-border)]'
                }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[var(--content-text)] font-medium text-sm">
                        {pp.tipo_preventivo}
                      </h3>
                      <BadgeVencimiento fecha={pp.proxima_ejecucion} />
                    </div>
                    <p className="text-[var(--content-muted)] text-xs">
                      {pp.equipo_nombre}
                      {pp.equipo_serie && (
                        <span className="ml-1 font-mono text-[var(--content-muted)]">
                          ({pp.equipo_serie})
                        </span>
                      )}
                    </p>
                    {pp.equipo_area && (
                      <p className="text-[var(--content-muted)] text-xs mt-0.5">
                        Área: {pp.equipo_area}
                      </p>
                    )}
                    {pp.descripcion_procedimiento && (
                      <p className="text-[var(--content-muted)] text-xs mt-2 line-clamp-2">
                        {pp.descripcion_procedimiento}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4 space-y-2">
                    <div>
                      <p className="text-xs text-[var(--content-muted)]">Próxima ejecución</p>
                      <p className="text-white text-sm font-mono">
                        {pp.proxima_ejecucion}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--content-muted)]">
                      Cada {pp.frecuencia_dias} días
                    </p>
                    <button onClick={() => handleEjecutar(pp.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors">
                      ✓ Marcar ejecutado
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
