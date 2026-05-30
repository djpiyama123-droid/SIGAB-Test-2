import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconRobot, IconTerminal2, IconBrain, IconCpu, IconServer,
  IconCircleCheck, IconCircleX, IconAlertTriangle, IconExternalLink,
  IconArrowRight, IconPlugConnected, IconPlugConnectedX,
} from '@tabler/icons-react'
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

type EstadoVis = 'ok' | 'warning' | 'error' | 'sin_probe'

const ESTADO: Record<EstadoVis, { label: string; icon: React.ReactNode; cls: string }> = {
  ok:        { label: 'En línea',   icon: <IconCircleCheck size={15} className="text-esmeralda" />, cls: 'bg-green-50 text-esmeralda' },
  warning:   { label: 'Lento',      icon: <IconAlertTriangle size={15} className="text-ambar" />,    cls: 'bg-yellow-50 text-ambar' },
  error:     { label: 'Caído',      icon: <IconCircleX size={15} className="text-rojo" />,            cls: 'bg-red-50 text-rojo' },
  sin_probe: { label: 'Sin sonda',  icon: <IconPlugConnectedX size={15} className="text-slate-400" />, cls: 'bg-slate-100 text-slate-500' },
}

// Agentes e IA del ecosistema. `probe` = nombre del servicio en el monitor que define su estado.
interface Agente {
  nombre: string
  desc: string
  icon: React.ReactNode
  probe?: string
  to?: string
  href?: string
}
const AGENTES: Agente[] = [
  { nombre: 'Claude Code', desc: 'Asistente de desarrollo — terminal integrada del panel', icon: <IconTerminal2 size={20} />, to: '/panel/terminal' },
  { nombre: 'OpenClaw AI', desc: 'Gateway de automatización e IA', icon: <IconRobot size={20} />, probe: 'OpenClaw AI', href: 'https://usg.tpf.mybluehost.me' },
  { nombre: 'Hermes', desc: 'Mensajería y orquestación (pendiente de conectar sonda)', icon: <IconPlugConnected size={20} /> },
  { nombre: 'Cerebro + graphify', desc: 'Grafo de conocimiento y contexto de trabajo', icon: <IconBrain size={20} />, to: '/panel/cerebro' },
]

// Equipos de trabajo (vaults Obsidian)
const EQUIPOS = [
  { key: 'asus',     label: 'ASUS TUF Gaming A16', rol: 'Estación de desarrollo principal', specs: 'Ryzen 9 7845HX · RTX 4070 · 16 GB', icon: <IconCpu size={20} /> },
  { key: 'lenovo',   label: 'Lenovo ThinkCentre',  rol: 'Servidor local / NAS',             specs: 'Core i5-12400 · 16 GB · 1 TB',     icon: <IconServer size={20} /> },
  { key: 'bluehost', label: 'VPS Bluehost',        rol: 'Producción SIGAH + API',           specs: 'Ubuntu 22.04 · 2 vCPU · 2 GB',     icon: <IconServer size={20} /> },
]

export default function AgentesPage() {
  const { token } = useAuth()
  const [monitor, setMonitor] = useState<MonitorData | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    apiFetch<MonitorData>('/api/monitor/status', token)
      .then(setMonitor)
      .catch(() => setMonitor(null))
      .finally(() => setCargando(false))
  }, [token])

  const estadoDe = (probe?: string): EstadoVis => {
    if (!probe) return 'sin_probe'
    const svc = monitor?.services.find(s => s.name === probe)
    if (!svc) return cargando ? 'sin_probe' : 'error'
    return svc.status
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <IconRobot size={20} className="text-sigah-blue" />
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Agentes & Servicios</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
            Estado en vivo de los agentes de IA y los equipos de trabajo del ecosistema
          </p>
        </div>
      </div>

      {/* Agentes IA */}
      <section>
        <h2 className="font-sans font-medium text-sm text-slate-700 mb-3">Agentes de IA</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AGENTES.map(a => {
            const est = ESTADO[estadoDe(a.probe)]
            const body = (
              <div className="group bg-white rounded-xl card-border p-5 flex items-start gap-4 hover:shadow-md hover:border-sigah-blue/40 transition-all h-full">
                <span className="w-11 h-11 rounded-xl bg-bg-alt text-sigah-blue flex items-center justify-center flex-shrink-0">
                  {a.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-sans font-medium text-sm text-slate-800">{a.nombre}</p>
                    {a.href && <IconExternalLink size={13} className="text-slate-300 group-hover:text-sigah-blue transition-colors" />}
                    {a.to && <IconArrowRight size={13} className="text-slate-300 group-hover:text-sigah-blue transition-colors" />}
                  </div>
                  <p className="font-data font-normal text-xs text-slate-500 mt-0.5">{a.desc}</p>
                  <span className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded text-[10px] font-data font-normal ${est.cls}`}>
                    {est.icon}{est.label}
                  </span>
                </div>
              </div>
            )
            if (a.to)   return <Link key={a.nombre} to={a.to}>{body}</Link>
            if (a.href) return <a key={a.nombre} href={a.href} target="_blank" rel="noopener noreferrer">{body}</a>
            return <div key={a.nombre}>{body}</div>
          })}
        </div>
      </section>

      {/* Equipos de trabajo */}
      <section>
        <h2 className="font-sans font-medium text-sm text-slate-700 mb-3">Equipos de trabajo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EQUIPOS.map(eq => (
            <Link
              key={eq.key}
              to={`/panel/cerebro/${eq.key}`}
              className="group bg-white rounded-xl card-border p-5 hover:shadow-md hover:border-sigah-blue/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-xl bg-bg-alt text-sigah-blue flex items-center justify-center">{eq.icon}</span>
                <IconArrowRight size={15} className="text-slate-300 group-hover:text-sigah-blue group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-sans font-medium text-sm text-slate-800 mt-3">{eq.label}</p>
              <p className="font-data font-normal text-xs text-slate-500 mt-0.5">{eq.rol}</p>
              <p className="font-mono text-[10px] text-slate-400 mt-2">{eq.specs}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Servicios e infraestructura (monitor extendido) */}
      <section className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-sans font-medium text-sm text-slate-700">Servicios del VPS</h2>
          <Link to="/panel/monitor" className="flex items-center gap-1 font-data font-normal text-xs text-sigah-blue hover:underline">
            Monitor completo <IconArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {cargando && (
            <div className="px-5 py-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!cargando && !monitor && (
            <div className="px-5 py-8 text-center">
              <p className="font-data font-normal text-xs text-slate-400">No se pudo contactar el monitor</p>
            </div>
          )}
          {monitor?.services.map(s => {
            const est = ESTADO[s.status as EstadoVis] ?? ESTADO.sin_probe
            return (
              <div key={s.name} className="flex items-center gap-3 px-5 py-3">
                {est.icon}
                <span className="font-data font-normal text-sm text-slate-700 flex-1 truncate">{s.name}</span>
                <span className="font-mono text-[10px] text-slate-400">{s.latency_ms} ms</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-data font-normal ${est.cls}`}>{est.label}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
