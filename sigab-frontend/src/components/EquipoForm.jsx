// ============================================================
// EquipoForm.jsx — Modal para crear o editar un equipo biomédico
// Soporta upload de PNG/JPG y se conecta al backend SIGAH
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/sigah';
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
  // P3-Bug3: soporte para múltiples fotos. archivosNuevos es la lista (File[]) de
  // imágenes a subir; previewsNuevos son los data-URL equivalentes para mostrar.
  // La primera entrada (idx 0) se considera la "principal" → se usa en mapa/ficha.
  const [archivosNuevos, setArchivosNuevos] = useState([]);
  const [previewsNuevos, setPreviewsNuevos] = useState([]);
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
    } else {
      setForm(VACIO);
    }
    setArchivosNuevos([]);
    setPreviewsNuevos([]);
    setErrores({});
  }, [equipo]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errores[k]) setErrores((er) => ({ ...er, [k]: null }));
  };

  // P3-Bug3: handler multi-archivo. Acepta varios PNG/JPG/WEBP, hasta 10 MB c/u.
  // Convierte cada uno a data-URL para preview. La primera entrada de la lista
  // resultante se considera la "principal" (mapa/ficha).
  const MAX_FOTOS = 8;
  const MAX_BYTES  = 10 * 1024 * 1024;

  const handleArchivos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validos = [];
    const rechazados = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        rechazados.push(`${f.name}: no es imagen`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        rechazados.push(`${f.name}: > 10 MB`);
        continue;
      }
      validos.push(f);
    }

    if (rechazados.length > 0) {
      toast.warn(`Ignoradas: ${rechazados.join(' · ')}`);
    }

    const espacioLibre = MAX_FOTOS - archivosNuevos.length;
    if (validos.length > espacioLibre) {
      toast.warn(`Máximo ${MAX_FOTOS} fotos. Se tomaron las primeras ${espacioLibre}.`);
      validos.splice(espacioLibre);
    }
    if (validos.length === 0) return;

    const nuevosArchivos = [...archivosNuevos, ...validos];
    setArchivosNuevos(nuevosArchivos);

    // Generar previews (data-URL) para los nuevos. Se hace en orden.
    validos.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewsNuevos((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(f);
    });
  };

  const quitarFotoNueva = (idx) => {
    setArchivosNuevos((prev) => prev.filter((_, i) => i !== idx));
    setPreviewsNuevos((prev) => prev.filter((_, i) => i !== idx));
  };

  // P3-Bug3: helper para contar el total de fotos que tendrá el equipo al guardar.
  // En edición = imagen_url (1) + JSON.parse(fotos).length + archivosNuevos.length.
  // En alta    = archivosNuevos.length (aún no existen guardadas).
  const fotosExistentes = (() => {
    if (!esEdicion) return [];
    const arr = [];
    if (equipo?.imagen_url) arr.push(equipo.imagen_url);
    if (equipo?.fotos) {
      try { arr.push(...JSON.parse(equipo.fotos).filter(Boolean)); }
      catch { /* JSON inválido → ignorar */ }
    }
    return arr;
  })();
  const totalFotos = fotosExistentes.length + archivosNuevos.length;
  const fotosIncompletas = totalFotos < 3;

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

      // P3-Bug3: subir todas las fotos nuevas en orden. La primera (idx 0) se considera
      // "principal" → se usa en mapa/ficha. Subida secuencial para no saturar el backend
      // y para mantener el orden esperado por el contrato de `imagen_url` + `fotos[]`.
      // TODO(Claude-Code): cuando exista endpoint multi-upload / soporte de flag `principal`
      // en el endpoint existente, reemplazar este loop por una sola llamada.
      // Handoff documentado en COORDINACION_SIGAB.md §6.
      if (archivosNuevos.length > 0 && equipoId) {
        let subidas = 0;
        let fallidas = 0;
        for (let i = 0; i < archivosNuevos.length; i++) {
          try {
            await api.subirImagenEquipo(equipoId, archivosNuevos[i]);
            subidas++;
          } catch (err) {
            fallidas++;
            console.error(`Falló la subida de la foto ${i + 1}/${archivosNuevos.length}`, err);
          }
        }
        if (subidas > 0 && fallidas === 0) {
          toast.success(subidas === 1 ? 'Imagen guardada' : `${subidas} imágenes guardadas`);
        } else if (subidas > 0 && fallidas > 0) {
          toast.warn(`Equipo guardado. ${subidas} imágenes subidas, ${fallidas} fallaron.`);
        } else {
          toast.error('Equipo guardado, pero falló la subida de imágenes');
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
            className="text-[var(--content-muted)] hover:text-white p-1 rounded-lg hover:bg-[var(--content-border)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* P3-Bug3: Fotos del equipo — input multiple + previews + advertencia <3.
              La primera foto (idx 0) es la "principal" que se muestra en mapa y ficha. */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--content-muted)]">
                Fotos del equipo
                <span className="ml-2 text-[10px] font-normal text-[var(--content-muted)]">
                  ({totalFotos}/{MAX_FOTOS})
                </span>
              </h3>
              {totalFotos > 0 && (
                <span className="text-[10px] text-[var(--content-muted)]">
                  {esEdicion ? `${fotosExistentes.length} guardadas + ${archivosNuevos.length} nuevas` : `${archivosNuevos.length} nuevas`}
                </span>
              )}
            </div>

            {/* Advertencia NO bloqueante: <3 fotos */}
            {fotosIncompletas && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-900/15 p-2.5 text-xs text-amber-300">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
                <div>
                  <p className="font-semibold">Recomendamos al menos 3 fotos por equipo</p>
                  <p className="text-amber-300/80 mt-0.5">
                    Frontal, placa de datos y panorámica del entorno. Esto facilita la identificación
                    en sala y el cumplimiento NOM-016. No bloquea el guardado.
                  </p>
                </div>
              </div>
            )}

            {/* Input + galería de previews */}
            <div className="flex items-start gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-[var(--content-bg)] border-2 border-dashed border-[var(--content-border)] overflow-hidden flex items-center justify-center flex-shrink-0">
                {previewsNuevos[0] ? (
                  <img src={previewsNuevos[0]} alt="principal" className="w-full h-full object-cover" />
                ) : (esEdicion && fotosExistentes[0]) ? (
                  <img src={fotosExistentes[0]} alt="actual" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <svg className="w-8 h-8 text-[var(--content-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleArchivos}
                  className="block w-full text-xs text-[var(--content-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--content-surface)] file:text-white hover:file:bg-[var(--content-border)] file:cursor-pointer"
                />
                <p className="text-xs text-[var(--content-muted)]">
                  PNG/JPG/WEBP · máx 10 MB c/u · máx {MAX_FOTOS} fotos. La <strong>primera</strong> será la <strong>principal</strong> (mapa y ficha).
                </p>

                {/* Miniaturas de las nuevas + etiqueta "Principal" en la primera */}
                {previewsNuevos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {previewsNuevos.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-[var(--content-border)] group flex-shrink-0"
                      >
                        <img src={src} alt={`nueva-${idx}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-0 left-0 right-0 bg-emerald-600/90 text-white text-[8px] font-bold uppercase tracking-wider text-center py-0.5">
                            Principal
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => quitarFotoNueva(idx)}
                          aria-label={`Quitar foto ${idx + 1}`}
                          className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-lg bg-red-600/90 hover:bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* En edición: muestra las guardadas como referencia (read-only) */}
                {esEdicion && fotosExistentes.length > 1 && (
                  <div className="pt-1">
                    <p className="text-[10px] text-[var(--content-muted)] mb-1 uppercase tracking-wider font-semibold">
                      Guardadas ({fotosExistentes.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {fotosExistentes.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative w-10 h-10 rounded overflow-hidden border border-[var(--content-border)] flex-shrink-0 opacity-70"
                          title={idx === 0 ? 'Principal actual' : `Foto ${idx + 1}`}
                        >
                          <img src={src} alt={`guardada-${idx}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          {idx === 0 && (
                            <span className="absolute inset-0 ring-2 ring-emerald-500/60 rounded pointer-events-none" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
