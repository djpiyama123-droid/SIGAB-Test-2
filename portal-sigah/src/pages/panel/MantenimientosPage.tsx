import { useState, useEffect } from 'react'
import { IconDatabase } from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

interface Preventivo {
  id: string | number
  equipo?: string
  fecha?: string
  estado?: string
  tipo?: string
}

const DEMO_PREVENTIVOS: Preventivo[] = [
  { id: 'PM-118', equipo: 'Monitor de signos vitales · EQ-003', tipo: 'Preventivo trimestral', fecha: '2026-06-05', estado: 'Programado' },
  { id: 'PM-119', equipo: 'Incubadora dual · EQ-005',           tipo: 'Calibración',          fecha: '2026-06-10', estado: 'Programado' },
  { id: 'PM-120', equipo: 'Monitor de signos vitales · EQ-002', tipo: 'Preventivo trimestral', fecha: '2026-06-20', estado: 'Programado' },
  { id: 'PM-121', equipo: 'Arco en C · EQ-001',                 tipo: 'Preventivo semestral',  fecha: '2026-07-15', estado: 'Pendiente' },
  { id: 'PM-122', equipo: 'Ventilador Bellavista · EQ-004',     tipo: 'Preventivo trimestral', fecha: '2026-08-01', estado: 'Pendiente' },
]

const estadoCls = (estado?: string) => {
  const e = (estado || '').toLowerCase()
  if (e.includes('program')) return 'bg-blue-50 text-sigah-blue'
  if (e.includes('pendien')) return 'bg-yellow-50 text-ambar'
  if (e.includes('hecho') || e.includes('ejecut')) return 'bg-green-50 text-esmeralda'
  return 'bg-slate-100 text-slate-500'
}

export default function MantenimientosPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<Preventivo[]>(DEMO_PREVENTIVOS)
  const [fuente, setFuente] = useState<'mysql' | 'demo'>('demo')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    apiFetch<{ preventivos?: Preventivo[] }>('/api/preventivos/proximos', token)
      .then(d => {
        if (Array.isArray(d.preventivos) && d.preventivos.length > 0) {
          setItems(d.preventivos)
          setFuente('mysql')
        }
      })
      .catch(() => { /* mantiene datos demo */ })
      .finally(() => setCargando(false))
  }, [token])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Mantenimientos preventivos</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">Calendario de preventivos próximos · HGR No. 1</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-data font-normal ${
          fuente === 'mysql' ? 'bg-green-50 text-esmeralda' : 'bg-slate-100 text-slate-500'
        }`}>
          <IconDatabase size={13} />
          {cargando ? 'Cargando…' : fuente === 'mysql' ? `MySQL en vivo · ${items.length} preventivos` : 'Datos demo'}
        </span>
      </div>

      <div className="bg-white rounded-xl card-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-bg-principal">
              {['ID', 'Equipo', 'Tipo', 'Fecha', 'Estado'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((p, i) => (
              <tr key={p.id ?? i} className="hover:bg-bg-principal transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{p.id}</td>
                <td className="px-4 py-3 font-data text-sm text-slate-700">{p.equipo ?? '—'}</td>
                <td className="px-4 py-3 font-data text-xs text-slate-500">{p.tipo ?? '—'}</td>
                <td className="px-4 py-3 font-data text-xs text-slate-500 whitespace-nowrap">{p.fecha ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-data font-normal whitespace-nowrap ${estadoCls(p.estado)}`}>
                    {p.estado ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
