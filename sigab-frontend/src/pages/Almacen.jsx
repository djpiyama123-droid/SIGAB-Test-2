import { useState, useEffect } from 'react';
import { api } from '../api/sigab';
import { Package, AlertTriangle, Search, Plus, Filter, TrendingDown } from 'lucide-react';
import toast from '../lib/toast';

export default function Almacen() {
  const [refacciones, setRefacciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filterStockBajo, setFilterStockBajo] = useState(false);

  useEffect(() => {
    cargar();
  }, [filterStockBajo]);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (busqueda) params.busqueda = busqueda;
      if (filterStockBajo) params.stock_bajo = 'true';

      const data = await api.getAlmacen(params);
      setRefacciones(data.refacciones || []);
    } catch (err) {
      toast.error('Error al cargar almacén');
    } finally {
      setLoading(false);
    }
  };

  const handlesearch = (e) => {
    if (e.key === 'Enter') cargar();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-500" />
            Almacén de Refacciones
          </h1>
          <p className="text-slate-400 mt-1">Gestión de stock técnico y control de insumos para mantenimiento.</p>
        </div>
        <button
          onClick={() => toast('Captura de nueva refacción — disponible en la próxima fase del módulo', { icon: 'ℹ️' })}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
          <Plus className="h-4 w-4" />
          Nueva Refacción
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="h-16 w-16" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Items en Inventario</p>
          <p className="text-3xl font-bold text-white mt-2">{refacciones.length}</p>
        </div>
        <div className="bg-red-900/10 border border-red-900/50 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500">
            <TrendingDown className="h-16 w-16" />
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o compatibilidad..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handlesearch}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterStockBajo(!filterStockBajo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-all ${
              filterStockBajo 
                ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Stock Bajo
          </button>
          <button
            onClick={() => toast('Filtros avanzados — disponibles en la próxima fase del módulo', { icon: '🔎' })}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-400 px-4 py-2 rounded-xl font-medium hover:bg-slate-700 transition-all">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
          <button
            onClick={() => toast('Predicción IA de consumo — próximamente conectada a SIGAB Copilot', { icon: '🧠' })}
            className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/50 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-600/20 transition-all active:scale-95">
            <TrendingDown className="h-4 w-4 rotate-180" />
            Smart Predicción
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Refacción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Compatible con</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Cargando almacén...</td>
                </tr>
              ) : refacciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No se encontraron refacciones.</td>
                </tr>
              ) : (
                refacciones.map((item) => {
                  const isLow = item.cantidad_disponible <= item.cantidad_minima;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{item.nombre}</p>
                        <p className="text-xs text-slate-500">{item.proveedor || 'Sin proveedor'}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.codigo_interno}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-300 max-w-[200px] truncate block" title={item.compatible_con_modelo}>
                          {item.compatible_con_modelo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-lg font-bold ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>
                            {item.cantidad_disponible}
                          </span>
                          <span className="text-[10px] text-slate-600 uppercase">mín: {item.cantidad_minima}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs">
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
                          onClick={() => toast(`Ajuste de stock para "${item.nombre}" — disponible en la próxima fase`, { icon: '📦' })}
                          className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase">
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
