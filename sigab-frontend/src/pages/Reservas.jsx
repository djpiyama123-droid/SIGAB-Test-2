import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { useAuth } from '../context/AuthContext';
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
  Play
} from 'lucide-react';
import toast from '../lib/toast';

// ─── Modal: Nueva Reserva de Equipo ──────────────────────────────────────────
function NuevaReservaModal({ onClose, onSaved }) {
  const { user } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
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
      await api.crearReserva({
        equipo_id: Number(form.equipo_id),
        area_reserva: form.area_reserva,
        piso_reserva: form.piso_reserva || null,
        solicitante_id: user?.id || null,
        fecha_inicio: form.fecha_inicio.replace('T', ' ') + ':00',
        fecha_fin: form.fecha_fin ? form.fecha_fin.replace('T', ' ') + ':00' : null,
        motivo: form.motivo || '',
      });
      toast.success('Reserva creada exitosamente');
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
  const filteredEquipos = equipos.filter(eq => 
    eq.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.serie.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.modelo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--content-border)] bg-[var(--content-bg)]/40">
          <h2 className="text-lg font-bold text-[var(--content-text)] flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            Nueva Reserva de Equipo
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
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50 text-sm"
            >
              {saving ? 'Creando Reserva...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const data = await api.getReservas();
      setReservas(data.reservas ?? data ?? []);
    } catch {
      toast.error('Error al cargar la bitácora de reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await api.cambiarEstadoReserva(id, { estado: nuevoEstado });
      toast.success(`Reserva marcada como ${nuevoEstado} exitosamente`);
      cargarReservas();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar el estado de la reserva');
    }
  };

  // Filtrado local por estado
  const filteredReservas = filterEstado 
    ? reservas.filter(r => r.estado === filterEstado)
    : reservas;

  // Estadísticas KPI
  const stats = {
    total: reservas.length,
    activas: reservas.filter(r => r.estado === 'activa').length,
    pendientes: reservas.filter(r => r.estado === 'pendiente').length,
    completadas: reservas.filter(r => r.estado === 'completada').length,
  };

  // Helper para renderizar los badges de estado
  const getBadgeStyle = (estado) => {
    switch (estado) {
      case 'activa':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
      case 'pendiente':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      case 'completada':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'cancelada':
        return 'bg-[var(--content-bg)] border-[var(--content-border)] text-[var(--content-muted)]';
      default:
        return 'bg-[var(--content-bg)] border border-[var(--content-border)] text-[var(--content-muted)]';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-blue-500" />
            Reservas de Equipos
          </h1>
          <p className="text-[var(--content-muted)] mt-1">
            Programación y control de uso compartido de equipos médicos críticos entre servicios hospitalarios.
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

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-[var(--content-surface)] border border-[var(--content-border)] p-5 rounded-2xl">
          <p className="text-[var(--content-muted)] text-xs font-semibold uppercase tracking-wider">Total Reservado</p>
          <p className="text-3xl font-bold text-[var(--content-text)] mt-2">{stats.total}</p>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/30 p-5 rounded-2xl">
          <p className="text-emerald-600 text-xs font-semibold uppercase tracking-wider">Activas Actualmente</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.activas}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/30 p-5 rounded-2xl">
          <p className="text-amber-600 text-xs font-semibold uppercase tracking-wider font-medium">Pendientes</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pendientes}</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/30 p-5 rounded-2xl">
          <p className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Completadas</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.completadas}</p>
        </div>
      </div>

      {/* Controles de Filtro */}
      <div className="flex gap-2 bg-[var(--content-surface)] p-1.5 rounded-xl border border-[var(--content-border)] max-w-md">
        <button
          onClick={() => setFilterEstado('')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${!filterEstado ? 'bg-[var(--content-bg)] text-[var(--content-text)] border border-[var(--content-border)]' : 'text-[var(--content-muted)] hover:text-[var(--content-text)]'}`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilterEstado('pendiente')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${filterEstado === 'pendiente' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'text-[var(--content-muted)] hover:text-[var(--content-text)]'}`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilterEstado('activa')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${filterEstado === 'activa' ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' : 'text-[var(--content-muted)] hover:text-[var(--content-text)]'}`}
        >
          Activas
        </button>
        <button
          onClick={() => setFilterEstado('completada')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${filterEstado === 'completada' ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30' : 'text-[var(--content-muted)] hover:text-[var(--content-text)]'}`}
        >
          Listas
        </button>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--content-bg)]/80 border-b border-[var(--content-border)]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Equipo / Serie</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Área Destino</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Solicitante</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Fecha Programada</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--content-border)] bg-[var(--content-surface)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--content-muted)] text-sm">
                    <Activity className="h-6 w-6 animate-pulse text-blue-500 mx-auto mb-2" />
                    Cargando bitácora de reservas biomédicas...
                  </td>
                </tr>
              ) : filteredReservas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center bg-[var(--content-bg)]/40 rounded-2xl">
                    <CalendarClock className="h-10 w-10 text-[var(--content-muted)] mx-auto mb-3" />
                    <p className="text-[var(--content-muted)] font-medium text-sm">Sin reservas registradas para este filtro.</p>
                  </td>
                </tr>
              ) : (
                filteredReservas.map((res) => {
                  const ini = new Date(res.fecha_inicio).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
                  const fin = res.fecha_fin 
                    ? new Date(res.fecha_fin).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Indefinida';

                  return (
                    <tr key={res.id} className="hover:bg-[var(--content-bg)]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[var(--content-text)] group-hover:text-blue-600 transition-colors text-sm">
                          {res.equipo_nombre}
                        </p>
                        <p className="text-[10px] text-[var(--content-muted)] uppercase font-semibold">{res.equipo_serie}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--content-text)] font-medium">
                          <MapPin className="h-3.5 w-3.5 text-[var(--content-muted)] flex-shrink-0" />
                          <span>{res.area_reserva}</span>
                        </div>
                        {res.piso_reserva && (
                          <span className="text-[10px] text-[var(--content-muted)] uppercase pl-5 block">
                            {res.piso_reserva}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--content-muted)]">
                          <User className="h-3.5 w-3.5 text-[var(--content-muted)] flex-shrink-0" />
                          <span>{res.solicitante_nombre || 'Asignado General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1 text-[var(--content-text)] font-semibold">
                            <Clock className="h-3 w-3 text-emerald-500" />
                            <span>Ini: {ini}</span>
                          </div>
                          {res.fecha_fin && (
                            <div className="flex items-center gap-1 text-[var(--content-muted)]">
                              <Clock className="h-3 w-3 text-[var(--content-muted)]" />
                              <span>Fin: {fin}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getBadgeStyle(res.estado)}`}>
                          {res.estado.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {res.estado === 'pendiente' && (
                            <button
                              onClick={() => handleCambiarEstado(res.id, 'activa')}
                              title="Iniciar Reserva"
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-emerald-600 transition-all hover:scale-105 active:scale-95"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {res.estado === 'activa' && (
                            <button
                              onClick={() => handleCambiarEstado(res.id, 'completada')}
                              title="Completar Reserva"
                              className="p-1.5 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-blue-600 transition-all hover:scale-105 active:scale-95"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {(res.estado === 'pendiente' || res.estado === 'activa') && (
                            <button
                              onClick={() => handleCambiarEstado(res.id, 'cancelada')}
                              title="Cancelar Reserva"
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-red-400 transition-all hover:scale-105 active:scale-95"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {res.motivo && (
                            <button
                              onClick={() => toast(res.motivo, { icon: '📝', duration: 4000 })}
                              title="Ver Motivo"
                              className="p-1.5 bg-[var(--content-bg)] hover:bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg text-[var(--content-muted)] transition-all"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación */}
      {modalNueva && (
        <NuevaReservaModal
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); cargarReservas(); }}
        />
      )}
    </div>
  );
}
