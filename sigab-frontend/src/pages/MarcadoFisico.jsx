import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag, Download, Calculator, Sparkles, Check, X, Search,
  Factory, Truck, CheckCircle2, AlertTriangle, ChevronDown, Layers,
  Mail, FileText, Award
} from 'lucide-react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';
import PlacaPreview, { TIER_PRESETS } from '../components/PlacaPreview';

const TIERS = [
  {
    id: 'basico',
    label: 'Básico',
    subtitle: 'Etiqueta poliéster adhesivo',
    badge: 'Económico',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    accent: 'from-slate-500 to-slate-600',
    accentRing: 'ring-slate-500/30',
    accentBg: 'bg-slate-500/10 border-slate-500/30',
    accentText: 'text-slate-300',
    features: [
      'Poliéster blanco 75µm',
      '40 × 25 mm',
      'Impresión digital + laminado',
      'Adhesivo 3M removible',
      'Lead time: 3 días',
    ],
    costo: 35,
    recomendado: 'Equipos de bajo valor o uso temporal',
  },
  {
    id: 'estandar',
    label: 'Estándar',
    subtitle: 'Aluminio anodizado grabado láser',
    badge: 'Más vendido',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    accent: 'from-blue-600 to-cyan-600',
    accentRing: 'ring-blue-500/40',
    accentBg: 'bg-blue-500/10 border-blue-500/30',
    accentText: 'text-blue-300',
    features: [
      'Aluminio anodizado 0.5mm',
      '50 × 30 mm',
      'Grabado láser CO2 permanente',
      'Adhesivo 3M VHB industrial',
      'Resistente a desinfectantes',
      'Lead time: 7 días',
    ],
    costo: 120,
    recomendado: 'Equipos biomédicos en operación regular',
    destacado: true,
  },
  {
    id: 'premium',
    label: 'Premium',
    subtitle: 'Acero inoxidable 304 grabado',
    badge: 'Áreas críticas',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accent: 'from-emerald-600 to-teal-600',
    accentRing: 'ring-emerald-500/40',
    accentBg: 'bg-emerald-500/10 border-emerald-500/30',
    accentText: 'text-emerald-300',
    features: [
      'Acero inox 304 espesor 1mm',
      '60 × 40 mm',
      'Grabado láser fibra permanente',
      'Atornillado (2 puntos)',
      'Apto autoclave 134°C',
      'Lead time: 10 días',
    ],
    costo: 280,
    recomendado: 'UCI, quirófanos, áreas estériles',
  },
];

const ESTADO_COLOR = {
  operativo: 'bg-emerald-400',
  en_mantenimiento: 'bg-amber-400',
  fuera_servicio: 'bg-red-400',
  baja: 'bg-slate-400',
  en_traslado: 'bg-blue-400',
};

