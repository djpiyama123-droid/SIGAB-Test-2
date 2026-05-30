import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconStethoscope, IconAlertTriangle, IconFileText, IconBuildingHospital,
  IconTrendingUp, IconClockHour4, IconActivityHeartbeat, IconArrowRight,
  IconQrcode, IconCalendarStats, IconCube, IconBrain, IconCpu, IconServer,
  IconCircleCheck, IconCircleX,
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'

interface KPIs {
  equipos_registrados: number
  mantenimientos_activos: number
  alertas_criticas: number
  activos_en_uso: number
  instituciones: number
  contratos_activos: number
}

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

const KPI_CARDS = [
  { key: 'equipos_registrados',   label: 'Equipos registrados',    icon: <IconStethoscope size={20} />,     color: 'text-sigah-blue' },
  { key: 'activos_en_uso',        label: 'Activos en operación',   icon: <IconTrendingUp size={20} />,      color: 'text-esmeralda' },
  { key: 'mantenimientos_activos',label: 'Mantenimientos activos', icon: <IconClockHour4 size={20} />,      color: 'text-ambar' },
  { key: 'alertas_criticas',      label: 'Alertas críticas',       icon: <IconAlertTriangle size={20} />,   color: 'text-rojo' },
  { key: 'contratos_activos',     label: 'Contratos activos',      icon: <IconFileText size={20} />,        color: 'text-sigah-blue-dark' },
  { key: 'instituciones',         label: 'Instituciones',          icon: <IconBuildingHospital size={20} />,color: 'text-slate-600' },
] as const

interface Actividad { tipo: string; equipo: string; usuario: string; hora: string; estado: string }

const prioridadEstado = (p: string) =>
  ['alta', 'critica'].includes((p ?? '').toLowerCase()) ? 'error'
  : (p ?? '').toLowerCase() === 'media' ? 'warn' : 'ok'

interface OrdenLite { tipo?: string; equipo?: string; tecnico?: string; fecha?: string; prioridad?: string }

// Flujo operativo del ecosistema SIGAB — etapas y su estado actual
type EtapaEstado = 'activo' | 'proceso' | 'planeado'
const FLUJO: { titulo: string; desc: string; icon: React.ReactNode; estado: EtapaEstado; to?: string }[] = [
  { titulo: 'Inventario biomédico', desc: '751 equipos en MySQL en vivo',            icon: <IconStethoscope size={18} />,   estado: 'activo',   to: '/panel/sigab' },
  { titulo: 'Grabado QR láser',     desc: 'Trazabilidad en equipos y cables',        icon: <IconQrcode size={18} />,        estado: 'planeado' },
  { titulo: 'Mantenimiento + IA',   desc: 'Calendario y señales predictivas',        icon: <IconCalendarStats size={18} />, estado: 'activo',   to: '/panel/mantenimientos' },
  { titulo: 'Escáner 3D + refacciones', desc: 'AI 3D scan e impresión de piezas',    icon: <IconCube size={18} />,          estado: 'planeado' },
  { titulo: 'Cerebro + graphify',   desc: 'Contexto y grafo de conocimiento',        icon: <IconBrain size={18} />,         estado: 'proceso',  to: '/panel/cerebro' },
]

