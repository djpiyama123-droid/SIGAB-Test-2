import { useState, useEffect } from 'react'
import { IconDatabase } from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

interface Orden {
  id: string | number
  equipo?: string
  tipo?: string
  estado?: string
  fecha?: string
  tecnico?: string
}

const DEMO_ORDENES: Orden[] = [
  { id: 'OS-0231', equipo: 'Monitor de signos vitales · EQ-003', tipo: 'Correctivo', estado: 'En proceso', fecha: '2026-05-28', tecnico: 'C. Ramírez' },
  { id: 'OS-0230', equipo: 'Incubadora dual · EQ-005',           tipo: 'Correctivo', estado: 'Abierta',    fecha: '2026-05-27', tecnico: 'G. López' },
  { id: 'OS-0229', equipo: 'Arco en C · EQ-001',                 tipo: 'Preventivo', estado: 'Cerrada',    fecha: '2026-05-20', tecnico: 'C. Ramírez' },
  { id: 'OS-0228', equipo: 'Ventilador Bellavista · EQ-004',     tipo: 'Correctivo', estado: 'Cerrada',    fecha: '2026-05-15', tecnico: 'G. López' },
]

const estadoCls = (estado?: string) => {
  const e = (estado || '').toLowerCase()
  if (e.includes('proceso')) return 'bg-blue-50 text-sigah-blue'
  if (e.includes('abiert')) return 'bg-yellow-50 text-ambar'
  if (e.includes('cerrad')) return 'bg-green-50 text-esmeralda'
  return 'bg-slate-100 text-slate-500'
}

export default function OrdenesPage() {
  const { token } = useAuth()
  const [ordenes, setOrdenes] = useState<Orden[]>(DEMO_ORDENES)
  const [fuente, setFuente] = useState<'mysql' | 'demo'>('demo')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    apiFetch<{ ordenes?: Orden[] }>('/api/ordenes', token)
      .then(d => {
        if (Array.isArray(d.ordenes) && d.ordenes.length > 0) {
          setOrdenes(d.ordenes)
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
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Órdenes de servicio</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">Historial de órdenes · HGR No. 1 IMSS Tijuana</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-data font-normal ${
          fuente === 'mysql' ? 'bg-green-50 text-esmeralda' : 'bg-slate-100 text-slate-500'
        }`}>
          <IconDatabase size={13} />
          {cargando ? 'Cargando…' : fuente === 'mysql' ? `MySQL en vivo · ${ordenes.length} órdenes` : 'Datos demo'}
        </span>
      </div>

      <div className="bg-white rounded-xl card-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-bg-principal">
              {['ID', 'Equipo', 'Tipo', 'Estado', 'Fecha', 'Técnico'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ordenes.map((o, i) => (
              <tr key={o.id ?? i} className="hover:bg-bg-principal transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{o.id}</td>
                <td className="px-4 py-3 font-data text-sm text-slate-700">{o.equipo ?? '—'}</td>
                <td className="px-4 py-3 font-data text-xs text-slate-500">{o.tipo ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-data font-normal whitespace-nowrap ${estadoCls(o.estado)}`}>
                    {o.estado ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-data text-xs text-slate-500 whitespace-nowrap">{o.fecha ?? '—'}</td>
                <td className="px-4 py-3 font-data text-xs text-slate-500 whitespace-nowrap">{o.tecnico ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