export default function MarcadoFisico() {
  const [tier, setTier] = useState('estandar');
  const [equipos, setEquipos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [soloSinPlaca, setSoloSinPlaca] = useState(false);

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    setLoading(true);
    try {
      const res = await api.getEquipos({ limit: 500 });
      setEquipos(res.equipos || []);
    } catch (err) {
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  const areas = useMemo(
    () => [...new Set(equipos.map((e) => e.area).filter(Boolean))].sort(),
    [equipos]
  );

  const equiposFiltrados = useMemo(() => {
    let list = equipos;
    if (filtroArea) list = list.filter((e) => e.area === filtroArea);
    if (soloSinPlaca) list = list.filter((e) => !e.placa_instalada);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      list = list.filter(
        (e) =>
          (e.nombre || '').toLowerCase().includes(q) ||
          (e.serie || '').toLowerCase().includes(q) ||
          (e.marca || '').toLowerCase().includes(q) ||
          (e.inventario || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [equipos, busqueda, filtroArea, soloSinPlaca]);

  const tierActivo = TIERS.find((t) => t.id === tier);

  const cotizacion = useMemo(() => {
    const cantidad = seleccionados.length;
    const subtotal = cantidad * tierActivo.costo;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { cantidad, subtotal, iva, total };
  }, [seleccionados, tierActivo]);

  const toggleSeleccion = useCallback((id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSeleccionarTodos = () => {
    const ids = equiposFiltrados.map((e) => e.id);
    const allSelected = ids.every((id) => seleccionados.includes(id));
    if (allSelected) {
      const idsSet = new Set(ids);
      setSeleccionados((prev) => prev.filter((id) => !idsSet.has(id)));
    } else {
      setSeleccionados((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const descargarZip = async () => {
    if (seleccionados.length === 0) {
      toast.error('Selecciona al menos un equipo');
      return;
    }

    setGenerando(true);
    const toastId = toast.loading(`Generando ${seleccionados.length} placas...`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/marcado-fisico/batch-production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipo_ids: seleccionados,
          tier,
          folio_prefix: 'SIGAH',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `sigah_placas_${tier}_${seleccionados.length}eq_${ts}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`ZIP listo — envíalo al fabricante`, { id: toastId });
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setGenerando(false);
    }
  };

  const equipoPreview = useMemo(
    () => equipos.find((e) => seleccionados.includes(e.id)) || equipos[0] || {
      id: 0,
      nombre: 'Ventilador Mecánico',
      serie: 'SN-DEMO-001',
      inventario: 'SIGAH-0001',
      qr_token: 'demo-token',
    },
    [seleccionados, equipos]
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Tag className="h-5 w-5 text-white" />
            </div>
            Marcado Físico de Activos
          </h1>
          <p className="text-[var(--content-muted)] mt-1 max-w-2xl">
            Solicita placas físicas grabadas con QR para tus equipos biomédicos. Generamos los archivos de producción
            listos para tu fabricante de confianza.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-xs text-[var(--content-muted)]">
            <Award className="h-3.5 w-3.5 text-amber-400" />
            Resistente a desinfectantes hospitalarios · Cumple NOM-016
          </div>
        </div>
      </div>

      {/* ═══ Tier Selector ═══ */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-[var(--content-muted)] mb-3 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          Selecciona un tier de servicio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((t) => {
            const activo = tier === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                  activo
                    ? `${t.accentBg} ${t.accentRing} ring-2 shadow-xl`
                    : 'bg-[var(--content-surface)] border-[var(--content-border)] hover:border-[var(--content-border)]/80'
                }`}
              >
                {t.destacado && (
                  <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </span>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${t.badgeColor}`}>
                      {t.badge}
                    </span>
                    <h3 className="text-xl font-bold text-[var(--content-text)] mt-2">{t.label}</h3>
                    <p className="text-xs text-[var(--content-muted)]">{t.subtitle}</p>
                  </div>
                  {activo && <CheckCircle2 className={`h-6 w-6 ${t.accentText}`} />}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-[var(--content-text)]">${t.costo}</span>
                  <span className="text-sm text-[var(--content-muted)] ml-1">MXN/equipo</span>
                </div>

                <ul className="space-y-1.5 text-xs text-[var(--content-muted)]">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${activo ? t.accentText : 'text-[var(--content-muted)]'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <p className="text-[10px] text-[var(--content-muted)] mt-4 italic">{t.recomendado}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Layout principal ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Columna izq: selector de equipos ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 bg-[var(--content-surface)] p-4 rounded-2xl border border-[var(--content-border)]">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--content-muted)]" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, serie, marca o inventario..."
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
              />
            </div>
            <div className="relative min-w-[160px]">
              <select
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
                className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--content-text)] appearance-none cursor-pointer focus:border-blue-500 outline-none"
              >
                <option value="">Todas las áreas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--content-muted)] pointer-events-none" />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--content-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soloSinPlaca}
                onChange={(e) => setSoloSinPlaca(e.target.checked)}
                className="rounded border-[var(--content-border)]"
              />
              Solo sin placa
            </label>
          </div>

          {/* Selector compacto */}
          <div className="bg-[var(--content-surface)] rounded-2xl border border-[var(--content-border)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--content-border)] flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-bold text-[var(--content-text)]">
                Equipos disponibles
                <span className="ml-2 text-xs font-normal text-[var(--content-muted)]">
                  ({equiposFiltrados.length} mostrados · {seleccionados.length} seleccionados)
                </span>
              </h3>
              <button
                onClick={toggleSeleccionarTodos}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                {equiposFiltrados.every((e) => seleccionados.includes(e.id)) && equiposFiltrados.length > 0
                  ? 'Deseleccionar visibles'
                  : 'Seleccionar todos visibles'}
              </button>
            </div>

            <div className="max-h-[480px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : equiposFiltrados.length === 0 ? (
                <div className="text-center py-12 text-[var(--content-muted)]">
                  <Tag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin equipos con esos filtros</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--content-border)]/40">
                  {equiposFiltrados.map((eq) => {
                    const sel = seleccionados.includes(eq.id);
                    return (
                      <button
                        key={eq.id}
                        onClick={() => toggleSeleccion(eq.id)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                          sel ? 'bg-blue-500/10' : 'hover:bg-[var(--content-bg)]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                          sel ? 'bg-blue-600 border-blue-600' : 'border-[var(--content-border)]'
                        }`}>
                          {sel && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${ESTADO_COLOR[eq.estado] || 'bg-slate-400'}`} />
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3">
                          <p className="text-sm font-semibold text-[var(--content-text)] truncate">{eq.nombre}</p>
                          <p className="text-xs font-mono text-[var(--content-muted)] truncate">{eq.serie}</p>
                          <p className="text-xs text-[var(--content-muted)] truncate">{eq.area || '—'}</p>
                        </div>
                        {eq.placa_instalada && (
                          <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            Con placa
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Columna der: preview + cotización ─── */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-gradient-to-br from-[var(--content-surface)] to-[var(--content-bg)] border border-[var(--content-border)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest text-[var(--content-muted)] flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Preview {tierActivo.label}
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-[var(--content-muted)] hover:text-[var(--content-text)]"
              >
                {showPreview ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showPreview && (
              <div className="flex items-center justify-center py-4">
                <PlacaPreview equipo={equipoPreview} tier={tier} />
              </div>
            )}
            <p className="text-[10px] text-[var(--content-muted)] text-center mt-3 italic">
              Render aproximado · El SVG final se vectoriza en backend
            </p>
          </div>

          {/* Cotización */}
          <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-[var(--content-muted)] flex items-center gap-2 mb-4">
              <Calculator className="h-3.5 w-3.5" />
              Cotización
            </h3>
            <div className="space-y-2.5 text-sm">
              <Row label={`${cotizacion.cantidad} × $${tierActivo.costo}`} value={`$${cotizacion.subtotal.toLocaleString('es-MX')}`} />
              <Row label="IVA (16%)" value={`$${cotizacion.iva.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`} />
              <div className="h-px bg-[var(--content-border)] my-2" />
              <Row label="Total MXN" value={`$${cotizacion.total.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`} bold large />
              <p className="text-[10px] text-[var(--content-muted)] text-right mt-1">
                Lead time: {TIER_PRESETS[tier]?.material?.includes('Poli') ? '3' : tier === 'estandar' ? '7' : '10'} días · Excluye envío
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={descargarZip}
            disabled={generando || seleccionados.length === 0}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all"
          >
            {generando ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generando ZIP...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Descargar ZIP para fabricante
              </>
            )}
          </button>

          {/* Workflow indicator */}
          <div className="bg-[var(--content-surface)]/60 border border-[var(--content-border)]/50 rounded-2xl p-4 space-y-2">
            <h3 className="text-[10px] uppercase tracking-widest text-[var(--content-muted)] mb-2">Siguiente paso</h3>
            <Step icon={<Download className="h-3.5 w-3.5" />} text="Descargas el ZIP con SVGs + manifest + cover letter" />
            <Step icon={<Mail className="h-3.5 w-3.5" />} text="Lo envías por email al fabricante" />
            <Step icon={<Factory className="h-3.5 w-3.5" />} text="Producción láser (lead time según tier)" />
            <Step icon={<Truck className="h-3.5 w-3.5" />} text="Recibes las placas en el hospital" />
            <Step icon={<Check className="h-3.5 w-3.5" />} text="Marcas en SIGAH como instaladas" />
          </div>

          <div className="flex items-start gap-2 text-[10px] text-[var(--content-muted)] bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Lista de proveedores aprobados en <code className="bg-[var(--content-bg)] px-1 rounded text-amber-400">docs/PROVEEDORES_PLACAS.md</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold = false, large = false }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${bold ? 'font-bold text-[var(--content-text)]' : 'text-[var(--content-muted)]'}`}>{label}</span>
      <span className={`${bold ? 'font-bold text-[var(--content-text)]' : 'text-[var(--content-text)] font-mono'} ${large ? 'text-2xl' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Step({ icon, text }) {
  return (
    <div className="flex items-start gap-2 text-xs text-[var(--content-muted)]">
      <span className="text-[var(--content-text)] mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
