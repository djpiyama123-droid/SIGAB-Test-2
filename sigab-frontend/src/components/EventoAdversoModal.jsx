import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { SigabButton } from './v2/SigabUI';
import toast from 'react-hot-toast';

const TIPOS_EVENTO = [
  { value: 'muerte', label: 'Muerte' },
  { value: 'lesion_grave', label: 'Lesion grave' },
  { value: 'deterioro_temporal', label: 'Deterioro temporal' },
  { value: 'riesgo_potencial', label: 'Riesgo potencial' },
  { value: 'falla_funcional', label: 'Falla funcional' },
];

const SEVERIDADES = [
  { value: 'critica', label: 'Crítica', color: 'border-rose-300 bg-rose-100 text-rose-800' },
  { value: 'grave', label: 'Grave', color: 'border-orange-300 bg-orange-100 text-orange-800' },
  { value: 'moderada', label: 'Moderada', color: 'border-amber-300 bg-amber-100 text-amber-800' },
  { value: 'leve', label: 'Leve', color: 'border-emerald-300 bg-emerald-100 text-emerald-800' },
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
    <div className="sigab-v2 fixed inset-0 z-50 bg-cobalt-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-[var(--sigab-radius-lg)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-cobalt-100 shadow-[var(--sigab-shadow-lg)] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-cobalt-100 sticky top-0 bg-white z-10 rounded-t-[var(--sigab-radius-lg)]">
          <div>
            <h2 className="text-lg font-bold text-cobalt-900 font-sigabHead">Reportar Evento Adverso</h2>
            <p className="text-xs text-sigab-text-muted mt-1 font-sigabBody">NOM-240-SSA1-2012 — Paso {paso} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-sigab-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-[var(--sigab-radius-sm)]">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-5">
          {[1, 2, 3].map((p) => (
            <div key={p} className={`h-1.5 flex-1 rounded-full transition-colors ${
              p <= paso ? 'bg-rose-600' : 'bg-sigab-surface'
            }`} />
          ))}
        </div>

        <div className="p-5 space-y-5 font-sigabBody">
          {/* ── PASO 1: Dispositivo ── */}
          {paso === 1 && (
            <>
              <h3 className="text-sm font-bold text-rose-600 font-sigabHead">1. Identificación del dispositivo</h3>

              {/* Buscador de equipos */}
              {!eq ? (
                <div className="space-y-2">
                  <label className="text-xs text-sigab-text-muted block font-semibold">Buscar equipo (nombre, serie o inventario)</label>
                  <input
                    type="text"
                    value={buscaEquipo}
                    onChange={(e) => setBuscaEquipo(e.target.value)}
                    placeholder="Ej: CARESCAPE, B650, serie..."
                    className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-2 text-sm text-sigab-text placeholder:text-sigab-text-muted focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    autoFocus
                  />
                  {equiposFiltrados.length > 0 && (
                    <div className="bg-white border border-sigab-border rounded-[var(--sigab-radius-md)] shadow-sm max-h-48 overflow-y-auto">
                      {equiposFiltrados.map((e) => (
                        <button key={e.id} onClick={() => selectEquipo(e)}
                          className="w-full text-left px-3 py-2 hover:bg-sigab-bg text-sm text-sigab-text border-b border-sigab-border last:border-0 transition-colors">
                          <span className="font-semibold text-cobalt-900">{e.nombre}</span>
                          <span className="text-sigab-text-muted ml-2 text-xs">
                            {e.marca} {e.modelo} — Serie: {e.serie || 'N/A'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {buscaEquipo.length >= 2 && equiposFiltrados.length === 0 && (
                    <p className="text-xs text-sigab-text-muted text-center py-2">Sin resultados</p>
                  )}
                </div>
              ) : (
                <div className="bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-lg)] p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-cobalt-900 font-bold">{eq.nombre}</p>
                      <p className="text-xs text-sigab-text-muted font-semibold">{eq.marca} {eq.modelo}</p>
                    </div>
                    <button onClick={() => setForm((f) => ({ ...f, equipo_id: null, equipo_selected: null }))}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline">
                      Cambiar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-sigab-text-muted">
                    <span>Serie: <strong className="text-sigab-text">{eq.serie || 'N/A'}</strong></span>
                    <span>Área: <strong className="text-sigab-text">{eq.area || 'N/A'}</strong></span>
                    <span>Piso: <strong className="text-sigab-text">{eq.piso || 'N/A'}</strong></span>
                    <span>Inventario: <strong className="text-sigab-text">{eq.inventario || 'N/A'}</strong></span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-sigab-border">
                    <div>
                      <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Lote (opcional)</label>
                      <input value={form.dispositivo_lote} onChange={set('dispositivo_lote')}
                        className="w-full bg-white border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Registro sanitario (opcional)</label>
                      <input value={form.dispositivo_registro_sanitario} onChange={set('dispositivo_registro_sanitario')}
                        className="w-full bg-white border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PASO 2: Evento ── */}
          {paso === 2 && (
            <>
              <h3 className="text-sm font-bold text-rose-600 font-sigabHead">2. Datos del evento</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Fecha y hora del evento *</label>
                  <input type="datetime-local" value={form.fecha_evento} onChange={set('fecha_evento')}
                    className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                </div>
                <div>
                  <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Lugar del evento</label>
                  <input value={form.lugar_evento} onChange={set('lugar_evento')} placeholder="Ej: Piso 3, Sala de Cirugia"
                    className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Tipo de evento *</label>
                <select value={form.tipo_evento} onChange={set('tipo_evento')}
                  className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50">
                  <option value="">— Seleccionar —</option>
                  {TIPOS_EVENTO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-sigab-text-muted block mb-2 font-semibold">Severidad *</label>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERIDADES.map((s) => (
                    <button key={s.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, severidad: s.value }))}
                      className={`border rounded-[var(--sigab-radius-md)] py-2 text-xs font-bold text-center transition-all ${
                        form.severidad === s.value
                          ? s.color + ' ring-2 ring-offset-1 ring-offset-white shadow-sm'
                          : 'border-sigab-border bg-sigab-surface text-sigab-text-muted hover:bg-sigab-bg hover:text-sigab-text'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Descripción del evento *</label>
                <textarea rows={3} value={form.descripcion_evento} onChange={set('descripcion_evento')}
                  placeholder="Describa que sucedio con el dispositivo medico..."
                  className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-2 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>

              <div>
                <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Consecuencia clinica</label>
                <textarea rows={2} value={form.consecuencia_clinica} onChange={set('consecuencia_clinica')}
                  placeholder="Describa las consecuencias clinicas si aplica..."
                  className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-2 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>

              <div>
                <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Accion correctiva inmediata</label>
                <textarea rows={2} value={form.accion_correctiva} onChange={set('accion_correctiva')}
                  placeholder="Que accion se tomo inmediatamente..."
                  className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-2 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
              </div>
            </>
          )}

          {/* ── PASO 3: Paciente y cierre ── */}
          {paso === 3 && (
            <>
              <h3 className="text-sm font-bold text-rose-600 font-sigabHead">3. Paciente y estado del dispositivo</h3>

              <div className="bg-amber-50 border border-amber-200 rounded-[var(--sigab-radius-md)] p-4 space-y-1 shadow-sm">
                <p className="text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <span>ℹ️</span> Datos anonimizados (LFPDPPP)
                </p>
                <p className="text-xs text-amber-700">
                  Solo se registra sexo y edad del paciente. No se almacenan datos personales identificables.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Sexo del paciente</label>
                  <select value={form.paciente_sexo} onChange={set('paciente_sexo')}
                    className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50">
                    <option value="no_aplica">No aplica</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Edad del paciente</label>
                  <input type="number" min="0" max="120" value={form.paciente_edad} onChange={set('paciente_edad')}
                    placeholder="Opcional"
                    className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-sigab-text-muted block mb-1 font-semibold">Estado del dispositivo post-evento</label>
                <select value={form.dispositivo_estado_post} onChange={set('dispositivo_estado_post')}
                  className="w-full bg-sigab-surface-alt border border-sigab-border rounded-[var(--sigab-radius-md)] px-3 py-1.5 text-sm text-sigab-text focus:outline-none focus:ring-2 focus:ring-rose-500/50">
                  {ESTADO_POST.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Resumen antes de crear */}
              <div className="bg-rose-50 border border-rose-200 shadow-sm rounded-[var(--sigab-radius-md)] p-4 space-y-2 mt-2">
                <p className="text-xs text-rose-800 font-bold">Resumen del reporte</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-rose-700/80">
                  <span>Dispositivo: <strong className="text-rose-900 font-semibold">{eq?.nombre}</strong></span>
                  <span>Serie: <strong className="text-rose-900 font-semibold">{eq?.serie || 'N/A'}</strong></span>
                  <span>Tipo: <strong className="text-rose-900 font-semibold">
                    {TIPOS_EVENTO.find((t) => t.value === form.tipo_evento)?.label}
                  </strong></span>
                  <span>Severidad: <strong className={`font-semibold ${
                    form.severidad === 'critica' ? 'text-rose-600' :
                    form.severidad === 'grave' ? 'text-orange-600' : 'text-amber-600'
                  }`}>{form.severidad?.toUpperCase()}</strong></span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con navegacion */}
        <div className="flex justify-between items-center p-5 border-t border-cobalt-100 bg-sigab-surface-alt rounded-b-[var(--sigab-radius-lg)]">
          <SigabButton
            variant="secondary"
            onClick={() => paso > 1 ? setPaso(paso - 1) : onClose()}
          >
            {paso === 1 ? 'Cancelar' : 'Anterior'}
          </SigabButton>

          {paso < 3 ? (
            <SigabButton
              variant="danger"
              onClick={() => setPaso(paso + 1)}
              disabled={!validarPaso()}
            >
              Siguiente
            </SigabButton>
          ) : (
            <SigabButton
              variant="danger"
              onClick={handleCrear}
              loading={guardando}
            >
              Crear reporte
            </SigabButton>
          )}
        </div>
      </div>
    </div>
  );
}
