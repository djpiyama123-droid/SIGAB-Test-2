import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { useToast } from '../components/Toast';
import { Calendar, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

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
      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
        <AlertTriangle className="h-3 w-3" /> Vencido hace {Math.abs(dias)}d
      </span>
    );
  if (dias === 0)
    return (
      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
        <AlertTriangle className="h-3 w-3" /> Vence hoy
      </span>
    );
  if (dias <= 7)
    return (
      <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
        <Clock className="h-3 w-3" /> {dias}d restantes
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
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
        <h1 className="text-2xl font-bold text-[var(--content-text)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
          </div>
          Mantenimientos Preventivos
        </h1>
        <p className="text-[var(--content-muted)] text-sm mt-1 ml-[52px]">
          Programación y seguimiento de preventivos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[['todos','Todos'],['vencidos','Vencidos'],['proximos','Próximos 30d']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              filtro === v
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-[var(--content-surface)] text-[var(--content-muted)] border-[var(--content-border)] hover:bg-[var(--content-border)]'
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
                  urgente ? 'border-red-500/40 border-l-4 border-l-red-500' : 'border-[var(--content-border)]'
                }`}>
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      <p className="text-[var(--content-text)] text-sm font-mono">
                        {pp.proxima_ejecucion}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--content-muted)]">
                      Cada {pp.frecuencia_dias} días
                    </p>
                    <button onClick={() => handleEjecutar(pp.id)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white text-xs font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marcar ejecutado
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
