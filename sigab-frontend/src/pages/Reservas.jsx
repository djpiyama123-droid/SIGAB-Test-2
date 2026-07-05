import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { useAuth } from '../context/AuthContext';
import { normalizar } from '../utils/texto';
import {
  CalendarClock,
  Plus,
  Search,
  MapPin,
  User,
  Clock,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Ban,
  Activity,
  Play,
  Flame,
  CalendarRange,
  TrendingUp,
  Pencil,
  Trash2
} from 'lucide-react';
import toast from '../lib/toast';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ymd, etiquetaCorta, agruparPorDia, statsReservas, serieDiaria, reservasDelDia } from '../utils/fechas';
import { generarReservasMock } from '../utils/reservasMock';

// Cuenta animada de 0 → target (easeOutCubic). Respeta prefers-reduced-motion.
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setVal(target); return; }
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function toDatetimeLocal(s) {
  return s ? String(s).replace(' ', 'T').slice(0, 16) : '';
}

// ─── Modal: Nueva / Editar Reserva de Equipo ─────────────────────────────────
function NuevaReservaModal({ onClose, onSaved, reserva }) {
  const { user } = useAuth();
  const editando = !!reserva;
  const [equipos, setEquipos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(editando ? {
    equipo_id: String(reserva.equipo_id ?? ''),
    area_reserva: reserva.area_reserva ?? '',
    piso_reserva: reserva.piso_reserva ?? '',
    fecha_inicio: toDatetimeLocal(reserva.fecha_inicio),
    fecha_fin: toDatetimeLocal(reserva.fecha_fin),
    motivo: reserva.motivo ?? '',
  } : {
    equipo_id: '',
    area_reserva: '',
    piso_reserva: '',
    fecha_inicio: new Date().toISOString().slice(0, 16), // datetime-local format
    fecha_fin: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16), // default +2 hours
    motivo: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Cargar equipos disponibles para reservar
    api.getEquipos({ limit: 200 })
      .then(data => {
        // Solo permitir equipos en estado operativo, traslado o mantenimiento
        const list = data.equipos ?? data ?? [];
        setEquipos(list.filter(eq => eq.estado !== 'baja'));
      })
      .catch(() => toast.error('Error al cargar equipos del inventario'));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipo_id) return toast.error('Selecciona un equipo biomédico');
    if (!form.area_reserva.trim()) return toast.error('Ingresa el área de destino');
    if (!form.fecha_inicio) return toast.error('Selecciona la fecha/hora de inicio');

    setSaving(true);
    try {
      const payload = {
        equipo_id: Number(form.equipo_id),
        area_reserva: form.area_reserva,
        piso_reserva: form.piso_reserva || null,
        fecha_inicio: form.fecha_inicio.replace('T', ' ') + ':00',
        fecha_fin: form.fecha_fin ? form.fecha_fin.replace('T', ' ') + ':00' : null,
        motivo: form.motivo || '',
      };
      if (editando) {
        await api.editarReserva(reserva.id, payload);
        toast.success('Reserva actualizada');
      } else {
        await api.crearReserva({ ...payload, solicitante_id: user?.id || null });
        toast.success('Reserva creada exitosamente');
      }
      onSaved();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Conflicto: El equipo ya se encuentra reservado en ese horario');
      } else {
        toast.error(err.response?.data?.detail || 'Error al guardar la reserva');
      }
    } finally {
      setSaving(false);
    }
  };

  // Filtrar equipos por búsqueda de nombre o número de serie
  const searchQueryNorm = normalizar(searchQuery);
  const filteredEquipos = equipos.filter(eq =>
    normalizar(eq.nombre).includes(searchQueryNorm) ||
    normalizar(eq.serie).includes(searchQueryNorm) ||
    normalizar(eq.modelo).includes(searchQueryNorm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden anim-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--content-border)] bg-[var(--content-bg)]/40">
          <h2 className="text-lg font-bold text-[var(--content-text)] flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            {editando ? 'Editar Reserva' : 'Nueva Reserva de Equipo'}
          </h2>
          <button onClick={onClose} className="text-[var(--content-muted)] hover:text-[var(--content-text)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selector de Equipo */}
          <div>
            <label className="text-xs text-[var(--content-muted)] font-medium uppercase mb-1.5 block">Equipo Biomédico *</label>
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--content-muted)]" />
              <input
                type="text"
                placeholder="Buscar por nombre, serie o modelo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:outline-none focus:border-blue-500/80 transition-colors"
              />
            </div>
            <select
              required
              value={form.equipo_id}
              onChange={e => set('equipo_id', e.target.value)}
              className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-4 py-2.5 text-[var(--content-text)] focus:outline-none focus:border-blue-500 transition-colors text-sm"
            >
              <option value="">— Seleccionar equipo ({filteredEquipos.length}) —</option>
              {filteredEquipos.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} [{eq.serie}] — {eq.marca} {eq.modelo} ({eq.estado})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Ubicación Destino */}
            <div>
              <label className="text-xs text-[var(--content-muted)] font-medium uppercase mb-1.5 block">Área Destino *</label>
              <input
                required
                value={form.area_reserva}
                onChange={e => set('area_reserva', e.target.value)}
                className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Ej. Quirófano 3, UCIN"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] font-medium uppercase mb-1.5 block">Piso / Nivel</label>
              <input
                value={form.piso_reserva}
                onChange={e => set('piso_reserva', e.target.value)}
                className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Ej. 1er Piso, Sótano"
              />
            </div>

            {/* Fechas */}
            <div>
              <label className="text-xs text-[var(--content-muted)] font-medium uppercase mb-1.5 block">Fecha / Hora Inicio *</label>
              <input
                type="datetime-local"
                required
                value={form.fecha_inicio}
                onChange={e => set('fecha_inicio', e.target.value)}
                className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--content-muted)] font-medium uppercase mb-1.5 block">Fecha / Hora Fin</label>
              <input
                type="datetime-local"
                value={form.fecha_fin}
                onChange={e => set('fecha_fin', e.target.value)}
                className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs text-[var(--content-muted)] font-medium uppercase mb-1.5 block">Motivo de Reserva</label>
            <textarea
              value={form.motivo}
              onChange={e => set('motivo', e.target.value)}
              rows={3}
              className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-xl px-4 py-2 text-sm text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="Indica el procedimiento quirúrgico o clínico, estudio o traslado de paciente para el cual se requiere el equipo..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--content-border)] text-[var(--content-muted)] hover:bg-[var(--content-bg)] transition-all text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50 text-sm active:scale-95"
            >
              {saving ? (editando ? 'Guardando...' : 'Creando Reserva...') : (editando ? 'Guardar cambios' : 'Confirmar Reserva')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Verde IMSS; para volver al rojo/naranja estilo MiniMax, cambia este array.
const NIVEL_COLORES = ['var(--content-bg)', '#bbf7d0', '#4ade80', '#16a34a', '#15803d'];
const NOMBRE_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DOW = ['', 'Lun', '', 'Mié', '', 'Vie', ''];

function horaCorta(value) {
  const d = value && new Date(String(value).replace(' ', 'T'));
  if (!d || isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Heatmap de actividad (estilo GitHub · grilla CSS · 0 deps) ───────────────
function ActividadHeatmap({ porDia, onDiaClick, semanas = 26 }) {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - (semanas * 7 - 1));
  inicio.setDate(inicio.getDate() - inicio.getDay()); // retrocede al domingo

  const columnas = [];
  const etiquetasMes = [];
  const cursor = new Date(inicio);
  let max = 1;
  let mesPrev = -1;
  for (let w = 0; w < semanas; w++) {
    const semana = [];
    for (let d = 0; d < 7; d++) {
      const key = ymd(cursor);
      const count = porDia[key] || 0;
      if (count > max) max = count;
      semana.push({ key, count, futuro: cursor > hoy });
      cursor.setDate(cursor.getDate() + 1);
    }
    const mes = new Date(`${semana[0].key}T00:00:00`).getMonth();
    etiquetasMes.push(mes !== mesPrev ? NOMBRE_MES[mes] : '');
    mesPrev = mes;
    columnas.push(semana);
  }
  const nivel = (c) => (c <= 0 ? 0 : c / max > 0.75 ? 4 : c / max > 0.5 ? 3 : c / max > 0.25 ? 2 : 1);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-max">
        <div className="flex gap-1 pl-9">
          {etiquetasMes.map((m, w) => (
            <div key={w} className="w-3.5 text-[9px] text-[var(--content-muted)]">{m}</div>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 pr-1.5 w-8">
            {DOW.map((l, i) => (
              <div key={i} className="h-3.5 text-[9px] text-[var(--content-muted)] leading-[14px] text-right">{l}</div>
            ))}
          </div>
          {columnas.map((semana, w) => (
            <div key={w} className="flex flex-col gap-1">
              {semana.map((celda) => (
                <button
                  key={celda.key}
                  type="button"
                  disabled={celda.futuro || celda.count === 0}
                  onClick={() => onDiaClick(celda.key)}
                  title={`${celda.key}: ${celda.count} reserva${celda.count !== 1 ? 's' : ''}`}
                  className={`anim-cell-pop w-3.5 h-3.5 rounded-sm transition-transform ${celda.futuro ? 'opacity-25' : celda.count > 0 ? 'hover:scale-[1.35] cursor-pointer ring-1 ring-black/5' : 'cursor-default'}`}
                  style={{ backgroundColor: NIVEL_COLORES[nivel(celda.count)], animationDelay: `${w * 14}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 justify-end pt-1 text-[10px] text-[var(--content-muted)]">
          <span>Menos</span>
          {NIVEL_COLORES.map((c, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-sm inline-block" style={{ backgroundColor: c }} />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: reservas de un día ────────────────────────────────────────────────
function DiaReservasModal({ dia, reservas, onClose, onNueva, onEditar, onEliminar }) {
  const [confirmId, setConfirmId] = useState(null);
  const lista = reservasDelDia(reservas, dia);
  const [y, m, d] = dia.split('-');
  const fechaLabel = `${Number(d)} ${NOMBRE_MES[Number(m) - 1]} ${y}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 anim-fade-in" onClick={onClose}>
      <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden anim-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--content-border)] bg-[var(--content-bg)]/40">
          <h2 className="text-lg font-bold text-[var(--content-text)] flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-500" />
            {fechaLabel}
            <span className="text-xs text-[var(--content-muted)] font-normal">({lista.length})</span>
          </h2>
          <button onClick={onClose} className="text-[var(--content-muted)] hover:text-[var(--content-text)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {lista.length === 0 ? (
            <p className="text-sm text-[var(--content-muted)] text-center py-8">Sin reservas este día.</p>
          ) : (
            lista.map((r, idx) => (
              <div key={r.id} className="anim-fade-up bg-[var(--content-bg)]/50 border border-[var(--content-border)] rounded-xl p-3" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[var(--content-text)] truncate">{r.equipo_nombre}</p>
                    <p className="text-[10px] text-[var(--content-muted)] uppercase">{r.equipo_serie}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--content-border)] text-[var(--content-muted)] flex-shrink-0">
                    {String(r.estado || '').toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[var(--content-muted)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {horaCorta(r.fecha_inicio)}{r.fecha_fin ? `–${horaCorta(r.fecha_fin)}` : ''}
                  </span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.area_reserva}</span>
                  {r.solicitante_nombre && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.solicitante_nombre}</span>
                  )}
                </div>
                {r.motivo && <p className="text-xs text-[var(--content-muted)] mt-1.5 italic">{r.motivo}</p>}

                {/* Acciones: editar / borrar (con confirmación inline) */}
                <div className="flex justify-end gap-1.5 mt-2">
                  {confirmId === r.id ? (
                    <div className="flex items-center gap-1.5 anim-fade-in">
                      <span className="text-[11px] text-[var(--content-muted)]">¿Borrar?</span>
                      <button
                        onClick={() => { setConfirmId(null); onEliminar(r.id); if (lista.length === 1) onClose(); }}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 transition-all active:scale-95"
                      >
                        Sí, borrar
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-[var(--content-border)] text-[var(--content-muted)] hover:bg-[var(--content-bg)] transition-all"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onEditar(r)}
                        title="Editar reserva"
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 transition-all hover:scale-105 active:scale-95"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmId(r.id)}
                        title="Eliminar reserva"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 transition-all hover:scale-105 active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t border-[var(--content-border)] flex justify-end">
          <button onClick={onNueva} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95">
            <Plus className="h-4 w-4" /> Nueva reserva
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, valor, label, delay = 0 }) {
  const animado = useCountUp(valor);
  return (
    <div className="anim-fade-up bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 text-[var(--content-muted)]">{icon}</div>
      <p className="text-3xl font-bold text-[var(--content-text)] mt-2 tabular-nums">{animado}</p>
      <p className="text-[var(--content-muted)] text-sm mt-1">{label}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usandoMock, setUsandoMock] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [reservaEditar, setReservaEditar] = useState(null);
  const [diaSel, setDiaSel] = useState(null);

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const data = await api.getReservas();
      const lista = data.reservas ?? data ?? [];
      if (lista.length === 0) {
        // Sin reservas sembradas: datos de muestra para tunear el dashboard.
        setReservas(generarReservasMock());
        setUsandoMock(true);
      } else {
        setReservas(lista);
        setUsandoMock(false);
      }
    } catch {
      // Backend no disponible (frontend-first): caemos a datos de muestra.
      setReservas(generarReservasMock());
      setUsandoMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarReservas(); }, []);

  const handleEliminar = async (id) => {
    try {
      await api.eliminarReserva(id);
      toast.success('Reserva eliminada');
      cargarReservas();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar la reserva');
    }
  };

  const cerrarModal = () => { setModalNueva(false); setReservaEditar(null); };

  const porDia = agruparPorDia(reservas);
  const stats = statsReservas(reservas);
  const serie = serieDiaria(reservas, 30).map((p) => ({ ...p, label: etiquetaCorta(p.fecha) }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-emerald-500" />
            Reservas de Equipos
          </h1>
          <p className="text-[var(--content-muted)] mt-1">
            Actividad de uso compartido de equipos biomédicos entre servicios.
            {usandoMock && (
              <span className="ml-2 text-[11px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                datos de muestra
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg active:scale-95 text-sm self-start"
        >
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[var(--content-muted)] text-sm">
          <Activity className="h-6 w-6 animate-pulse text-emerald-500 mx-auto mb-2" />
          Cargando actividad de reservas...
        </div>
      ) : (
        <>
          {/* Line chart — reservas por día */}
          <div className="anim-fade-up bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--content-text)] mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Reservas por día · últimos 30 días
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={serie} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-reservas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--content-muted)' }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--content-surface)', border: '1px solid var(--content-border)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'var(--content-text)' }}
                  formatter={(v) => [`${v} reserva${v !== 1 ? 's' : ''}`, '']}
                />
                <Area type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} fill="url(#grad-reservas)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap de actividad */}
          <div className="anim-fade-up bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl p-5" style={{ animationDelay: '60ms' }}>
            <h3 className="text-sm font-semibold text-[var(--content-text)] mb-4">Mapa de actividad</h3>
            <ActividadHeatmap porDia={porDia} onDiaClick={setDiaSel} />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<CalendarRange className="h-5 w-5" />} valor={stats.total} label="Reservas totales" delay={0} />
            <StatCard icon={<Flame className="h-5 w-5" />} valor={stats.diaPico} label="Día pico · máx por día" delay={80} />
            <StatCard icon={<Activity className="h-5 w-5" />} valor={stats.diasActivos} label="Días con reservas" delay={160} />
          </div>
        </>
      )}

      {/* Modal de creación / edición */}
      {(modalNueva || reservaEditar) && (
        <NuevaReservaModal
          reserva={reservaEditar}
          onClose={cerrarModal}
          onSaved={() => { cerrarModal(); cargarReservas(); }}
        />
      )}

      {/* Modal de día */}
      {diaSel && (
        <DiaReservasModal
          dia={diaSel}
          reservas={reservas}
          onClose={() => setDiaSel(null)}
          onNueva={() => { setDiaSel(null); setModalNueva(true); }}
          onEditar={(r) => { setDiaSel(null); setReservaEditar(r); }}
          onEliminar={handleEliminar}
        />
      )}
    </div>
  );
}
