import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChangePasswordModal from './ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import { NAV_ICONS } from '../utils/navIcons';

export default function Layout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const BOTTOM_NAV = [
    { path: '/', label: 'Inicio', icon: 'LayoutDashboard' },
    { path: '/equipos', label: 'Equipos', icon: 'Cpu' },
    { path: '/scan', label: 'Escanear', icon: 'QrCode', central: true },
    { path: '/ordenes', label: 'Ordenes', icon: 'ClipboardList' },
    { path: '/copilot', label: 'IA', icon: 'BrainCircuit' },
  ];

  return (
    <div
      className="flex h-screen print:block overflow-hidden"
      style={{ background: 'var(--content-bg)', color: 'var(--content-text)' }}
    >
      {/* ── Overlay móvil ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[280px] sm:w-64
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        print:hidden shadow-2xl lg:shadow-none
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main
          className="flex-1 overflow-auto relative print:overflow-visible print:bg-white pb-16 lg:pb-0"
          style={{ background: 'var(--content-bg)' }}
        >
          <div className="text-accent-fix h-full">
            <Outlet />
          </div>
          {user?.must_change_password && (
            <ChangePasswordModal
              isOpen={true}
              onClose={() => {}}
              required={true}
            />
          )}
        </main>

        {/* ── Barra de Navegación Inferior (Solo Móvil) ── */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 backdrop-blur-md flex justify-around items-center px-2 py-1 z-40 border-t"
          style={{
            background: 'var(--bottom-nav-bg)',
            borderColor: 'var(--bottom-nav-border)',
          }}
        >
          {BOTTOM_NAV.map((item) =>
            item.central ? (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center -mt-7 transition-transform active:scale-95"
                aria-label={item.label}
              >
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg border-4"
                  style={{ background: 'var(--accent)', borderColor: 'var(--bottom-nav-bg)' }}
                >
                  {NAV_ICONS[item.icon] && React.createElement(NAV_ICONS[item.icon], { size: 24, color: '#fff' })}
                </span>
                <span className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--bottom-nav-muted)' }}>
                  {item.label}
                </span>
              </NavLink>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center gap-1 min-h-[48px] min-w-[48px] p-2 transition-colors"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--bottom-nav-active)' : 'var(--bottom-nav-muted)',
                })}
              >
                {NAV_ICONS[item.icon] && React.createElement(NAV_ICONS[item.icon], { size: 20 })}
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </div>
    </div>
  );
}
