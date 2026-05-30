import { useState, useEffect } from 'react'
import {
  IconStethoscope, IconAlertTriangle, IconCircleCheck,
  IconClockHour4, IconSearch, IconCurrencyPeso, IconDatabase,
} from '@tabler/icons-react'
import { equiposBiomedicos, resumenInventario, type EstadoEquipo, type EquipoBiomedico } from '../../data/equiposBiomedicos'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

const ESTADO_CFG: Record<EstadoEquipo, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  operativo:     { label: 'Operativo',     bg: 'bg-green-50',  text: 'text-esmeralda',  icon: <IconCircleCheck size={13} /> },
  alerta:        { label: 'Alerta',        bg: 'bg-yellow-50', text: 'text-ambar',      icon: <IconAlertTriangle size={13} /> },
  mantenimiento: { label: 'Mantenimiento', bg: 'bg-blue-50',   text: 'text-sigah-blue', icon: <IconClockHour4 size={13} /> },
  critico:       { label: 'Crítico',       bg: 'bg-red-50',    text: 'text-rojo',       icon: <IconAlertTriangle size={13} /> },
  baja:          { label: 'Baja',          bg: 'bg-slate-100', text: 'text-slate-500',  icon: <IconAlertTriangle size={13} /> },
}

const fmtMXN = (n: number) => '$' + n.toLocaleString('es-MX')

export default function SIGABAppPage() {
  const { token } = useAuth()
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroArea, setFiltroArea] = useState<string>('todas')
  const [equipos, setEquipos] = useState<EquipoBiomedico[]>(equiposBiomedicos)
  const [fuente, setFuente] = useState<'mysql' | 'mock'>('mock')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    apiFetch<{ equipos?: EquipoBiomedico[] }>('/api/equipos', token)
      .then(d => {
        if (Array.isArray(d.equipos) && d.equipos.length > 0) {
          setEquipos(d.equipos)
          setFuente('mysql')
        }
      })
      .catch(() => { /* mantiene datos demo */ })
      .finally(() => setCargando(false))
  }, [token])

  const resumen = resumenInventario(equipos)
  const areas = ['todas', ...Array.from(new Set(equipos.map(e => e.area))).sort()]

  const filtered = equipos.filter(eq => {
    const q = search.toLowerCase()
    const matchSearch = eq.nombre.toLowerCase().includes(q) ||
                        eq.area.toLowerCase().includes(q) ||
                        eq.id.toLowerCase().includes(q) ||
                        eq.marca.toLowerCase().includes(q) ||
                        eq.modelo.toLowerCase().includes(q)
    const matchEstado = filtroEstado === 'todos' || eq.estado === filtroEstado
    const matchArea = filtroArea === 'todas' || eq.area === filtroArea
    return matchSearch && matchEstado && matchArea
  })

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">SIGAB — Inventario hospitalario</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
            Base de datos de activos biomédicos · HGR No. 1 IMSS Tijuana
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-data font-normal ${
          fuente === 'mysql' ? 'bg-green-50 text-esmeralda' : 'bg-slate-100 text-slate-500'
        }`}>
          <IconDatabase size={13} />
          {cargando ? 'Cargando…' : fuente === 'mysql' ? `MySQL en vivo · ${equipos.length} equipos` : 'Datos demo'}
        </span>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total equipos', val: resumen.total,          icon: <IconStethoscope size={16} />,  color: 'text-sigah-blue' },
          { label: 'Operativos',    val: resumen.operativos,     icon: <IconCircleCheck size={16} />,  color: 'text-esmeralda' },
          { label: 'Alertas',       val: resumen.alertas,        icon: <IconAlertTriangle size={16} />,color: 'text-ambar' },
          { label: 'Mantenimiento', val: resumen.mantenimiento,  icon: <IconClockHour4 size={16} />,   color: 'text-sigah-blue' },
          { label: 'Críticos',      val: resumen.criticos,       icon: <IconAlertTriangle size={16} />,color: 'text-rojo' },
          { label: 'Áreas',         val: resumen.areas,          icon: <IconStethoscope size={16} />,  color: 'text-slate-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl card-border p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            <p className="font-sans font-medium text-2xl text-slate-800">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Valor del inventario */}
      <div className="bg-sigah-blue-dark rounded-xl p-5 flex items-center gap-4">
        <div className="p-2.5 bg-white/10 rounded-lg">
          <IconCurrencyPeso size={22} className="text-white" />
        </div>
        <div>
          <p className="font-data font-normal text-xs text-white/60 uppercase tracking-wider">Valor total del inventario</p>
          <p className="font-sans font-medium text-2xl text-white mt-0.5">{fmtMXN(resumen.valor_total)} <span className="text-sm font-normal text-white/60">MXN</span></p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar equipo, marca, modelo, área, ID..."
            className="pl-9 pr-4 py-2 rounded-lg card-border font-data font-normal text-sm text-slate-700 placeholder-slate-400 bg-white outline-none focus:border-sigah-blue transition-colors w-72"
          />
        </div>
        <select
          value={filtroArea}
          onChange={e => setFiltroArea(e.target.value)}
          className="px-3 py-2 rounded-lg card-border font-data font-normal text-sm text-slate-600 bg-white outline-none focus:border-sigah-blue transition-colors"
        >
          {areas.map(a => <option key={a} value={a}>{a === 'todas' ? 'Todas las áreas' : a}</option>)}
        </select>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['todos', 'operativo', 'alerta', 'mantenimiento', 'critico'].map(est => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-data font-normal transition-colors ${
                filtroEstado === est
                  ? 'bg-sigah-blue text-white'
                  : 'bg-white card-border text-slate-500 hover:bg-bg-alt'
              }`}
            >
              {est === 'todos' ? 'Todos' : ESTADO_CFG[est as EstadoEquipo].label}
            </button>
          ))}
        </div>
        <span className="font-data font-normal text-xs text-slate-400 ml-auto">{filtered.length} resultados</span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl card-border overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-bg-principal">
              {['ID', 'Equipo', 'Marca / Modelo', 'Área', 'Ubicación', 'Estado', 'Próximo mant.', 'Valor'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(eq => {
              const cfg = ESTADO_CFG[eq.estado]
              return (
                <tr key={eq.id} className="hover:bg-bg-principal transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{eq.id}</td>
                  <td className="px-4 py-3 font-data font-normal text-sm text-slate-700">{eq.nombre}</td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500">{eq.marca} {eq.modelo}</td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{eq.area}</td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{eq.ubicacion}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-data font-normal whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{eq.proximo_mant}</td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-600 whitespace-nowrap">{fmtMXN(eq.valor_mxn)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="font-data font-normal text-sm text-slate-400">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  )
}
