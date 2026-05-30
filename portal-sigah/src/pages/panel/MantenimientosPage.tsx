import { useEffect, useState } from 'react'
import { IconCalendarStats, IconAlertTriangle, IconActivityHeartbeat } from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

interface EquipoMant {
  id: string
  nombre: string
  marca: string
  modelo: string
  area: string
  criticidad: string
  proximo_mant: string
  dias_restantes: number | null
  estimado?: boolean
  situacion: 'vencido' | 'proximo' | 'al dia' | 'sin fecha'
}
interface Predictivo {
  orden: string
  equipo: string
  area: string
  indice_salud: number | null
  probabilidad_falla: number | null
  componente_riesgo: string
  ventana_dias: number | null
}

const SITUACION_CFG: Record<string, { label: string; cls: string }> = {
  vencido:    { label: 'Vencido',   cls: 'bg-red-50 text-rojo' },
  proximo:    { label: 'Próximo',   cls: 'bg-yellow-50 text-ambar' },
  'al dia':   { label: 'Al día',    cls: 'bg-green-50 text-esmeralda' },
  'sin fecha':{ label: 'Sin fecha', cls: 'bg-slate-100 text-slate-500' },
}

function saludColor(v: number | null) {
  if (v === null) return 'text-slate-400'
  if (v >= 70) return 'text-esmeralda'
  if (v >= 40) return 'text-ambar'
  return 'text-rojo'
}

export default function MantenimientosPage() {
  const { token } = useAuth()
  const [equipos, setEquipos] = useState<EquipoMant[]>([])
  const [predictivo, setPredictivo] = useState<Predictivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiFetch<{ equipos?: EquipoMant[]; predictivo?: Predictivo[] }>('/api/preventivos/proximos', token)
      .then(d => { setEquipos(d.equipos ?? []); setPredictivo(d.predictivo ?? []) })
      .catch(() => setError(true))
      .finally(() => setCargando(false))
  }, [token])

  const vencidos = equipos.filter(e => e.situacion === 'vencido').length
  const proximos = equipos.filter(e => e.situacion === 'proximo').length

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Mantenimiento + Predictivo IA</h1>
        <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
          Calendario de mantenimientos y señales de la IA local (SIGAH Copilot)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Programados', val: equipos.length, color: 'text-sigah-blue' },
          { label: 'Vencidos', val: vencidos, color: 'text-rojo' },
          { label: 'Próximos (30 d)', val: proximos, color: 'text-ambar' },
          { label: 'Señales IA', val: predictivo.length, color: 'text-esmeralda' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl card-border p-4">
            <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">{k.label}</p>
            <p className={`font-sans font-medium text-2xl mt-1 ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Calendario de mantenimientos */}
      <div className="bg-white rounded-xl card-border overflow-x-auto">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <IconCalendarStats size={16} className="text-sigah-blue" />
          <h2 className="font-sans font-medium text-sm text-slate-700">Próximos mantenimientos</h2>
        </div>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-bg-principal">
              {['ID', 'Equipo', 'Área', 'Criticidad', 'Próximo mant.', 'Días', 'Situación'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipos.slice(0, 50).map(e => {
              const cfg = SITUACION_CFG[e.situacion]
              return (
                <tr key={e.id} className="hover:bg-bg-principal transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{e.id}</td>
                  <td className="px-4 py-3 font-data font-normal text-sm text-slate-700">{e.nombre}<span className="block text-xs text-slate-400">{e.marca} {e.modelo}</span></td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{e.area}</td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 capitalize">{e.criticidad}</td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">
                    {e.proximo_mant}
                    {e.estimado && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px]" title="Estimado a partir del último mantenimiento y la criticidad del equipo">est.</span>}
                  </td>
                  <td className="px-4 py-3 font-data font-normal text-xs text-slate-600 whitespace-nowrap">{e.dias_restantes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-data font-normal whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {equipos.length > 50 && (
          <div className="px-5 py-2.5 border-t border-border text-center">
            <p className="font-data font-normal text-xs text-slate-400">Mostrando 50 de {equipos.length} equipos programados</p>
          </div>
        )}
      </div>

      {/* Predictivo IA */}
      <div className="bg-white rounded-xl card-border overflow-x-auto">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <IconActivityHeartbeat size={16} className="text-esmeralda" />
          <h2 className="font-sans font-medium text-sm text-slate-700">Señales predictivas (IA local)</h2>
        </div>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-bg-principal">
              {['Orden', 'Equipo', 'Área', 'Índice salud', 'Prob. falla', 'Componente en riesgo', 'Ventana'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {predictivo.map(p => (
              <tr key={p.orden} className="hover:bg-bg-principal transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{p.orden}</td>
                <td className="px-4 py-3 font-data font-normal text-sm text-slate-700">{p.equipo}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{p.area}</td>
                <td className={`px-4 py-3 font-sans font-medium text-sm ${saludColor(p.indice_salud)}`}>{p.indice_salud ?? '—'}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-600">{p.probabilidad_falla !== null ? `${p.probabilidad_falla}%` : '—'}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 max-w-[240px] truncate" title={p.componente_riesgo}>{p.componente_riesgo}</td>
                <td className="px-4 py-3 font-data font-normal text-xs text-slate-500 whitespace-nowrap">{p.ventana_dias !== null ? `${p.ventana_dias} d` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {predictivo.length === 0 && !cargando && (
          <div className="px-5 py-8 text-center">
            <p className="font-data font-normal text-sm text-slate-400">Sin señales predictivas registradas</p>
          </div>
        )}
      </div>

      {cargando && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && !cargando && (
        <div className="flex items-center justify-center gap-2 py-6">
          <IconAlertTriangle size={18} className="text-ambar" />
          <p className="font-data font-normal text-sm text-slate-400">No se pudieron cargar los mantenimientos</p>
        </div>
      )}
    </div>
  )
}