const ESTADO_BADGE: Record<EtapaEstado, { label: string; cls: string; dot: string }> = {
  activo:   { label: 'En operación', cls: 'bg-green-50 text-esmeralda',  dot: 'bg-esmeralda' },
  proceso:  { label: 'En proceso',   cls: 'bg-blue-50 text-sigah-blue',  dot: 'bg-sigah-blue' },
  planeado: { label: 'Planeado',     cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
}

// Equipos de trabajo (vault Obsidian / cerebro)
const EQUIPOS = [
  { key: 'asus',     label: 'ASUS TUF A16',       rol: 'Desarrollo principal',   icon: <IconCpu size={18} /> },
  { key: 'lenovo',   label: 'Lenovo ThinkCentre', rol: 'Servidor local / NAS',   icon: <IconServer size={18} /> },
  { key: 'bluehost', label: 'VPS Bluehost',       rol: 'Producción SIGAH + API', icon: <IconServer size={18} /> },
]

export default function DashboardPage() {
  const { token } = useAuth()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [monitor, setMonitor] = useState<MonitorData | null>(null)
  const [actividad, setActividad] = useState<Actividad[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setCargando(true)
    setError(false)
    Promise.all([
      apiFetch<KPIs>('/api/dashboard/kpis', token),
      apiFetch<{ ordenes?: OrdenLite[] }>('/api/ordenes', token),
    ])
      .then(([k, o]) => {
        setKpis(k)
        setActividad((o.ordenes ?? []).slice(0, 6).map(ord => ({
          tipo: ord.tipo || 'Orden de servicio',
          equipo: ord.equipo ?? '',
          usuario: ord.tecnico ?? '',
          hora: ord.fecha ?? '',
          estado: prioridadEstado(ord.prioridad ?? ''),
        })))
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false))
    // El monitor es secundario: si falla, no bloquea el dashboard
    apiFetch<MonitorData>('/api/monitor/status', token)
      .then(setMonitor)
      .catch(() => setMonitor(null))
  }, [token])

  const serviciosOk = monitor?.services.filter(s => s.status === 'ok').length ?? 0
  const serviciosTotal = monitor?.services.length ?? 0

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Dashboard</h1>
        <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
          Centro de mando SIGAH — inventario, infraestructura y flujo operativo
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <IconAlertTriangle size={18} className="text-rojo" />
          <p className="font-data font-normal text-sm text-rojo">No se pudieron cargar los datos del dashboard. Reintentando en la próxima recarga.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {KPI_CARDS.map(card => (
          <div key={card.key} className="bg-white rounded-xl card-border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="font-sans font-medium text-2xl text-slate-800 mt-1">
                  {cargando ? '…' : kpis ? kpis[card.key] : '—'}
                </p>
              </div>
              <span className={card.color}>{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Flujo operativo SIGAB */}
      <section className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-sans font-medium text-sm text-slate-700">Flujo operativo SIGAB</h2>
          <span className="font-data font-normal text-xs text-slate-400">Ecosistema de trazabilidad y refacciones</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {FLUJO.map((e, i) => {
            const badge = ESTADO_BADGE[e.estado]
            const inner = (
              <div className="p-4 h-full flex flex-col gap-2 hover:bg-bg-alt transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sigah-blue">{e.icon}</span>
                  <span className="font-data font-normal text-[10px] text-slate-300">{i + 1}</span>
                </div>
                <p className="font-sans font-medium text-sm text-slate-800">{e.titulo}</p>
                <p className="font-data font-normal text-xs text-slate-400 flex-1">{e.desc}</p>
                <span className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded text-[10px] font-data font-normal ${badge.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </div>
            )
            return e.to
              ? <Link key={e.titulo} to={e.to} className="group">{inner}</Link>
              : <div key={e.titulo}>{inner}</div>
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infraestructura / servicios en vivo */}
        <section className="bg-white rounded-xl card-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconActivityHeartbeat size={15} className="text-sigah-blue" />
              <h2 className="font-sans font-medium text-sm text-slate-700">Infraestructura</h2>
            </div>
            <Link to="/panel/monitor" className="flex items-center gap-1 font-data font-normal text-xs text-sigah-blue hover:underline">
              Monitor <IconArrowRight size={12} />
            </Link>
          </div>
          {monitor ? (
            <>
              <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
                {serviciosOk === serviciosTotal
                  ? <IconCircleCheck size={16} className="text-esmeralda" />
                  : <IconCircleX size={16} className="text-rojo" />}
                <span className="font-data font-normal text-xs text-slate-600">
                  {serviciosOk}/{serviciosTotal} servicios operativos
                </span>
              </div>
              <div className="divide-y divide-border max-h-44 overflow-y-auto">
                {monitor.services.map(s => (
                  <div key={s.name} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      s.status === 'ok' ? 'bg-esmeralda' : s.status === 'warning' ? 'bg-ambar' : 'bg-rojo'
                    }`} />
                    <span className="font-data font-normal text-sm text-slate-700 flex-1 truncate">{s.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{s.latency_ms} ms</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {([['CPU', monitor.cpu], ['RAM', monitor.ram], ['Disco', monitor.disk]] as const).map(([l, v]) => (
                  <div key={l} className="px-3 py-3 text-center">
                    <p className="font-data font-normal text-[10px] text-slate-400 uppercase tracking-wider">{l}</p>
                    <p className="font-sans font-medium text-sm text-slate-800 mt-0.5">{v}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="font-data font-normal text-xs text-slate-400">Monitor no disponible por ahora</p>
            </div>
          )}
        </section>

        {/* Equipos de trabajo */}
        <section className="bg-white rounded-xl card-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBrain size={15} className="text-sigah-blue" />
              <h2 className="font-sans font-medium text-sm text-slate-700">Equipos de trabajo</h2>
            </div>
            <Link to="/panel/cerebro" className="flex items-center gap-1 font-data font-normal text-xs text-sigah-blue hover:underline">
              Cerebro <IconArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {EQUIPOS.map(eq => (
              <Link
                key={eq.key}
                to={`/panel/cerebro/${eq.key}`}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-bg-alt transition-colors"
              >
                <span className="p-2 bg-bg-alt rounded-lg text-sigah-blue flex-shrink-0">{eq.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm text-slate-700">{eq.label}</p>
                  <p className="font-data font-normal text-xs text-slate-400">{eq.rol}</p>
                </div>
                <IconArrowRight size={14} className="text-slate-300 group-hover:text-sigah-blue group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-sans font-medium text-sm text-slate-700">Actividad reciente</h2>
        </div>
        <div className="divide-y divide-border">
          {actividad.length === 0 && (
            <div className="px-5 py-6 text-center">
              <p className="font-data font-normal text-xs text-slate-400">Sin actividad reciente</p>
            </div>
          )}
          {actividad.map((row, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                row.estado === 'ok'    ? 'bg-esmeralda' :
                row.estado === 'warn'  ? 'bg-ambar' :
                row.estado === 'error' ? 'bg-rojo' :
                'bg-sigah-blue'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-data font-normal text-sm text-slate-700 truncate">{row.tipo}</p>
                <p className="font-data font-normal text-xs text-slate-400 truncate">{row.equipo}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-data font-normal text-xs text-slate-500">{row.usuario}</p>
                <p className="font-data font-normal text-xs text-slate-400">{row.hora}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
