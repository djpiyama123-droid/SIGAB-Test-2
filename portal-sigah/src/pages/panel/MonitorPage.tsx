import { useEffect, useState, useCallback } from 'react'
import { IconCircleCheck, IconAlertTriangle, IconCircleX, IconRefresh } from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

interface Service {
  name: string
  status: 'ok' | 'warning' | 'error'
  uptime: string
  latency_ms: number
}

interface MonitorData {
  services: Service[]
  cpu: number
  ram: number
  disk: number
  last_checked: string
}

const STATUS_ICON = {
  ok:      <IconCircleCheck size={16} className="text-esmeralda" />,
  warning: <IconAlertTriangle size={16} className="text-ambar" />,
  error:   <IconCircleX size={16} className="text-rojo" />,
}

const STATUS_LABEL = { ok: 'Operativo', warning: 'Advertencia', error: 'Error' }
const STATUS_BG    = { ok: 'bg-esmeralda', warning: 'bg-ambar', error: 'bg-rojo' }

function Gauge({ label, value, color }: { label: string; value: number | null; color: string }) {
  const v = value ?? 0
  return (
    <div className="bg-white rounded-xl card-border p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <span className="font-sans font-medium text-lg text-slate-800">{value === null ? '—' : `${value}%`}</span>
      </div>
      <div className="w-full h-2 bg-bg-alt rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  )
}

export default function MonitorPage() {
  const { token } = useAuth()
  const [data, setData] = useState<MonitorData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const fetch_data = useCallback(() => {
    setRefreshing(true)
    apiFetch<MonitorData>('/api/monitor/status', token)
      .then(d => { setData(d); setError(false) })
      .catch(() => setError(true))
      .finally(() => setRefreshing(false))
  }, [token])

  useEffect(() => {
    fetch_data()
    const id = setInterval(fetch_data, 30_000)
    return () => clearInterval(id)
  }, [fetch_data])

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Monitor SIGAH</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
            Estado de servicios en tiempo real — actualización cada 30 s
          </p>
        </div>
        <button
          onClick={fetch_data}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg card-border font-data font-normal text-sm text-slate-600 hover:bg-bg-alt transition-colors disabled:opacity-50"
        >
          <IconRefresh size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-sans font-medium text-sm text-slate-700">Servicios</h2>
        </div>
        <div className="divide-y divide-border">
          {(data?.services ?? []).map(svc => (
            <div key={svc.name} className="flex items-center gap-4 px-5 py-3.5">
              {STATUS_ICON[svc.status]}
              <div className="flex-1 min-w-0">
                <p className="font-data font-normal text-sm text-slate-700">{svc.name}</p>
                <p className="font-data font-normal text-xs text-slate-400">Uptime: {svc.uptime}</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="font-data font-normal text-xs text-slate-500">{svc.latency_ms} ms</p>
                  <p className="font-data font-normal text-[10px] text-slate-400">latencia</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-white text-[10px] font-data font-normal ${STATUS_BG[svc.status]}`}>
                  {STATUS_LABEL[svc.status]}
                </span>
              </div>
            </div>
          ))}
          {!data && !error && (
            <div className="px-5 py-8 text-center">
              <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
          {!data && error && (
            <div className="px-5 py-8 flex flex-col items-center gap-2">
              <IconAlertTriangle size={20} className="text-ambar" />
              <p className="font-data font-normal text-sm text-slate-400">No se pudo contactar el monitor de servicios</p>
            </div>
          )}
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Gauge label="CPU"  value={data?.cpu  ?? null} color="bg-sigah-blue" />
        <Gauge label="RAM"  value={data?.ram  ?? null} color="bg-esmeralda" />
        <Gauge label="Disco" value={data?.disk ?? null} color="bg-ambar" />
      </div>

      {/* Última verificación */}
      <div className="bg-white rounded-xl card-border px-5 py-4 flex items-center justify-between">
        <p className="font-data font-normal text-xs text-slate-500">
          Última verificación: {data?.last_checked ? new Date(data.last_checked).toLocaleString('es-MX') : '—'}
        </p>
        <span className="font-data font-normal text-xs text-slate-400">
          Probes en vivo: FastAPI · MySQL · Bot · Panel · Traefik
        </span>
      </div>
    </div>
  )
}
