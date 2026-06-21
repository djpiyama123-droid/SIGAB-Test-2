import { useState, useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import StatsCards from '../components/StatsCards';
import DashboardCharts from '../components/DashboardCharts';

const SLIDES = ['kpis', 'charts', 'alerts'];
const ROTATE_INTERVAL = 20000; // 20 segundos por slide

export default function TVDashboard() {
  const { resumen, alertas, loading, error, recargar } = useDashboard();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [time, setTime] = useState(new Date());

  // Auto-rotar slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // Reloj en tiempo real
  useEffect(() => {
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const refresh = setInterval(recargar, 120000);
    return () => clearInterval(refresh);
  }, [recargar]);

  if (loading || !resumen) {
    return (
      <div className="h-screen w-screen bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-emerald-500 text-lg font-semibold">SIGAB</p>
          <p className="text-[var(--content-muted)] text-sm">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  const alertasCriticas = alertas.filter(a => a.prioridad === 'critica');
  const slide = SLIDES[currentSlide];

  return (
    <div className="h-screen w-screen bg-[var(--content-bg)] text-[var(--content-text)] flex flex-col overflow-hidden select-none">
      {/* ── Header TV ── */}
      <header className="flex items-center justify-between px-8 py-4 bg-[var(--content-surface)]/80 border-b border-[var(--content-border)] flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src="/imss_logo.png" className="w-10 h-10 object-contain" alt="IMSS Logo" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">SIGAB</h1>
            <p className="text-xs text-[var(--content-muted)]">Sistema Integral de Gestión de Activos Biomédicos</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-[var(--content-muted)]">IMSS 1 Clínica General Tijuana</p>
          <p className="text-xs text-[var(--content-muted)]">IMSS · Tijuana, B.C.</p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold font-mono text-emerald-500 tabular-nums">
            {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-[var(--content-muted)]">
            {time.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main className="flex-1 p-6 overflow-hidden">
        {slide === 'kpis' && (
          <div className="h-full flex flex-col justify-center space-y-8">
            <StatsCards resumen={resumen} />
            <div className="grid grid-cols-5 gap-4">
              {(resumen.equipos_por_estado || []).map(item => {
                const colors = {
                  operativo: 'bg-emerald-500', en_mantenimiento: 'bg-yellow-500',
                  fuera_servicio: 'bg-red-500', en_traslado: 'bg-violet-500', baja: 'bg-slate-500'
                };
                return (
                  <div key={item.estado} className="bg-[var(--content-surface)] rounded-xl p-6 text-center border border-[var(--content-border)]">
                    <div className={`w-4 h-4 rounded-full ${colors[item.estado] || 'bg-slate-500'} mx-auto mb-3`} />
                    <p className="text-4xl font-black">{item.total}</p>
                    <p className="text-sm text-[var(--content-muted)] mt-1 capitalize">{item.estado?.replace(/_/g, ' ')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {slide === 'charts' && (
          <div className="h-full flex items-center">
            <div className="w-full">
              <DashboardCharts resumen={resumen} />
            </div>
          </div>
        )}

        {slide === 'alerts' && (
          <div className="h-full flex flex-col justify-center max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">{alertasCriticas.length > 0 ? '🚨' : '✅'}</span>
              {alertasCriticas.length > 0
                ? `${alertasCriticas.length} Alertas Críticas`
                : 'Sin Alertas Críticas'}
            </h2>
            {alertas.length === 0 ? (
              <p className="text-[var(--content-muted)] text-lg">Todos los sistemas operando con normalidad.</p>
            ) : (
              <div className="space-y-3">
                {alertas.slice(0, 8).map((a, i) => (
                  <div key={a.id || i}
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      a.prioridad === 'critica'
                        ? 'bg-red-500/15 border-red-500/40'
                        : 'bg-[var(--content-surface)] border-[var(--content-border)]'
                    }`}>
                    <span className="text-xl">{a.prioridad === 'critica' ? '🚨' : '⚠️'}</span>
                    <div>
                      <p className="text-[var(--content-text)] text-sm font-medium">{a.mensaje}</p>
                      <p className="text-[var(--content-muted)] text-xs mt-1">
                        {a.equipo_nombre || ''} {a.created_at ? `· ${new Date(a.created_at).toLocaleString('es-MX')}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Ticker inferior ── */}
      <footer className="bg-[var(--content-surface)] border-t border-[var(--content-border)] px-8 py-2 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[var(--content-muted)]">En línea · Auto-actualización cada 2 min</span>
        </div>

        {/* Slide indicators */}
        <div className="flex gap-2">
          {SLIDES.map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSlide ? 'bg-emerald-400' : 'bg-[var(--content-border)]'
              }`}
            />
          ))}
        </div>

        <div className="text-xs text-[var(--content-muted)]">
          Depto. Conservación y Mantenimiento · Bioingeniería Xochicalco
        </div>
      </footer>
    </div>
  );
}
