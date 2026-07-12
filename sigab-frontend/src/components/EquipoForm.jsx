// ============================================================
// EquipoForm.jsx — Modal para crear o editar un equipo biomédico
// Soporta upload de PNG/JPG y se conecta al backend SIGAH
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { api, getMediaUrl } from '../api/sigah';
import { useToast } from './Toast';
import { TIPO_ADQ_OPTIONS } from '../utils/constants';

const TIPOS_EQUIPO = [
  'monitor', 'ventilador', 'arco_c', 'anestesia', 'incubadora',
  'desfibrilador', 'bomba_infusion', 'rayos_x', 'ultrasonido',
  'autoclave', 'laboratorio', 'electrocardiografo', 'otro',
];

const ESTADOS = [
  ['operativo', 'Operativo'],
  ['en_mantenimiento', 'En Mantenimiento'],
  ['fuera_servicio', 'Fuera de Servicio'],
  ['en_traslado', 'En Traslado'],
  ['baja', 'Baja'],
];

const CRITICIDADES = [
  ['alta', 'Alta'],
  ['media', 'Media'],
  ['baja', 'Baja'],
];

const CLASES_COFEPRIS = ['I', 'II', 'III'];

// Normaliza equipo.fotos (array, JSON string, CSV o URL única) a un array de URLs.
// Mismo criterio que EquipoDetail.jsx para que ambos lean la misma forma de dato.
function normalizarFotos(fotos, imagenUrl) {
  let arr = [];
  if (Array.isArray(fotos)) arr = fotos.filter(Boolean);
  else if (typeof fotos === 'string') {
    const s = fotos.trim();
    if (s && s !== '[]' && s !== 'null') {
      try {
        const parsed = JSON.parse(s);
        arr = Array.isArray(parsed) ? parsed.filter(Boolean) : [s];
      } catch {
        arr = s.split(',').map((x) => x.trim()).filter(Boolean);
      }
    }
  }
  return arr.length > 0 ? arr : (imagenUrl ? [imagenUrl] : []);
}

const VACIO = {
  serie: '',
  inventario: '',
  nombre: '',
  marca: '',
  modelo: '',
  ubicacion: '',
  piso: '',
  area: '',
  tipo_equipo: 'otro',
  clase_cofepris: 'II',
  estado: 'operativo',
  criticidad: 'media',
  zona_id: '',
  fecha_compra: '',
  fecha_proximo_mantenimiento: '',
  proveedor_servicio: '',
  numero_contrato_servicio: '',
  tipo_adquisicion: 'recurso_propio',
};

