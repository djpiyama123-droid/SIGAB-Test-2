/**
 * OrdenCasillasForm — Sistema CENEVAL para Área de Conservación
 * Formulario tipo hoja de respuestas: dominio único, casillas binarias, resolución rápida.
 * Cubre: Equipos Médicos, Polivalentes y A/C / Infraestructura.
 *
 * Props:
 *   ordenId       — number|null  (null = crear nueva OS después)
 *   equipoData    — {nombre, serie, modelo, area, piso}  (prefill desde QR scan)
 *   onGuardado    — callback(casillas) llamado tras guardar con éxito
 *   onCerrar      — callback para cerrar el modal
 */
import { useState, useCallback } from 'react';
import { api } from '../api/sigab';
import toast from 'react-hot-toast';

// ─── Paleta SIGAB ────────────────────────────────────────────────────────────
const C = {
  cobalt: '#1B3A5C',
  teal: '#0D9488',
  bg: '#0f172a',
  panel: '#1e293b',
  border: '#334155',
  muted: '#64748b',
  text: '#e2e8f0',
};

// ─── Datos de las casillas ───────────────────────────────────────────────────

const DOMINIOS = [
  { value: 'medico',     label: '⚕ Equipo Médico' },
  { value: 'polivalente',label: '🛏 Polivalente' },
  { value: 'ac_infra',   label: '❄ A/C / Infraestructura' },
];

const TIPOS_SERVICIO = [
  { value: 'correctivo',  label: 'Correctivo' },
  { value: 'preventivo',  label: 'Preventivo' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'baja',        label: 'Baja' },
  { value: 'prestamo',    label: 'Préstamo' },
  { value: 'inspeccion',  label: 'Inspección' },
];

const RESOLUCIONES = [
  { value: 'sitio',      label: '✅ Resuelto en sitio' },
  { value: 'refaccion',  label: '🔩 Requiere refacción' },
  { value: 'taller',     label: '🏭 Enviar a taller' },
  { value: 'externo',    label: '🤝 Escalar a externo' },
  { value: 'baja',       label: '🗑 Declarar baja' },
];

