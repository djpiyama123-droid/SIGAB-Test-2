import { useState, useEffect } from 'react'
import {
  IconStethoscope, IconClipboardList, IconAlertTriangle, IconCircleCheck,
  IconCurrencyDollar, IconDatabase, IconCalendarStats, IconCalendarOff,
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'
import { equiposBiomedicos, resumenInventario } from '../../data/equiposBiomedicos'

interface Kpis {
  total_equipos: number
  operativos: number
  en_mantenimiento: number
  criticos: number
  ordenes_abiertas: number
  valor_inventario: number
}

interface Preventivo {
  id: number
  equipo_nombre?: string
  equipo_id?: number
  fecha_programada?: string
  dias_restantes?: number
  tipo?: string
}

const fmtMXN = (n: number | undefined | null) =>
  n != null && !isNaN(Number(n)) ? '$' + Number(n).toLocaleString('es-MX') : '—'

const urgencyClass = (dias?: number) => {
  if (dias == null) return 'bg-slate-50 border-slate-100 text-slate-500'
  if (dias < 0)  return 'bg-red-50 border-red-100 text-rojo'
  if (dias <= 3) return 'bg-red-50 border-red-100 text-rojo'
  if (dias <= 7) return 'bg-amber-50 border-amber-100 text-ambar'
  return 'bg-green-50 border-green-100 text-esmeralda'
}

const diasLabel = (dias?: number) => {
  if (dias == null) return '—'
  if (dias < 0)  return `Vencido ${Math.abs(dias)}d`
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

export default function DashboardPage() {
  const { token } = useAuth()
  const demo = resumenInventario(equiposBiomedicos)
  const fallback: Kpis = {
    total_equipos: demo.total,
    operativos: demo.operativos,
    en_mantenimiento: demo.mantenimiento,
    criticos: demo.criticos + demo.alertas,
    ordenes_abiertas: 3,
    valor_inventario: demo.valor_total,
  }

  const [kpis, setKpis]         = useState<Kpis>(fallback)
  const [fuente, setFuente]     = useState<'mysql' | 'demo'>('demo')
  const [cargando, setCargando] = useState(true)
  const [proximos, setProximos] = useState<Preventivo[]>([])

  useEffect(() => {
    apiFetch<Partial<Kpis>>('/api/dashboard/kpis', token)
      .then(d => {
        if (d && typeof d.total_equipos === 'number') {
          setKpis({ ...fallback, ...d } as Kpis)
          setFuente('mysql')
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false))

    apiFetch<Preventivo[] | { preventivos?: Preventivo[] }>('/api/preventivos/proximos', token)
      .then(d => {
        const list = Array.isArray(d) ? d : (d as { preventivos?: Preventivo[] }).preventivos ?? []
        setProximos(list.slice(0, 8))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const cards = [
    { label: 'Total equipos',     val: kpis.total_equipos,     icon: <IconStethoscope size={18} />,   color: 'text-sigah-blue' },
    { label: 'Operativos',        val: kpis.operativos,        icon: <IconCircleCheck size={18} />,   color: 'text-esmeralda' },
    { label: 'En mantenimiento',  val: kpis.en_mantenimiento,  icon: <IconClipboardList size={18} />, color: 'text-ambar' },
    { label: 'Críticos / alerta', val: kpis.criticos,          icon: <IconAlertTriangle size={18} />, color: 'text-rojo' },
    { label: 'Órdenes abiertas',  val: kpis.ordenes_abiertas,  icon: <IconClipboardList size={18} />, color: 'text-sigah-blue' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Dashboard ejecutivo</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">Resumen operativo · HGR No. 1 IMSS Tijuana</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-data font-normal ${
          fuente === 'mysql' ? 'bg-green-50 text-esmeralda' : 'bg-slate-100 text-slate-500'
        }`}>
          <IconDatabase size={13} />
          {cargando ? 'Cargando…' : fuente === 'mysql' ? 'MySQL en vivo' : 'Datos demo'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl card-border p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider leading-snug">{c.label}</p>
              <span className={c.color}>{c.icon}</span>
            </div>
            <p className="font-sans font-medium text-2xl text-slate-800">{c.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-sigah-blue-dark rounded-xl p-5 flex items-center gap-4">
        <div className="p-2.5 bg-white/10 rounded-lg">
          <IconCurrencyDollar size={22} className="text-white" />
        </div>
        <div>
          <p className="font-data font-normal text-xs text-white/60 uppercase tracking-wider">Valor total del inventario</p>
          <p className="font-sans font-medium text-2xl text-white mt-0.5">
            {fmtMXN(kpis.valor_inventario)} <span className="text-sm font-normal text-white/60">MXN</span>
          </p>
        </div>
      </div>

      {/* Widget: Preventivos próximos (A7) */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <IconCalendarStats size={16} className="text-sigah-blue" />
            <p className="font-sans font-medium text-sm text-slate-800">Mantenimientos próximos</p>
          </div>
          {proximos.some(p => (p.dias_restantes ?? 99) <= 7) && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-rojo text-xs font-data">
              <IconCalendarOff size={11} />
              Atención requerida
            </span>
          )}
        </div>

        {proximos.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <IconCircleCheck size={28} className="text-esmeralda mx-auto mb-2" />
            <p className="font-data font-normal text-sm text-slate-400">
              {fuente === 'mysql' ? 'Sin preventivos urgentes próximos' : 'Conecta a MySQL para ver preventivos reales'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {proximos.map((p, i) => (
              <div key={p.id ?? i} className="flex items-center justify-between px-5 py-3 hover:bg-bg-principal transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(p.dias_restantes ?? 99) <= 3 ? 'bg-rojo' : (p.dias_restantes ?? 99) <= 7 ? 'bg-ambar' : 'bg-esmeralda'}`} />
                  <div>
                    <p className="font-data font-normal text-sm text-slate-700">{p.equipo_nombre ?? `Equipo #${p.equipo_id}`}</p>
                    <p className="font-data font-normal text-xs text-slate-400">{p.tipo ?? 'Preventivo'} · {p.fecha_programada ?? '—'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-data font-medium border ${urgencyClass(p.dias_restantes)}`}>
                  {diasLabel(p.dias_restantes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
