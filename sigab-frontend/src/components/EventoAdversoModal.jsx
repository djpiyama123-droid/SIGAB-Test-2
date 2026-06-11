import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import toast from '../lib/toast';

const TIPOS_EVENTO = [
  { value: 'muerte', label: 'Muerte' },
  { value: 'lesion_grave', label: 'Lesion grave' },
  { value: 'deterioro_temporal', label: 'Deterioro temporal' },
  { value: 'riesgo_potencial', label: 'Riesgo potencial' },
  { value: 'falla_funcional', label: 'Falla funcional' },
];

const SEVERIDADES = [
  { value: 'critica', label: 'Critica', color: 'border-red-500 bg-red-600/20 text-red-300' },
  { value: 'grave', label: 'Grave', color: 'border-orange-500 bg-orange-500/20 text-orange-300' },
  { value: 'moderada', label: 'Moderada', color: 'border-yellow-500 bg-yellow-500/20 text-yellow-300' },
  { value: 'leve', label: 'Leve', color: 'border-[var(--content-border)] bg-slate-500/20 text-[var(--content-muted)]' },
];

const ESTADO_POST = [
  { value: 'operativo', label: 'Operativo' },
  { value: 'retirado', label: 'Retirado' },
  { value: 'cuarentena', label: 'Cuarentena' },
  { value: 'destruido', label: 'Destruido' },
  { value: 'en_investigacion', label: 'En investigacion' },
];

