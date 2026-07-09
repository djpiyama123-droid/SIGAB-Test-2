import { useState, useEffect } from 'react';
import { api } from '../api/sigah';
import { Package, AlertTriangle, Search, Plus, Filter, TrendingDown, X } from 'lucide-react';
import toast from '../lib/toast';

// ─── Modal: Nueva Refacción ───────────────────────────────────────────────────
function NuevaRefaccionModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '', codigo_interno: '', compatible_con_modelo: '',
    cantidad_disponible: 0, cantidad_minima: 1,
    ubicacion_almacen: '', proveedor: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || form.nombre.length < 3) {
      return toast.error('El nombre debe tener al menos 3 caracteres');
    }
    setSaving(true);
    try {
      await api.crearRefaccion({
        ...form,
        cantidad_disponible: Number(form.cantidad_disponible),
        cantidad_minima: Number(form.cantidad_minima),
      });
      toast.success('Refacción agregada al inventario');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear refacción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900 bg-slate-900/40">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            Nueva Refacción
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Nombre *</label>
              <input required minLength={3} value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Ej. Filtro HEPA Draeger" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Código interno</label>
              <input value={form.codigo_interno} onChange={e => set('codigo_interno', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="REF-001" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Proveedor</label>
              <input value={form.proveedor} onChange={e => set('proveedor', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Proveedor S.A. de C.V." />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Stock inicial</label>
              <input type="number" min={0} value={form.cantidad_disponible} onChange={e => set('cantidad_disponible', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Stock mínimo</label>
              <input type="number" min={0} value={form.cantidad_minima} onChange={e => set('cantidad_minima', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Ubicación en almacén</label>
              <input value={form.ubicacion_almacen} onChange={e => set('ubicacion_almacen', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Estante A-3" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Compatible con</label>
              <input value={form.compatible_con_modelo} onChange={e => set('compatible_con_modelo', e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Modelo o familia de equipos" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/10">
              {saving ? 'Guardando...' : 'Guardar Refacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Ajustar Stock ─────────────────────────────────────────────────────
function AjustarStockModal({ item, onClose, onSaved }) {
  const [cantidad, setCantidad] = useState(1);
  const [tipo, setTipo] = useState('entrada');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cantidad < 1) return toast.error('La cantidad debe ser al menos 1');
    if (tipo === 'salida' && cantidad > item.cantidad_disponible) {
      return toast.error('Stock insuficiente para la salida');
    }
    setSaving(true);
    try {
      await api.ajustarStock(item.id, { cantidad: Number(cantidad), tipo });
      toast.success(`Stock ajustado: ${tipo === 'entrada' ? '+' : '-'}${cantidad} unidades`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al ajustar stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-900 bg-slate-900/40">
          <h2 className="text-lg font-bold text-white">Ajustar Stock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-slate-300">
            <span className="font-bold text-white">{item.nombre}</span>{' '}
            — Stock actual: <span className="font-bold text-emerald-400">{item.cantidad_disponible}</span>
          </p>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-2 block">Movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {['entrada', 'salida'].map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                    tipo === t
                      ? t === 'entrada' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-red-600/20 border-red-500 text-red-400'
                      : 'border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                  }`}>
                  {t === 'entrada' ? '+ Entrada' : '- Salida'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase mb-1.5 block">Cantidad</label>
            <input type="number" min={1} value={cantidad} onChange={e => setCantidad(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50">
              {saving ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Almacen() {
  const [refacciones, setRefacciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filterStockBajo, setFilterStockBajo] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [ajustando, setAjustando] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (busqueda) params.busqueda = busqueda;
      if (filterStockBajo) params.stock_bajo = 'true';
      const data = await api.getAlmacen(params);
      setRefacciones(data.refacciones || []);
    } catch {
      toast.error('Error al cargar almacén');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [filterStockBajo]);

  const handleSearch = (e) => { if (e.key === 'Enter') cargar(); };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-text)] flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-500" />
            Almacén de Refacciones
          </h1>
          <p className="text-[var(--content-muted)] mt-1">Gestión de stock técnico y control de insumos para mantenimiento.</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
          <Plus className="h-4 w-4" />
          Nueva Refacción
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-[var(--content-border)] p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="h-16 w-16" />
          </div>
          <p className="text-[var(--content-muted)] text-sm font-medium">Items en Inventario</p>
          <p className="text-3xl font-bold text-[var(--content-text)] mt-2">{refacciones.length}</p>
        </div>
        <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500">
            <AlertTriangle className="h-16 w-16" />
          </div>
          <p className="text-red-400/80 text-sm font-medium">Stock Crítico</p>
          <p className="text-3xl font-bold text-red-500 mt-2">
            {refacciones.filter(r => r.cantidad_disponible <= r.cantidad_minima).length}
          </p>
        </div>
        <div className="bg-emerald-900/10 border border-emerald-900/50 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
            <TrendingDown className="h-16 w-16 rotate-180" />
          </div>
          <p className="text-emerald-400/80 text-sm font-medium">Valor Estimado Pool</p>
          <p className="text-3xl font-bold text-emerald-500 mt-2">Premium</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--content-muted)]" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o compatibilidad..."
            className="w-full bg-[var(--content-bg)] border border-[var(--content-border)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--content-text)] placeholder:text-[var(--content-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStockBajo(!filterStockBajo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-all ${
              filterStockBajo 
                ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                : 'bg-[var(--content-surface)] border-[var(--content-border)] text-[var(--content-muted)] hover:bg-[var(--content-border)]'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Stock Bajo
          </button>
          <button
            onClick={cargar}
            className="flex items-center gap-2 bg-[var(--content-surface)] border border-[var(--content-border)] text-[var(--content-muted)] px-4 py-2 rounded-xl font-medium hover:bg-[var(--content-border)] transition-all">
            <Filter className="h-4 w-4" />
            Buscar
          </button>
          <button
            onClick={() => toast('Predicción IA de consumo — próximamente conectada a SIGAH Copilot', { icon: '🧠' })}
            className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/50 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-600/20 transition-all active:scale-95">
            <TrendingDown className="h-4 w-4 rotate-180" />
            Smart Predicción
          </button>
        </div>
      </div>

      <div className="bg-[var(--content-bg)]/50 border border-[var(--content-border)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--content-bg)]/80 border-b border-[var(--content-border)]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Refacción</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Compatible con</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider text-center">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--content-muted)] uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--content-muted)]">Cargando almacén...</td>
                </tr>
              ) : refacciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--content-muted)]">No se encontraron refacciones.</td>
                </tr>
              ) : (
                refacciones.map((item) => {
                  const isLow = item.cantidad_disponible <= item.cantidad_minima;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[var(--content-text)] group-hover:text-emerald-400 transition-colors">{item.nombre}</p>
                        <p className="text-xs text-[var(--content-muted)]">{item.proveedor || 'Sin proveedor'}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[var(--content-muted)]">{item.codigo_interno}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[var(--content-muted)] max-w-[200px] truncate block" title={item.compatible_con_modelo}>
                          {item.compatible_con_modelo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>
                            {item.cantidad_disponible}
                          </span>
                          <span className="text-[10px] text-[var(--content-muted)] uppercase">mín: {item.cantidad_minima}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-[var(--content-surface)] text-[var(--content-muted)] px-2 py-1 rounded text-xs">
                          {item.ubicacion_almacen || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                            CRÍTICO
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ÓPTIMO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setAjustando(item)}
                          className="text-[var(--content-muted)] hover:text-[var(--content-text)] transition-colors text-xs font-bold uppercase">
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalNueva && (
        <NuevaRefaccionModal
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); cargar(); }}
        />
      )}

      {ajustando && (
        <AjustarStockModal
          item={ajustando}
          onClose={() => setAjustando(null)}
          onSaved={() => { setAjustando(null); cargar(); }}
        />
      )}
    </div>
  );
}
