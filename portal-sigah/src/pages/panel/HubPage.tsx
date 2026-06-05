import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconStethoscope, IconClipboardList, IconCalendarStats, IconCircleCheck,
  IconAlertTriangle, IconClockHour4, IconCurrencyDollar, IconDatabase,
  IconLayoutDashboard, IconActivity, IconRobot, IconArrowRight, IconExternalLink,
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { apiFetch } from '../../lib/api'
import { equiposBiomedicos, resumenInventario } from '../../data/equiposBiomedicos'
import { periodoMayo2026, totalCostoUsd, totalTokens, PLAN_SUSCRIPCION } from '../../data/tokenCostReport'

interface Kpis {
  total_equipos: number
  operativos: number
  en_mantenimiento: number
  criticos: number
  ordenes_abiertas: number
  valor_inventario: number
}

const fmtMXN = (n: number | undefined | null) =>
  n != null && !isNaN(Number(n)) ? '$' + Number(n).toLocaleString('es-MX') : '—'

const SIGAB_URL = (import.meta.env.VITE_SIGAB_URL as string | undefined) ?? 'https://sigab.129-121-100-147.sslip.io'

export default function HubPage() {
  const { user, token, isAdmin } = useAuth()
  const navigate = useNavigate()

  const demo = resumenInventario(equiposBiomedicos)
  const fallback: Kpis = {
    total_equipos: demo.total,
    operativos: demo.operativos,
    en_mantenimiento: demo.mantenimiento,
    criticos: demo.criticos + demo.alertas,
    ordenes_abiertas: 3,
    valor_inventario: demo.valor_total,
  }

  const [kpis, setKpis] = useState<Kpis>(fallback)
  const [fuente, setFuente] = useState<'mysql' | 'demo'>('demo')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    apiFetch<Partial<Kpis>>('/api/dashboard/kpis', token)
      .then(d => {
        if (d && typeof d.total_equipos === 'number') {
          setKpis({ ...fallback, ...d } as Kpis)
          setFuente('mysql')
        }
      })
      .catch(() => { /* mantiene fallback demo */ })
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const cards = [
    { label: 'Total equipos',    val: kpis.total_equipos,    icon: <IconStethoscope size={18} />,   color: 'text-sigah-blue' },
    { label: 'Operativos',       val: kpis.operativos,       icon: <IconCircleCheck size={18} />,   color: 'text-esmeralda' },
    { label: 'En mantenimiento', val: kpis.en_mantenimiento, icon: <IconClockHour4 size={18} />,    color: 'text-ambar' },
    { label: 'Críticos / alerta',val: kpis.criticos,         icon: <IconAlertTriangle size={18} />, color: 'text-rojo' },
    { label: 'Órdenes abiertas', val: kpis.ordenes_abiertas, icon: <IconClipboardList size={18} />, color: 'text-sigah-blue' },
  ]

  const modulos: { to: string; label: string; desc: string; icon: React.ReactNode; admin?: boolean }[] = [
    { to: '/panel/sigab',          label: 'Inventario',     desc: 'Activos biomédicos y su estado',   icon: <IconStethoscope size={20} /> },
    { to: '/panel/ordenes',        label: 'Órdenes',        desc: 'Servicios correctivos y su historial', icon: <IconClipboardList size={20} /> },
    { to: '/panel/mantenimientos', label: 'Mantenimientos', desc: 'Calendario de preventivos',        icon: <IconCalendarStats size={20} /> },
    { to: '/panel/dashboard',      label: 'Dashboard',      desc: 'KPIs ejecutivos para Dirección',   icon: <IconLayoutDashboard size={20} />, admin: true },
    { to: '/panel/monitor',        label: 'Monitor',        desc: 'Estado de la infraestructura',     icon: <IconActivity size={20} />,        admin: true },
    { to: '/panel/agentes',        label: 'Agentes IA',     desc: 'Copiloto y análisis predictivo',   icon: <IconRobot size={20} />,           admin: true },
  ]
  const modulosVisibles = modulos.filter(m => !m.admin || isAdmin)

  // Costo IA del mes (snapshot mayo 2026)
  const costoIA = totalCostoUsd(periodoMayo2026)
  const tokIA = totalTokens(periodoMayo2026)
  const totalTokIA = tokIA.input + tokIA.output + tokIA.cacheWrite + tokIA.cacheRead

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">
            Hola, {user?.nombre?.split(' ')[0] || 'usuario'}
          </h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
            Resumen del parque tecnológico · HGR No. 1 IMSS Tijuana
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-data font-normal ${
          fuente === 'mysql' ? 'bg-green-50 text-esmeralda' : 'bg-slate-100 text-slate-500'
        }`}>
          <IconDatabase size={13} />
          {cargando ? 'Cargando…' : fuente === 'mysql' ? `MySQL en vivo · ${kpis.total_equipos} equipos` : 'Datos demo'}
        </span>
      </div>

      {/* KPIs */}
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

      {/* Valor del inventario */}
      <div className="bg-sigah-blue-dark rounded-xl p-5 flex items-center gap-4">
        <div className="p-2.5 bg-white/10 rounded-lg">
          <IconCurrencyDollar size={22} className="text-white" />
        </div>
        <div>
          <p className="font-data font-normal text-xs text-white/60 uppercase tracking-wider">Valor total del inventario gestionado</p>
          <p className="font-sans font-medium text-2xl text-white mt-0.5">
            {fmtMXN(kpis.valor_inventario)} <span className="text-sm font-normal text-white/60">MXN</span>
          </p>
        </div>
      </div>

      {/* Acceso directo a SIGAB producción */}
      <a
        href={SIGAB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-4 bg-sigah-blue rounded-xl px-6 py-4 hover:bg-sigah-blue-dark transition-colors duration-150 group"
      >
        <div>
          <p className="font-sans font-medium text-base text-white">Abrir SIGAB — App hospitalaria</p>
          <p className="font-data font-normal text-xs text-white/70 mt-0.5">
            {SIGAB_URL.replace('https://', '')} · HGR No. 1 IMSS Tijuana
          </p>
        </div>
        <IconExternalLink size={20} className="text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
      </a>

      {/* Costo IA del mes (solo admin) */}
      {isAdmin && (
        <button
          onClick={() => navigate('/panel/tokens')}
          className="w-full text-left bg-white rounded-xl card-border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sigah-blue"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">Costo de tokens IA · Mayo 2026</p>
              <p className="font-sans font-medium text-2xl text-sigah-blue-dark mt-1">
                ${costoIA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm text-slate-400 font-normal"> USD API-equiv.</span>
              </p>
              <p className="font-data font-normal text-xs text-slate-400 mt-0.5">
                {(totalTokIA / 1_000_000).toFixed(0)}M tokens · plan {PLAN_SUSCRIPCION.nombre} ${PLAN_SUSCRIPCION.costoMensualUsd}/mes
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-esmeralda font-data font-medium text-xs">
              {(costoIA / PLAN_SUSCRIPCION.costoMensualUsd).toFixed(0)}× valor vs API
            </span>
          </div>
        </button>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 className="font-sans font-medium text-sm text-slate-600 mb-3">Accesos rápidos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modulosVisibles.map(m => (
            <button
              key={m.to}
              onClick={() => navigate(m.to)}
              className="group text-left bg-white rounded-xl card-border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sigah-blue"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-alt text-sigah-blue">{m.icon}</span>
                <IconArrowRight size={16} className="text-slate-300 group-hover:text-sigah-blue transition-colors" />
              </div>
              <p className="font-sans font-medium text-sm text-slate-800">{m.label}</p>
              <p className="font-data font-normal text-xs text-slate-500 mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
