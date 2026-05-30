import { Link } from 'react-router-dom'
import {
  IconStethoscope, IconWorld, IconActivityHeartbeat, IconRobot,
  IconLayoutDashboard, IconClipboardList, IconCalendarStats,
  IconTerminal2, IconKey, IconBrain, IconExternalLink, IconArrowRight,
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'

interface AppCard {
  titulo: string
  desc: string
  icon: React.ReactNode
  color: string
  href: string
}

// Aplicaciones desplegadas en el VPS Bluehost (subdominios reales)
const APPS: AppCard[] = [
  {
    titulo: 'SIGAB — App Hospitalaria',
    desc: 'Sistema operativo del HGR No. 1 IMSS Tijuana (acceso por matrícula)',
    icon: <IconStethoscope size={22} />, color: 'text-sigah-blue bg-blue-50',
    href: 'https://sigab.129-121-100-147.sslip.io',
  },
  {
    titulo: 'Portal SIGAH',
    desc: 'Sitio web público y de marketing de la empresa',
    icon: <IconWorld size={22} />, color: 'text-esmeralda bg-green-50',
    href: 'https://sigah.129-121-100-147.sslip.io',
  },
  {
    titulo: 'Monitor de servicios',
    desc: 'Tablero de estado en vivo de todos los servicios del VPS',
    icon: <IconActivityHeartbeat size={22} />, color: 'text-ambar bg-yellow-50',
    href: 'https://monitor.sigah.129-121-100-147.sslip.io',
  },
  {
    titulo: 'OpenClaw AI',
    desc: 'Agente de IA / automatización',
    icon: <IconRobot size={22} />, color: 'text-sigah-blue-dark bg-slate-100',
    href: 'https://usg.tpf.mybluehost.me',
  },
]

interface PanelLink {
  titulo: string
  desc: string
  icon: React.ReactNode
  to: string
}

// Paneles internos de este mismo WebPanel
const PANELES: PanelLink[] = [
  { titulo: 'Dashboard / KPIs',        desc: 'Indicadores en tiempo real',            icon: <IconLayoutDashboard size={20} />,  to: '/panel/dashboard' },
  { titulo: 'Inventario SIGAB',        desc: '751 equipos biomédicos (MySQL en vivo)', icon: <IconStethoscope size={20} />,      to: '/panel/sigab' },
  { titulo: 'Órdenes de servicio',     desc: 'Mantenimientos y atenciones',           icon: <IconClipboardList size={20} />,    to: '/panel/ordenes' },
  { titulo: 'Mantenimiento + IA',      desc: 'Calendario y señales predictivas',      icon: <IconCalendarStats size={20} />,    to: '/panel/mantenimientos' },
  { titulo: 'Monitor (interno)',       desc: 'Probes de servicios y recursos',        icon: <IconActivityHeartbeat size={20} />, to: '/panel/monitor' },
  { titulo: 'Terminal Claude Code',    desc: 'Consola de desarrollo',                 icon: <IconTerminal2 size={20} />,        to: '/panel/terminal' },
  { titulo: 'Agentes & Servicios',     desc: 'Estado de IA y equipos de trabajo',     icon: <IconRobot size={20} />,            to: '/panel/agentes' },
  { titulo: 'Tokens API',              desc: 'Credenciales y accesos',                icon: <IconKey size={20} />,              to: '/panel/tokens' },
  { titulo: 'Cerebro / Obsidian',      desc: 'Base de conocimiento por equipo',       icon: <IconBrain size={20} />,            to: '/panel/cerebro' },
]

export default function HubPage() {
  const { user } = useAuth()
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="font-sans font-medium text-2xl text-sigah-blue-dark">
          {saludo}, {user?.nombre?.split(' ')[0] ?? ''}
        </h1>
        <p className="font-data font-normal text-sm text-slate-500 mt-1">
          Centro de control SIGAH — accede a todas tus aplicaciones y paneles desde un solo lugar
        </p>
      </div>

      {/* Aplicaciones (externas) */}
      <section>
        <h2 className="font-sans font-medium text-sm text-slate-700 mb-3">Aplicaciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {APPS.map(app => (
            <a
              key={app.href}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl card-border p-5 flex items-start gap-4 hover:shadow-md hover:border-sigah-blue/40 transition-all"
            >
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${app.color}`}>
                {app.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-sans font-medium text-sm text-slate-800">{app.titulo}</p>
                  <IconExternalLink size={13} className="text-slate-300 group-hover:text-sigah-blue transition-colors" />
                </div>
                <p className="font-data font-normal text-xs text-slate-500 mt-0.5">{app.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Paneles internos */}
      <section>
        <h2 className="font-sans font-medium text-sm text-slate-700 mb-3">Paneles del WebPanel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PANELES.map(p => (
            <Link
              key={p.to}
              to={p.to}
              className="group bg-white rounded-xl card-border p-4 hover:shadow-md hover:border-sigah-blue/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sigah-blue">{p.icon}</span>
                <IconArrowRight size={15} className="text-slate-300 group-hover:text-sigah-blue group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-sans font-medium text-sm text-slate-800 mt-3">{p.titulo}</p>
              <p className="font-data font-normal text-xs text-slate-400 mt-0.5">{p.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
