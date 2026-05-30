import { useEffect, useState } from 'react'
import { IconClipboardList, IconSearch, IconAlertTriangle } from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

interface Orden {
  numero: string
  equipo: string
  marca_modelo: string
  area: string
  tipo: string
  atencion: string
  falla: string
  fecha: string
  tecnico: string
  estado: string
  prioridad: string
  origen: string
  indice_salud: number | null
  probabilidad_falla: number | null
}

const PRIORIDAD_CFG: Record<string, string> = {
  alta: 'bg-red-50 text-rojo',
  critica: 'bg-red-50 text-rojo',
  media: 'bg-yellow-50 text-ambar',
  baja: 'bg-slate-100 text-slate-500',
}

export default function OrdenesPage() {
  const { token } = useAuth()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch<{ ordenes?: Orden[] }>('/api/ordenes', token)
      .then(d => setOrdenes(d.ordenes ?? []))
      .catch(() => setError(true))
      .finally(() => setCargando(false))
  }, [token])

  const filtered = ordenes.filter(o => {
    const q = search.toLowerCase()
    return o.numero.toLowerCase().includes(q) || o.equipo.toLowerCase().includes(q) ||
           o.area.toLowerCase().includes(q) || o.tecnico.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Órdenes de servicio</h1>
        <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
          Mantenimientos y atenciones registradas · HGR No. 1 IMSS Tijuana
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar orden, equipo, área, técnico..."
            className="pl-9 pr-4 py-2 rounded-lg card-border font-data font-normal text-sm text-slate-700 placeholder-slate-400 bg-white outline-none focus:border-sigah-blue transition-colors w-80"
          />
        </div>
        <span className="font-data font-normal text-xs text-slate-400 ml-auto">{filtered.length} órdenes</span>
      </div>

      <div className="bg-white rounded-xl card-border overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border bg-bg-principal">
              {['Orden', 'Equipo', 'Área', 'Tipo', 'Falla reportada', 'Fecha', 'Técnico', 'Prioridad', 'Estado'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(o => (
              <tr key={o.numero} className="hover:bg-bg-principal transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{o.numero}</td>
                <td className="px-4 py-3 font-data font-normal text-sm text-slate-700">
                  {o.equipo}<span className="block text-xs text-slate-400">{o.marca_modelo}</span>
                </td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{o.area}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{o.tipo}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 max-w-[260px] truncate" title={o.falla}>{o.falla}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{o.fecha}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{o.tecnico}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-md text-xs font-data font-normal whitespace-nowrap ${PRIORIDAD_CFG[o.prioridad?.toLowerCase()] ?? 'bg-slate-100 text-slate-500'}`}>
                    {o.prioridad}
                  </span>
                </td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-600 whitespace-nowrap capitalize">{o.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando && (
          <div className="px-5 py-10 text-center">
            <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
        {error && !cargando && (
          <div className="px-5 py-10 text-center flex flex-col items-center gap-2">
            <IconAlertTriangle size={20} className="text-ambar" />
            <p className="font-data font-normal text-sm text-slate-400">No se pudieron cargar las órdenes</p>
          </div>
        )}
        {!cargando && !error && filtered.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="font-data font-normal text-sm text-slate-400">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  )
}
