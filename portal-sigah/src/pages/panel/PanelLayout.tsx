import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconHome2,
  IconLayoutDashboard,
  IconActivityHeartbeat,
  IconStethoscope,
  IconClipboardList,
  IconCalendarStats,
  IconTerminal2,
  IconKey,
  IconBrain,
  IconRobot,
  IconChevronDown,
  IconMenu2,
  IconX,
  IconLogout,
  IconServer,
  IconCpu,
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  children?: { to: string; label: string; icon: React.ReactNode }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/panel/hub',
    label: 'Centro de control',
    icon: <IconHome2 size={18} />,
  },
  {
    to: '/panel/dashboard',
    label: 'Dashboard',
    icon: <IconLayoutDashboard size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/monitor',
    label: 'Monitor SIGAH',
    icon: <IconActivityHeartbeat size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/sigab',
    label: 'SIGAB — Hospitalario',
    icon: <IconStethoscope size={18} />,
  },
  {
    to: '/panel/ordenes',
    label: 'Órdenes de servicio',
    icon: <IconClipboardList size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/mantenimientos',
    label: 'Mantenimiento + IA',
    icon: <IconCalendarStats size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/terminal',
    label: 'Terminal Claude Code',
    icon: <IconTerminal2 size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/agentes',
    label: 'Agentes & Servicios',
    icon: <IconRobot size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/tokens',
    label: 'Costo de tokens IA',
    icon: <IconKey size={18} />,
    adminOnly: true,
  },
  {
    to: '/panel/cerebro',
    label: 'Cerebro / Obsidian',
    icon: <IconBrain size={18} />,
    adminOnly: true,
    children: [
      { to: '/panel/cerebro/asus',    label: 'ASUS TUF A16',       icon: <IconCpu size={15} /> },
      { to: '/panel/cerebro/lenovo',  label: 'Lenovo ThinkCentre', icon: <IconServer size={15} /> },
      { to: '/panel/cerebro/bluehost',label: 'VPS Bluehost',       icon: <IconServer size={15} /> },
    ],
  },
]

function NavItemRow({ item, isAdmin, collapsed }: { item: NavItem; isAdmin: boolean; collapsed: boolean }) {
  const [open, setOpen] = useState(false)

  if (item.adminOnly && !isAdmin) return null

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-bg-alt hover:text-sigah-blue-dark transition-colors text-sm font-data font-normal"
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <IconChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border pl-3">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-data font-normal transition-colors ${
                    isActive
                      ? 'bg-sigah-blue text-white'
                      : 'text-slate-500 hover:bg-bg-alt hover:text-sigah-blue-dark'
                  }`
                }
              >
                {child.icon}
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-data font-normal transition-colors ${
          isActive
            ? 'bg-sigah-blue text-white'
            : 'text-slate-500 hover:bg-bg-alt hover:text-sigah-blue-dark'
        }`
      }
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

export default function PanelLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 bg-sigah-blue rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-sans font-medium text-xs">S</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-sans font-medium text-sigah-blue-dark text-sm" style={{ letterSpacing: '-0.5px' }}>SIGAB</p>
            <p className="font-data font-normal text-xs text-slate-400">WebPanel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavItemRow key={item.to} item={item} isAdmin={isAdmin} collapsed={collapsed} />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-sigah-blue-dark rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-sans font-medium text-xs">
              {(user?.nombre ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-data font-normal text-xs text-slate-700 truncate">{user?.nombre}</p>
              <p className="font-data font-normal text-[10px] text-slate-400 uppercase tracking-wider">{user?.rol}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-slate-400 hover:text-rojo hover:bg-red-50 transition-colors text-sm font-data font-normal"
        >
          <IconLogout size={16} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-bg-principal overflow-hidden">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-white transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
      >
        {/* Toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute left-0 top-5 z-10 ml-2 p-1.5 text-slate-400 hover:text-sigah-blue transition-colors"
          style={{ marginLeft: collapsed ? 52 : 232 }}
        >
          <IconMenu2 size={16} />
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-white border-r border-border z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700"
            >
              <IconX size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-white flex items-center px-4 gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 text-slate-400 hover:text-sigah-blue transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu2 size={20} />
          </button>
          <div className="flex-1" />
          <span className="font-data font-normal text-xs text-slate-400">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