export default function EquipoForm({ equipo, onClose, onSaved }) {
  const esEdicion = Boolean(equipo?.id);
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(VACIO);
  const [zonas, setZonas] = useState([]);
  // Galería: fotos ya guardadas (edición) + fotos nuevas elegidas en este formulario.
  const [fotosExistentes, setFotosExistentes] = useState([]);
  const [fotosNuevas, setFotosNuevas] = useState([]); // [{ file, preview }]
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});

  // Cargar zonas
  useEffect(() => {
    api.getZonasCatalogo()
      .then((res) => setZonas(res.zonas || []))
      .catch(() => toast.warn('No se pudieron cargar las zonas del mapa'));
  }, []); // eslint-disable-line

  // Pre-llenar si es edición
  useEffect(() => {
    if (equipo) {
      setForm({
        ...VACIO,
        ...Object.fromEntries(
          Object.entries(equipo).map(([k, v]) => [k, v ?? ''])
        ),
        // Normalizar fechas a YYYY-MM-DD para los input[type=date]
        fecha_compra: equipo.fecha_compra ? equipo.fecha_compra.slice(0, 10) : '',
        fecha_proximo_mantenimiento: equipo.fecha_proximo_mantenimiento
          ? equipo.fecha_proximo_mantenimiento.slice(0, 10)
          : '',
      });
      setFotosExistentes(normalizarFotos(equipo.fotos, equipo.imagen_url));
    } else {
      setForm(VACIO);
      setFotosExistentes([]);
    }
    setFotosNuevas([]);
    setErrores({});
  }, [equipo]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errores[k]) setErrores((er) => ({ ...er, [k]: null }));
  };

  const handleArchivos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validos = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}": solo se permiten imágenes (PNG, JPG, WEBP)`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}": no puede superar 10 MB`);
        continue;
      }
      validos.push(file);
    }
    if (validos.length === 0) return;

    validos.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFotosNuevas((prev) => [...prev, { file, preview: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const quitarFotoNueva = (idx) => {
    setFotosNuevas((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalFotos = fotosExistentes.length + fotosNuevas.length;

  const validar = () => {
    const e = {};
    if (!form.nombre?.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.serie?.trim()) e.serie = 'El número de serie es obligatorio';
    if (!form.marca?.trim()) e.marca = 'La marca es obligatoria';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validar()) {
      toast.error('Revisa los campos marcados');
      return;
    }

    setGuardando(true);
    try {
      // P2-02 (defensa cliente): si el operador dejó 'ubicacion' vacío pero llenó
      // 'area' y/o 'piso', derivamos ubicacion en el cliente para evitar el round-trip
      // y un eventual 400 del backend (que sí lo cubre, pero queremos UX limpia).
      let formNormalizado = form;
      const ubicacionEnBlanco = !form.ubicacion || !String(form.ubicacion).trim();
      if (ubicacionEnBlanco && (form.area || form.piso)) {
        const partes = [form.area, form.piso].map((s) => (s || '').trim()).filter(Boolean);
        formNormalizado = { ...form, ubicacion: partes.join(' · ') };
      }

      // Limpiar payload: enviar null para campos opcionales vacíos,
      // pero conservar strings vacíos en campos requeridos para que
      // el backend pueda descartarlos sin violar NOT NULL constraints.
      const NOT_NULL_FIELDS = new Set([
        'nombre', 'serie', 'marca', 'modelo', 'estado',
        'criticidad', 'tipo_equipo', 'clase_cofepris', 'ubicacion',
      ]);
      const payload = Object.fromEntries(
        Object.entries(formNormalizado).map(([k, v]) => [
          k,
          v === '' ? (NOT_NULL_FIELDS.has(k) ? v : null) : v,
        ])
      );

      let equipoId;
      if (esEdicion) {
        await api.updateEquipo(equipo.id, payload);
        equipoId = equipo.id;
        toast.success('Equipo actualizado');
      } else {
        const res = await api.crearEquipo(payload);
        equipoId = res.id;
        toast.success(res.mensaje || 'Equipo creado');
      }

      // Subir fotos nuevas de la galería, si hay
      if (fotosNuevas.length > 0 && equipoId) {
        try {
          const res = await api.subirImagenesEquipo(equipoId, fotosNuevas.map((f) => f.file));
          if (!res.completas) {
            toast.warning(`Equipo guardado con ${res.fotos.length}/3 fotos — puedes completar la galería después ("fotos incompletas")`);
          } else {
            toast.success('Fotos guardadas');
          }
        } catch (err) {
          toast.error('Equipo guardado, pero falló la subida de fotos');
          console.error(err);
        }
      } else if (totalFotos < 3) {
        toast.warning('Equipo guardado sin fotos (mínimo recomendado: 3 — puedes agregarlas después)');
      }

      onSaved?.(equipoId);
      onClose?.();
    } catch (err) {
      const detalle = err.response?.data?.detail || err.message || 'Error desconocido';
      toast.error(`No se pudo guardar: ${detalle}`);
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--content-surface)] border border-[var(--content-border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--content-border)] sticky top-0 bg-[var(--content-surface)] rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-[var(--content-text)]">
              {esEdicion ? 'Editar Equipo' : 'Nuevo Equipo Biomédico'}
            </h2>
            <p className="text-[var(--content-muted)] text-xs mt-0.5">
              {esEdicion ? `Modificando ${equipo?.nombre}` : 'Registra un equipo en el inventario'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--content-muted)] hover:text-[var(--content-text)] p-1 rounded-lg hover:bg-[var(--content-border)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Galería de fotos del equipo */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-2">
              Fotos del equipo ({totalFotos})
            </h3>
            <p className="text-xs text-[var(--content-muted)] mb-2">
              Recomendado: (1) el equipo, (2) placa con N° de serie, (3) etiqueta naranja de inventario IMSS.
              La primera foto es la imagen principal (mapa/ficha).
            </p>
            {totalFotos < 3 && (
              <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3">
                ⚠ Menos de 3 fotos — se puede guardar igual, quedará marcado como "fotos incompletas".
              </div>
            )}
            <div className="flex flex-wrap gap-3 mb-3">
              {fotosExistentes.map((url, idx) => (
                <div key={`ex-${idx}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[var(--content-border)]">
                  <img src={getMediaUrl(url)} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">Principal</span>
                  )}
                </div>
              ))}
              {fotosNuevas.map((f, idx) => (
                <div key={`nu-${idx}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-emerald-500/50">
                  <img src={f.preview} alt={`nueva ${idx + 1}`} className="w-full h-full object-cover" />
                  {fotosExistentes.length === 0 && idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">Principal</span>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarFotoNueva(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 rounded-xl bg-[var(--content-bg)] border-2 border-dashed border-[var(--content-border)] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 flex-shrink-0">
                <svg className="w-6 h-6 text-[var(--content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-[10px] text-[var(--content-muted)] mt-1">Agregar</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleArchivos}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-[var(--content-muted)]">PNG, JPG o WEBP. Máximo 10 MB por foto.</p>
          </section>

          {/* Datos básicos */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-2">Datos básicos</h3>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nombre *" error={errores.nombre}>
                <input
                  value={form.nombre}
                  onChange={set('nombre')}
                  className={inputCls(errores.nombre)}
                  placeholder="Ej: Desfibrilador Bifásico"
                />
              </Campo>
              <Campo label="Inventario / ID interno">
                <input
                  value={form.inventario}
                  onChange={set('inventario')}
                  className={inputCls()}
                  placeholder="HGR1-7010"
                />
              </Campo>
              <Campo label="N° Serie *" error={errores.serie}>
                <input
                  value={form.serie}
                  onChange={set('serie')}
                  className={inputCls(errores.serie)}
                  placeholder="ZOL-URG-DEF-01"
                />
              </Campo>
              <Campo label="Marca *" error={errores.marca}>
                <input
                  value={form.marca}
                  onChange={set('marca')}
                  className={inputCls(errores.marca)}
                  placeholder="Zoll"
                />
              </Campo>
              <Campo label="Modelo">
                <input
                  value={form.modelo}
                  onChange={set('modelo')}
                  className={inputCls()}
                  placeholder="R Series"
                />
              </Campo>
              <Campo label="Tipo de equipo">
                <select value={form.tipo_equipo} onChange={set('tipo_equipo')} className={inputCls()}>
                  {TIPOS_EQUIPO.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </Campo>
            </div>
          </section>

          {/* Estado y criticidad */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-2">Estado y clasificación</h3>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="Estado">
                <select value={form.estado} onChange={set('estado')} className={inputCls()}>
                  {ESTADOS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Criticidad">
                <select value={form.criticidad} onChange={set('criticidad')} className={inputCls()}>
                  {CRITICIDADES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Clase COFEPRIS">
                <select value={form.clase_cofepris} onChange={set('clase_cofepris')} className={inputCls()}>
                  {CLASES_COFEPRIS.map((c) => (
                    <option key={c} value={c}>Clase {c}</option>
                  ))}
                </select>
              </Campo>
            </div>
          </section>

          {/* Ubicación */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-2">Ubicación</h3>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Área">
                <input
                  value={form.area}
                  onChange={set('area')}
                  className={inputCls()}
                  placeholder="Urgencias"
                />
              </Campo>
              <Campo label="Piso">
                <input
                  value={form.piso}
                  onChange={set('piso')}
                  className={inputCls()}
                  placeholder="1er Piso"
                />
              </Campo>
              <Campo label="Ubicación física">
                <input
                  value={form.ubicacion}
                  onChange={set('ubicacion')}
                  className={inputCls()}
                  placeholder="Sala 3, Cubículo A"
                />
              </Campo>
              <Campo label="Zona del mapa">
                <select value={form.zona_id} onChange={set('zona_id')} className={inputCls()}>
                  <option value="">— Sin asignar —</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre} {z.piso ? `(${z.piso})` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </section>

          {/* Mantenimiento */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--content-muted)] mb-2">Mantenimiento y contrato</h3>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo de adquisición">
                <select value={form.tipo_adquisicion} onChange={set('tipo_adquisicion')} className={inputCls()}>
                  {TIPO_ADQ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Fecha de compra">
                <input
                  type="date"
                  value={form.fecha_compra}
                  onChange={set('fecha_compra')}
                  className={inputCls()}
                />
              </Campo>
              <Campo label="Próximo mantenimiento">
                <input
                  type="date"
                  value={form.fecha_proximo_mantenimiento}
                  onChange={set('fecha_proximo_mantenimiento')}
                  className={inputCls()}
                />
              </Campo>
              <Campo label="Proveedor de servicio">
                <input
                  value={form.proveedor_servicio}
                  onChange={set('proveedor_servicio')}
                  className={inputCls()}
                  placeholder="Empresa de mantenimiento"
                />
              </Campo>
              <Campo label="N° Contrato de servicio">
                <input
                  value={form.numero_contrato_servicio}
                  onChange={set('numero_contrato_servicio')}
                  className={inputCls()}
                  placeholder="CT-2026-0123"
                />
              </Campo>
            </div>
          </section>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--content-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[var(--content-surface)] hover:bg-[var(--content-border)] text-[var(--content-text)] text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {guardando && (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(error) {
  return `w-full bg-[var(--content-bg)] border rounded-lg px-3 py-2 text-sm text-[var(--content-text)] placeholder-slate-600 focus:outline-none transition-colors ${
    error ? 'border-red-600 focus:border-red-500' : 'border-[var(--content-border)] focus:border-emerald-600'
  }`;
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label className="text-xs text-[var(--content-muted)] block mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
