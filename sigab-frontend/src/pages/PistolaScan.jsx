import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scan, CheckCircle2, XCircle, Cpu, MapPin, Settings2, Maximize2, Minimize2,
  Trash2, ClipboardList, ArrowRight, Zap, AlertTriangle
} from 'lucide-react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';

const ESTADO_COLOR = {
  operativo: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  en_mantenimiento: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  fuera_servicio: 'text-red-400 bg-red-500/10 border-red-500/30',
  baja: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  en_traslado: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const ESTADO_LABEL = {
  operativo: 'Operativo',
  en_mantenimiento: 'En mantenimiento',
  fuera_servicio: 'Fuera de servicio',
  baja: 'Baja',
  en_traslado: 'En traslado',
};

const HISTORIAL_MAX = 10;

export default function PistolaScan() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const lastSubmitRef = useRef(0);

  const [buffer, setBuffer] = useState('');
  const [historial, setHistorial] = useState([]);
  const [ultimoMatch, setUltimoMatch] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [kiosco, setKiosco] = useState(false);
  const [stats, setStats] = useState({ aciertos: 0, fallos: 0 });

  const refocusInput = useCallback(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    refocusInput();
    const id = setInterval(refocusInput, 800);
    const handleVisibilityChange = () => refocusInput();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refocusInput]);

  const realizarLookup = useCallback(async (raw) => {
    const q = (raw || '').trim();
    if (!q || q.length < 3) return;

    const now = Date.now();
    if (now - lastSubmitRef.current < 200) return;
    lastSubmitRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await api.lookupEquipo(q);
      const match = res.match;
      setUltimoMatch({ ...match, _matched_by: res.matched_by, _at: new Date() });
      setHistorial((prev) => [
        { ...match, _matched_by: res.matched_by, _at: new Date() },
        ...prev.filter((e) => e.id !== match.id),
      ].slice(0, HISTORIAL_MAX));
      setStats((s) => ({ ...s, aciertos: s.aciertos + 1 }));
      toast.success(`${match.nombre} — ${match.serie}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || `Sin resultados para "${q}"`;
      setError({ q, msg });
      setStats((s) => ({ ...s, fallos: s.fallos + 1 }));
      toast.error(msg);
    } finally {
      setLoading(false);
      setBuffer('');
      setTimeout(refocusInput, 50);
    }
  }, [refocusInput]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      realizarLookup(buffer);
    } else if (e.key === 'Escape') {
      setBuffer('');
    }
  };

  const toggleKiosco = () => {
    setKiosco((v) => !v);
    if (!kiosco && containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else if (kiosco && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const limpiarHistorial = () => {
    setHistorial([]);
    setUltimoMatch(null);
    setError(null);
    setStats({ aciertos: 0, fallos: 0 });
  };

  const abrirOrden = (equipo) => {
    navigate(`/ordenes?equipo_id=${equipo.id}&from=scan`);
  };

  const abrirFicha = (equipo) => {
    navigate(`/equipos?focus=${equipo.id}`);
  };

  return (
    <div
      ref={containerRef}
      className={`${kiosco ? 'fixed inset-0 z-50 overflow-auto bg-[var(--content-bg)]' : ''} p-4 md:p-6 space-y-6`}
      onClick={refocusInput}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Scan className="h-5 w-5 text-white" />
            </div>
            Pistola Lectora QR
          </h1>
          <p className="text-[var(--content-muted)] mt-1">
            Modo HID — Conecta tu lector USB/Bluetooth (Zebra, Honeywell, Datalogic) y escanea cualquier QR de SIGAH.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[var(--content-muted)]">Escuchando lector</span>
          </div>
          <button
            onClick={toggleKiosco}
            className="flex items-center gap-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] border border-[var(--content-border)] text-[var(--content-text)] px-3 py-2 rounded-xl text-sm font-medium transition-all"
            title={kiosco ? 'Salir de modo kiosco' : 'Modo kiosco para taller'}
          >
            {kiosco ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {kiosco ? 'Salir' : 'Kiosco'}
          </button>
          <button
            onClick={limpiarHistorial}
            className="flex items-center gap-2 bg-[var(--content-surface)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--content-border)] text-[var(--content-muted)] px-3 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Input invisible para captura del lector */}
      <input
        ref={inputRef}
        type="text"
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="sr-only"
        aria-label="Captura de pistola lectora QR"
      />

      {/* Tarjeta principal — último escaneo o instrucciones */}
      <div className="relative">
        {!ultimoMatch && !error && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 bg-[var(--content-surface)] border-2 border-dashed border-[var(--content-border)] rounded-2xl text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
              <Scan className="h-12 w-12 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--content-text)]">Esperando escaneo</h2>
              <p className="text-[var(--content-muted)] mt-1 max-w-md">
                Apunta tu pistola lectora al QR de cualquier equipo. La ficha se abrirá automáticamente.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--content-muted)] bg-[var(--content-bg)] border border-[var(--content-border)] px-3 py-1.5 rounded-full">
              <Settings2 className="h-3 w-3" />
              <span>Acepta: qr_token, número de serie o inventario</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--content-text)] font-medium">Buscando equipo...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-4 p-6 bg-red-500/5 border-2 border-red-500/30 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400">No se encontró el equipo</h3>
              <p className="text-[var(--content-muted)] mt-1">{error.msg}</p>
              <p className="text-xs text-[var(--content-muted)] mt-2 font-mono">
                Código escaneado: <span className="text-[var(--content-text)]">{error.q}</span>
              </p>
            </div>
          </div>
        )}

        {ultimoMatch && !loading && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-2 border-emerald-500/30 rounded-2xl p-6 shadow-lg shadow-emerald-500/10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-[var(--content-text)] truncate">{ultimoMatch.nombre}</h2>
                    <p className="text-[var(--content-muted)] text-sm font-mono mt-1">
                      {ultimoMatch.marca} {ultimoMatch.modelo}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${ESTADO_COLOR[ultimoMatch.estado] || ESTADO_COLOR.baja}`}>
                    {ESTADO_LABEL[ultimoMatch.estado] || ultimoMatch.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <DatoCampo label="Serie" value={ultimoMatch.serie} mono />
                  <DatoCampo label="Inventario" value={ultimoMatch.inventario || '—'} mono />
                  <DatoCampo label="Área" value={ultimoMatch.area || '—'} icon={<MapPin className="h-3 w-3" />} />
                  <DatoCampo label="Piso" value={ultimoMatch.piso || '—'} />
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <button
                    onClick={() => abrirFicha(ultimoMatch)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Cpu className="h-4 w-4" />
                    Abrir ficha
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => abrirOrden(ultimoMatch)}
                    className="flex items-center gap-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] border border-[var(--content-border)] text-[var(--content-text)] px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Nueva orden
                  </button>
                  <span className="ml-auto text-xs text-[var(--content-muted)] flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Match por <strong className="text-emerald-400">{ultimoMatch._matched_by}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatChip label="Aciertos" value={stats.aciertos} variant="success" />
        <StatChip label="Fallos" value={stats.fallos} variant="danger" />
        <StatChip label="Total" value={stats.aciertos + stats.fallos} variant="info" />
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--content-border)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--content-text)] flex items-center gap-2">
              <Scan className="h-4 w-4 text-emerald-400" />
              Historial de escaneos
              <span className="text-xs font-normal text-[var(--content-muted)]">({historial.length})</span>
            </h3>
            <p className="text-xs text-[var(--content-muted)]">Click para abrir ficha</p>
          </div>
          <div className="divide-y divide-[var(--content-border)]/50">
            {historial.map((eq) => (
              <button
                key={`${eq.id}-${eq._at?.getTime()}`}
                onClick={() => abrirFicha(eq)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--content-bg)] transition-colors text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  eq.estado === 'operativo' ? 'bg-emerald-400' :
                  eq.estado === 'en_mantenimiento' ? 'bg-amber-400' :
                  eq.estado === 'fuera_servicio' ? 'bg-red-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-3">
                  <p className="text-sm font-semibold text-[var(--content-text)] truncate">{eq.nombre}</p>
                  <p className="text-xs font-mono text-[var(--content-muted)] truncate">{eq.serie}</p>
                  <p className="text-xs text-[var(--content-muted)] truncate">{eq.area || '—'}</p>
                  <p className="text-xs text-[var(--content-muted)]">
                    {eq._at ? eq._at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--content-muted)] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tip footer */}
      <div className="flex items-start gap-3 text-xs text-[var(--content-muted)] bg-[var(--content-surface)]/50 border border-[var(--content-border)]/50 rounded-xl p-4">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          Asegúrate de que el lector esté configurado para enviar <strong className="text-[var(--content-text)]">Enter (CR)</strong> al
          final de cada lectura. Si no abre la ficha, revisa <code className="bg-[var(--content-bg)] px-1.5 py-0.5 rounded text-emerald-400">docs/HARDWARE_LECTORES.md</code>.
        </p>
      </div>
    </div>
  );
}

function DatoCampo({ label, value, mono = false, icon = null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--content-muted)] flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-sm text-[var(--content-text)] mt-0.5 truncate ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </p>
    </div>
  );
}

function StatChip({ label, value, variant }) {
  const colors = {
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    danger: 'text-red-400 bg-red-500/10 border-red-500/30',
    info: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${colors[variant]}`}>
      <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}
