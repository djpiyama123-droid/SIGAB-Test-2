// ============================================================
// EquipoForm.jsx — Modal para crear o editar un equipo biomédico
// Soporta upload de PNG/JPG y se conecta al backend SIGAB
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/sigab';
import { useToast } from './Toast';

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
};

export default function EquipoForm({ equipo, onClose, onSaved }) {
  const esEdicion = Boolean(equipo?.id);
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(VACIO);
  const [zonas, setZonas] = useState([]);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [previewImagen, setPreviewImagen] = useState(null);
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
      setPreviewImagen(equipo.imagen_url || null);
    } else {
      setForm(VACIO);
      setPreviewImagen(null);
    }
    setArchivoImagen(null);
    setErrores({});
  }, [equipo]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errores[k]) setErrores((er) => ({ ...er, [k]: null }));
  };

  const handleArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10 MB');
      return;
    }

    setArchivoImagen(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImagen(ev.target.result);
    reader.readAsDataURL(file);
  };

  const quitarImagen = () => {
    setArchivoImagen(null);
    setPreviewImagen(esEdicion ? null : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      // Limpiar payload: enviar null donde sea string vacío
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
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

      // Subir imagen si hay archivo nuevo
      if (archivoImagen && equipoId) {
        try {
          await api.subirImagenEquipo(equipoId, archivoImagen);
          toast.success('Imagen guardada');
        } catch (err) {
          toast.error('Equipo guardado, pero falló la subida de imagen');
          console.error(err);
        }
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
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800 rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {esEdicion ? 'Editar Equipo' : 'Nuevo Equipo Biomédico'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {esEdicion ? `Modificando ${equipo?.nombre}` : 'Registra un equipo en el inventario'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Imagen del equipo */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Imagen del equipo</h3>
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                {previewImagen ? (
                  <img src={previewImagen} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleArchivo}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600 file:cursor-pointer"
                />
                <p className="text-xs text-slate-500">
                  PNG, JPG o WEBP. Máximo 10 MB. La imagen se mostrará en el mapa y la ficha técnica.
                </p>
                {previewImagen && (
                  <button
                    type="button"
                    onClick={quitarImagen}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Datos básicos */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Datos básicos</h3>
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
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Estado y clasificación</h3>
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
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Ubicación</h3>
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
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Mantenimiento y contrato</h3>
            <div className="grid grid-cols-2 gap-3">
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
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
  return `w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors ${
    error ? 'border-red-600 focus:border-red-500' : 'border-slate-700 focus:border-emerald-600'
  }`;
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