const ESTADOS_FINALES = [
  { value: 'operativo',      label: '🟢 Operativo',                badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
  { value: 'operativo_obs',  label: '🟡 Operativo c/observaciones', badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  { value: 'fuera_servicio', label: '🔴 Fuera de servicio',         badge: 'bg-red-900/50 text-red-300 border-red-700' },
  { value: 'en_taller',      label: '🔵 En taller',                 badge: 'bg-blue-900/50 text-blue-300 border-blue-700' },
];

const GRUPOS_FALLA = [
  {
    titulo: '⚡ Eléctrico',
    campos: [
      { key: 'falla_no_enciende', label: 'No enciende' },
      { key: 'falla_corto',       label: 'Corto circuito' },
      { key: 'falla_cable',       label: 'Cable dañado' },
      { key: 'falla_fusible',     label: 'Fusible' },
      { key: 'falla_bateria',     label: 'Batería' },
      { key: 'falla_ups',         label: 'UPS / No-break' },
    ],
  },
  {
    titulo: '⚙ Mecánico',
    campos: [
      { key: 'falla_ruido',     label: 'Ruido anormal' },
      { key: 'falla_vibracion', label: 'Vibración' },
      { key: 'falla_atasco',    label: 'Atasco / trabo' },
      { key: 'falla_fuga',      label: 'Fuga' },
      { key: 'falla_rotura',    label: 'Rotura estructural' },
    ],
  },
  {
    titulo: '💨 Neumático / Hidráulico',
    campos: [
      { key: 'falla_presion_baja', label: 'Presión baja' },
      { key: 'falla_compresor',    label: 'Compresor' },
      { key: 'falla_valvula',      label: 'Válvula' },
      { key: 'falla_manguera',     label: 'Manguera' },
    ],
  },
  {
    titulo: '🖥 Electrónico / Software',
    campos: [
      { key: 'falla_display',        label: 'Display / pantalla' },
      { key: 'falla_sensor',         label: 'Sensor' },
      { key: 'falla_alarma_falsa',   label: 'Alarma falsa' },
      { key: 'falla_error_pantalla', label: 'Error en pantalla' },
      { key: 'falla_firmware',       label: 'Firmware / software' },
    ],
  },
  {
    titulo: '🧹 Consumibles',
    campos: [
      { key: 'falla_filtro',      label: 'Filtro' },
      { key: 'falla_empaque',     label: 'Empaque / junta' },
      { key: 'falla_lampara',     label: 'Lámpara' },
      { key: 'falla_toner_papel', label: 'Tóner / papel' },
    ],
  },
  {
    titulo: '❄ A/C específico',
    campos: [
      { key: 'falla_gas_ref',     label: 'Gas refrigerante' },
      { key: 'falla_evaporador',  label: 'Evaporador' },
      { key: 'falla_condensador', label: 'Condensador' },
      { key: 'falla_termostato',  label: 'Termostato' },
    ],
  },
];

// ─── Estado inicial del formulario ───────────────────────────────────────────

const estadoInicial = () => ({
  dominio: 'medico',
  tipo_servicio: 'correctivo',
  // Todas las fallas en 0
  falla_no_enciende: 0, falla_corto: 0, falla_cable: 0, falla_fusible: 0,
  falla_bateria: 0, falla_ups: 0, falla_ruido: 0, falla_vibracion: 0,
  falla_atasco: 0, falla_fuga: 0, falla_rotura: 0, falla_presion_baja: 0,
  falla_compresor: 0, falla_valvula: 0, falla_manguera: 0, falla_display: 0,
  falla_sensor: 0, falla_alarma_falsa: 0, falla_error_pantalla: 0,
  falla_firmware: 0, falla_filtro: 0, falla_empaque: 0, falla_lampara: 0,
  falla_toner_papel: 0, falla_gas_ref: 0, falla_evaporador: 0,
  falla_condensador: 0, falla_termostato: 0,
  resolucion: 'sitio',
  estado_final: 'operativo',
  observaciones_breves: '',
  refacciones_solicitadas: '',
});

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function RadioGroup({ opciones, valor, onChange, cols = 3 }) {
  return (
    <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {opciones.map((op) => (
        <label
          key={op.value}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm
            ${valor === op.value
              ? 'border-teal-500 bg-teal-900/30 text-teal-200'
              : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-400'}`}
        >
          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
            ${valor === op.value ? 'border-teal-400' : 'border-slate-500'}`}>
            {valor === op.value && <span className="w-2 h-2 rounded-full bg-teal-400" />}
          </span>
          <input
            type="radio"
            className="sr-only"
            value={op.value}
            checked={valor === op.value}
            onChange={() => onChange(op.value)}
          />
          <span>{op.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGrid({ campos, form, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {campos.map(({ key, label }) => {
        const marcado = form[key] === 1;
        return (
          <label
            key={key}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm
              ${marcado
                ? 'border-orange-500 bg-orange-900/30 text-orange-200'
                : 'border-slate-600 bg-slate-800/40 text-slate-400 hover:border-slate-400'}`}
          >
            <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center
              ${marcado ? 'border-orange-400 bg-orange-500/30' : 'border-slate-500'}`}>
              {marcado && <span className="text-orange-300 text-xs leading-none">✓</span>}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={marcado}
              onChange={() => onChange(key, marcado ? 0 : 1)}
            />
            <span className="leading-tight">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OrdenCasillasForm({ ordenId, equipoData = {}, onGuardado, onCerrar }) {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);
  const [fotoOCR, setFotoOCR] = useState(null);
  const [procesandoOCR, setProcesandoOCR] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState({ 0: true, 1: true });

  const setRadio = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setCheck = useCallback((campo, valor) => setForm((f) => ({ ...f, [campo]: valor })), []);

  const fallasSeleccionadas = GRUPOS_FALLA.flatMap((g) => g.campos)
    .filter(({ key }) => form[key] === 1).length;

  // ── Guardar ─────────────────────────────────────────────────────────────
  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!ordenId) {
      setError('⚠ Debes seleccionar o crear una Orden de Servicio primero');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        ...form,
        observaciones_breves: form.observaciones_breves || null,
        refacciones_solicitadas: form.refacciones_solicitadas || null,
      };
      const res = await api.post(`/casillas/${ordenId}`, payload);
      setExito(true);
      onGuardado?.(res.data);
      setTimeout(() => setExito(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar casillas');
    } finally {
      setGuardando(false);
    }
  };

  // ── OCR desde foto ────────────────────────────────────────────────────────
  const handleOCR = async () => {
    if (!fotoOCR || !ordenId) return;
    setProcesandoOCR(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('foto', fotoOCR);
      const res = await api.postForm(`/casillas/ocr/${ordenId}`, fd);
      // Aplicar resultado del OCR al formulario
      setForm((f) => ({ ...f, ...res.data }));
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (err) {
      setError('OCR falló: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcesandoOCR(false);
    }
  };

  // ── Imprimir hoja física ────────────────────────────────────────────────────
  const handleImprimir = () => window.print();

  const toggleGrupo = (i) => setGruposAbiertos((g) => ({ ...g, [i]: !g[i] }));

  return (
    <>
      {/* ── CSS print ── */}
      <style>{`
        @media print {
          body > *:not(#casillas-print) { display: none !important; }
          #casillas-print { display: block !important; }
        }
        @media screen { #casillas-print { display: none; } }
      `}</style>

      {/* ── Modal overlay ── */}
      <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl my-4">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10 rounded-t-2xl">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Orden de Servicio — Casillas CENEVAL</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {ordenId ? `OS #${ordenId}` : 'Sin OS asignada'} ·{' '}
                {equipoData.nombre && <span className="text-teal-400">{equipoData.nombre}</span>}{' '}
                {equipoData.serie && <span className="text-slate-500">· {equipoData.serie}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleImprimir}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-300 transition-colors"
              >
                🖨 Imprimir hoja
              </button>
              <button
                type="button"
                onClick={onCerrar}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400 transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>

          <form onSubmit={handleGuardar} className="p-6 space-y-6">

            {/* ── Bloque A: Dominio ─── */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
                A — Dominio del activo
              </h3>
              <RadioGroup opciones={DOMINIOS} valor={form.dominio} onChange={setRadio('dominio')} cols={3} />
            </section>

            {/* ── Bloque B: Tipo servicio ─── */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
                B — Tipo de servicio
              </h3>
              <RadioGroup opciones={TIPOS_SERVICIO} valor={form.tipo_servicio} onChange={setRadio('tipo_servicio')} cols={3} />
            </section>

            {/* ── Bloque C: Fallas ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                  C — Naturaleza de la falla / trabajo
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  fallasSeleccionadas > 0
                    ? 'border-orange-600 bg-orange-900/30 text-orange-300'
                    : 'border-slate-600 text-slate-500'
                }`}>
                  {fallasSeleccionadas} marcada{fallasSeleccionadas !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-3">
                {GRUPOS_FALLA.map((grupo, i) => (
                  <div key={i} className="border border-slate-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleGrupo(i)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-300">{grupo.titulo}</span>
                      <span className="text-slate-500 text-xs">
                        {grupo.campos.filter(({ key }) => form[key] === 1).length} / {grupo.campos.length} ·{' '}
                        {gruposAbiertos[i] ? '▲' : '▼'}
                      </span>
                    </button>
                    {gruposAbiertos[i] && (
                      <div className="px-4 py-3 bg-slate-900/40">
                        <CheckboxGrid campos={grupo.campos} form={form} onChange={setCheck} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Bloques D y E lado a lado ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
                  D — Resolución
                </h3>
                <RadioGroup opciones={RESOLUCIONES} valor={form.resolucion} onChange={setRadio('resolucion')} cols={2} />
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
                  E — Estado final del equipo
                </h3>
                <RadioGroup opciones={ESTADOS_FINALES} valor={form.estado_final} onChange={setRadio('estado_final')} cols={2} />
              </section>
            </div>

            {/* ── Bloque F: Texto libre ─── */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
                F — Texto libre (opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Observaciones breves</label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
                    rows={3}
                    maxLength={140}
                    placeholder="Máx 140 caracteres..."
                    value={form.observaciones_breves}
                    onChange={(e) => setForm((f) => ({ ...f, observaciones_breves: e.target.value }))}
                  />
                  <p className="text-xs text-slate-600 text-right">{form.observaciones_breves.length}/140</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Refacciones solicitadas</label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
                    rows={3}
                    maxLength={255}
                    placeholder="SKU o nombre genérico..."
                    value={form.refacciones_solicitadas}
                    onChange={(e) => setForm((f) => ({ ...f, refacciones_solicitadas: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            {/* ── OCR desde foto ─── */}
            <section className="border border-dashed border-slate-600 rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                📷 OCR automático desde foto del formato físico
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600"
                  onChange={(e) => setFotoOCR(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  disabled={!fotoOCR || procesandoOCR || !ordenId}
                  onClick={handleOCR}
                  className="px-4 py-1.5 text-xs rounded-lg bg-teal-700/50 border border-teal-600 text-teal-300 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {procesandoOCR ? '⏳ Analizando...' : '🔍 Leer casillas'}
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Sube la foto y el sistema usará Gemini Vision para detectar casillas marcadas automáticamente.
              </p>
            </section>

            {/* ── Mensajes ─── */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {exito && (
              <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg px-4 py-3 text-sm text-emerald-300">
                ✅ Casillas guardadas correctamente · Dashboard actualizado en tiempo real
              </div>
            )}

            {/* ── Botones principales ─── */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={onCerrar}
                className="px-5 py-2 text-sm rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || !ordenId}
                className="px-6 py-2 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-900/30"
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar y cerrar orden'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* ── Hoja imprimible A4 (oculta en pantalla, visible al imprimir) ─────── */}
      <div id="casillas-print" className="hidden">
        <HojaFisicaCeneval form={form} ordenId={ordenId} equipoData={equipoData} />
      </div>
    </>
  );
}

// ── Hoja A4 imprimible ────────────────────────────────────────────────────────

function HojaFisicaCeneval({ form, ordenId, equipoData }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', padding: '20px' }}>
      {/* Encabezado IMSS */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>INSTITUTO MEXICANO DEL SEGURO SOCIAL</div>
          <div>Hospital General Regional No. 1 — IMSS Tijuana</div>
          <div style={{ fontWeight: 'bold' }}>ORDEN DE SERVICIO — ÁREA DE CONSERVACIÓN (CENEVAL)</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px' }}>
          <div>No. Orden: <strong>{ordenId || '________'}</strong></div>
          <div>Fecha: <strong>{new Date().toLocaleDateString('es-MX')}</strong></div>
          <div>Sistema SIGAB v1.0</div>
        </div>
      </div>

      {/* Datos del equipo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '10px', border: '1px solid #999', padding: '6px' }}>
        <div>Equipo: <strong>{equipoData.nombre || '________________________'}</strong></div>
        <div>No. Serie: <strong>{equipoData.serie || '______________'}</strong></div>
        <div>Área: <strong>{equipoData.area || '________'} P{equipoData.piso || '__'}</strong></div>
      </div>

      {/* Bloque A */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', backgroundColor: '#1B3A5C', color: '#fff', padding: '2px 6px' }}>
          A — DOMINIO DEL ACTIVO (marcar una)
        </div>
        <div style={{ display: 'flex', gap: '20px', padding: '4px 6px' }}>
          {DOMINIOS.map((d) => (
            <span key={d.value}>
              {form.dominio === d.value ? '●' : '○'} {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bloque B */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', backgroundColor: '#1B3A5C', color: '#fff', padding: '2px 6px' }}>
          B — TIPO DE SERVICIO (marcar una)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '4px 6px' }}>
          {TIPOS_SERVICIO.map((t) => (
            <span key={t.value}>{form.tipo_servicio === t.value ? '●' : '○'} {t.label}</span>
          ))}
        </div>
      </div>

      {/* Bloque C */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', backgroundColor: '#1B3A5C', color: '#fff', padding: '2px 6px' }}>
          C — NATURALEZA DE LA FALLA / TRABAJO (marcar todas las que aplican)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '4px 6px' }}>
          {GRUPOS_FALLA.map((g) => (
            <div key={g.titulo} style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#1B3A5C' }}>{g.titulo}</div>
              {g.campos.map(({ key, label }) => (
                <div key={key} style={{ marginLeft: '8px' }}>
                  {form[key] === 1 ? '■' : '□'} {label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bloques D y E */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: 'bold', backgroundColor: '#1B3A5C', color: '#fff', padding: '2px 6px' }}>
            D — RESOLUCIÓN
          </div>
          <div style={{ padding: '4px 6px' }}>
            {RESOLUCIONES.map((r) => (
              <div key={r.value}>{form.resolucion === r.value ? '●' : '○'} {r.label}</div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 'bold', backgroundColor: '#1B3A5C', color: '#fff', padding: '2px 6px' }}>
            E — ESTADO FINAL DEL EQUIPO
          </div>
          <div style={{ padding: '4px 6px' }}>
            {ESTADOS_FINALES.map((ef) => (
              <div key={ef.value}>{form.estado_final === ef.value ? '●' : '○'} {ef.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Bloque F */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', backgroundColor: '#1B3A5C', color: '#fff', padding: '2px 6px' }}>
          F — TEXTO LIBRE
        </div>
        <div style={{ padding: '4px 6px' }}>
          <div>Observaciones: {form.observaciones_breves || '_'.repeat(80)}</div>
          <div style={{ marginTop: '4px' }}>Refacciones: {form.refacciones_solicitadas || '_'.repeat(80)}</div>
        </div>
      </div>

      {/* Firmas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '24px' }}>
        {['Técnico responsable', 'Jefe de Conservación / Vo.Bo.'].map((label) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>{label}</div>
            <div style={{ fontSize: '9px', color: '#666' }}>Nombre / Firma / Fecha</div>
          </div>
        ))}
      </div>
    </div>
  );
}