export default function EventoAdversoModal({ onClose, onCreated }) {
  const [paso, setPaso] = useState(1);
  const [equipos, setEquipos] = useState([]);
  const [buscaEquipo, setBuscaEquipo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    equipo_id: null,
    equipo_selected: null,
    dispositivo_lote: '',
    dispositivo_registro_sanitario: '',
    fecha_evento: new Date().toISOString().slice(0, 16),
    lugar_evento: '',
    tipo_evento: '',
    severidad: '',
    descripcion_evento: '',
    consecuencia_clinica: '',
    accion_correctiva: '',
    paciente_sexo: 'no_aplica',
    paciente_edad: '',
    dispositivo_estado_post: 'en_investigacion',
  });

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.getEquipos({ limit: 500 });
        setEquipos(res.equipos || []);
      } catch (err) {
        console.error(err);
      }
    };
    cargar();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectEquipo = (eq) => {
    setForm((f) => ({
      ...f,
      equipo_id: eq.id,
      equipo_selected: eq,
    }));
    setBuscaEquipo('');
  };

  const equiposFiltrados = buscaEquipo.length >= 2
    ? equipos.filter((e) =>
        e.nombre?.toLowerCase().includes(buscaEquipo.toLowerCase()) ||
        e.serie?.toLowerCase().includes(buscaEquipo.toLowerCase()) ||
        e.inventario?.toLowerCase().includes(buscaEquipo.toLowerCase())
      ).slice(0, 8)
    : [];

  const validarPaso = () => {
    if (paso === 1) return !!form.equipo_id;
    if (paso === 2) return form.tipo_evento && form.severidad && form.descripcion_evento;
    return true;
  };

  const handleCrear = async () => {
    setGuardando(true);
    const tid = toast.loading('Creando reporte de evento adverso...');
    try {
      const res = await api.crearEvento({
        equipo_id: form.equipo_id,
        dispositivo_lote: form.dispositivo_lote || null,
        dispositivo_registro_sanitario: form.dispositivo_registro_sanitario || null,
        fecha_evento: form.fecha_evento,
        lugar_evento: form.lugar_evento || null,
        tipo_evento: form.tipo_evento,
        severidad: form.severidad,
        descripcion_evento: form.descripcion_evento,
        consecuencia_clinica: form.consecuencia_clinica || null,
        accion_correctiva: form.accion_correctiva || null,
        paciente_sexo: form.paciente_sexo,
        paciente_edad: form.paciente_edad ? parseInt(form.paciente_edad) : null,
        dispositivo_estado_post: form.dispositivo_estado_post || null,
      });
      toast.success(`Evento registrado: ${res.numero_reporte}`, { id: tid });
      onCreated?.(res.numero_reporte);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al crear evento', { id: tid });
    } finally {
      setGuardando(false);
    }
  };

  const eq = form.equipo_selected;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[var(--content-surface)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[var(--content-border)]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--content-border)] sticky top-0 bg-[var(--content-surface)] z-10">
          <div>
            <h2 className="text-lg font-bold text-[var(--content-text)]">Reportar Evento Adverso</h2>
            <p className="text-xs text-[var(--content-muted)]">NOM-240-SSA1-2012 — Paso {paso} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--content-muted)] hover:text-white bg-[var(--content-surface)] rounded-lg">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-4 pt-4">
          {[1, 2, 3].map((p) => (
            <div key={p} className={`h-1.5 flex-1 rounded-full transition-colors ${
              p <= paso ? 'bg-red-500' : 'bg-[var(--content-surface)]'
            }`} />
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* ── PASO 1: Dispositivo ── */}
          {paso === 1 && (
            <>
              <h3 className="text-sm font-semibold text-red-400">1. Identificacion del dispositivo</h3>

              {/* Buscador de equipos */}
              {!eq ? (
                <div className="space-y-2">
                  <label className="text-xs text-[var(--content-muted)] block">Buscar equipo (nombre, serie o inventario)</label>
                  <input
                    type="text"
                    value={buscaEquipo}
                    onChange={(e) => setBuscaEquipo(e.target.value)}
                    placeholder="Ej: CARESCAPE, B650, serie..."
                    className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                  {equiposFiltrados.length > 0 && (
                    <div className="bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg max-h-48 overflow-y-auto">
                      {equiposFiltrados.map((e) => (
                        <button key={e.id} onClick={() => selectEquipo(e)}
                          className="w-full text-left px-3 py-2 hover:bg-[var(--content-border)] text-sm text-[var(--content-text)] border-b border-[var(--content-border)] last:border-0">
                          <span className="font-medium">{e.nombre}</span>
                          <span className="text-[var(--content-muted)] ml-2 text-xs">
                            {e.marca} {e.modelo} — Serie: {e.serie || 'N/A'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {buscaEquipo.length >= 2 && equiposFiltrados.length === 0 && (
                    <p className="text-xs text-[var(--content-muted)] text-center py-2">Sin resultados</p>
                  )}
                </div>
              ) : (
                <div className="bg-[var(--content-bg)]/50 border border-[var(--content-border)] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[var(--content-text)] font-medium">{eq.nombre}</p>
                      <p className="text-xs text-[var(--content-muted)]">{eq.marca} {eq.modelo}</p>
                    </div>
                    <button onClick={() => setForm((f) => ({ ...f, equipo_id: null, equipo_selected: null }))}
                      className="text-xs text-red-400 hover:text-red-300">
                      Cambiar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--content-muted)]">
                    <span>Serie: <strong className="text-[var(--content-muted)]">{eq.serie || 'N/A'}</strong></span>
                    <span>Area: <strong className="text-[var(--content-muted)]">{eq.area || 'N/A'}</strong></span>
                    <span>Piso: <strong className="text-[var(--content-muted)]">{eq.piso || 'N/A'}</strong></span>
                    <span>Inventario: <strong className="text-[var(--content-muted)]">{eq.inventario || 'N/A'}</strong></span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--content-border)]">
                    <div>
                      <label className="text-xs text-[var(--content-muted)] block mb-1">Lote (opcional)</label>
                      <input value={form.dispositivo_lote} onChange={set('dispositivo_lote')}
                        className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--content-muted)] block mb-1">Registro sanitario (opcional)</label>
                      <input value={form.dispositivo_registro_sanitario} onChange={set('dispositivo_registro_sanitario')}
                        className="w-full bg-[var(--content-surface)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PASO 2: Evento ── */}
          {paso === 2 && (
            <>
              <h3 className="text-sm font-semibold text-red-400">2. Datos del evento</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--content-muted)] block mb-1">Fecha y hora del evento *</label>
                  <input type="datetime-local" value={form.fecha_evento} onChange={set('fecha_evento')}
                    className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="text-xs text-[var(--content-muted)] block mb-1">Lugar del evento</label>
                  <input value={form.lugar_evento} onChange={set('lugar_evento')} placeholder="Ej: Piso 3, Sala de Cirugia"
                    className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--content-muted)] block mb-1">Tipo de evento *</label>
                <select value={form.tipo_evento} onChange={set('tipo_evento')}
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500">
                  <option value="">— Seleccionar —</option>
                  {TIPOS_EVENTO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--content-muted)] block mb-2">Severidad *</label>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERIDADES.map((s) => (
                    <button key={s.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, severidad: s.value }))}
                      className={`border rounded-lg py-2 text-xs font-bold text-center transition-all ${
                        form.severidad === s.value
                          ? s.color + ' ring-2 ring-offset-1 ring-offset-slate-800'
                          : 'border-[var(--content-border)] bg-[var(--content-surface)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--content-muted)] block mb-1">Descripcion del evento *</label>
                <textarea rows={3} value={form.descripcion_evento} onChange={set('descripcion_evento')}
                  placeholder="Describa que sucedio con el dispositivo medico..."
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="text-xs text-[var(--content-muted)] block mb-1">Consecuencia clinica</label>
                <textarea rows={2} value={form.consecuencia_clinica} onChange={set('consecuencia_clinica')}
                  placeholder="Describa las consecuencias clinicas si aplica..."
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
              </div>

              <div>
                <label className="text-xs text-[var(--content-muted)] block mb-1">Accion correctiva inmediata</label>
                <textarea rows={2} value={form.accion_correctiva} onChange={set('accion_correctiva')}
                  placeholder="Que accion se tomo inmediatamente..."
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-2 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
              </div>
            </>
          )}

          {/* ── PASO 3: Paciente y cierre ── */}
          {paso === 3 && (
            <>
              <h3 className="text-sm font-semibold text-red-400">3. Paciente y estado del dispositivo</h3>

              <div className="bg-[var(--content-bg)]/50 border border-[var(--content-border)] rounded-lg p-4 space-y-1">
                <p className="text-xs text-yellow-400 font-semibold">
                  Datos anonimizados (LFPDPPP)
                </p>
                <p className="text-xs text-[var(--content-muted)]">
                  Solo se registra sexo y edad del paciente. No se almacenan datos personales identificables.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--content-muted)] block mb-1">Sexo del paciente</label>
                  <select value={form.paciente_sexo} onChange={set('paciente_sexo')}
                    className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500">
                    <option value="no_aplica">No aplica</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--content-muted)] block mb-1">Edad del paciente</label>
                  <input type="number" min="0" max="120" value={form.paciente_edad} onChange={set('paciente_edad')}
                    placeholder="Opcional"
                    className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500" />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--content-muted)] block mb-1">Estado del dispositivo post-evento</label>
                <select value={form.dispositivo_estado_post} onChange={set('dispositivo_estado_post')}
                  className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--content-text)] focus:outline-none focus:border-red-500">
                  {ESTADO_POST.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Resumen antes de crear */}
              <div className="bg-[var(--content-bg)]/50 border border-red-500/30 rounded-lg p-4 space-y-2">
                <p className="text-xs text-red-400 font-semibold">Resumen del reporte</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-[var(--content-muted)]">
                  <span>Dispositivo: <strong className="text-white">{eq?.nombre}</strong></span>
                  <span>Serie: <strong className="text-[var(--content-muted)]">{eq?.serie || 'N/A'}</strong></span>
                  <span>Tipo: <strong className="text-white">
                    {TIPOS_EVENTO.find((t) => t.value === form.tipo_evento)?.label}
                  </strong></span>
                  <span>Severidad: <strong className={
                    form.severidad === 'critica' ? 'text-red-400' :
                    form.severidad === 'grave' ? 'text-orange-400' : 'text-yellow-400'
                  }>{form.severidad?.toUpperCase()}</strong></span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con navegacion */}
        <div className="flex justify-between items-center p-4 border-t border-[var(--content-border)]">
          <button
            onClick={() => paso > 1 ? setPaso(paso - 1) : onClose()}
            className="px-4 py-2 bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-white text-sm rounded-lg transition-colors"
          >
            {paso === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {paso < 3 ? (
            <button
              onClick={() => setPaso(paso + 1)}
              disabled={!validarPaso()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleCrear}
              disabled={guardando}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {guardando ? 'Creando...' : 'Crear reporte'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
