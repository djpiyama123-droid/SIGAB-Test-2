import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChangePasswordModal from './ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import * as Lucide from 'lucide-react';

export default function Layout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Items para la barra inferior (móvil)
  const BOTTOM_NAV = [
    { path: '/', label: 'Inicio', icon: 'LayoutDashboard' },
    { path: '/equipos', label: 'Equipos', icon: 'Cpu' },
    { path: '/ordenes', label: 'Ordenes', icon: 'ClipboardList' },
    { path: '/copilot', label: 'IA', icon: 'BrainCircuit' },
    { path: '/scan', label: 'Escanear', icon: 'QrCode' },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 print:block overflow-hidden">

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
        <main className="flex-1 overflow-auto bg-slate-900 relative print:overflow-visible print:bg-white pb-16 lg:pb-0">
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
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex justify-around items-center px-2 py-1 z-40">
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {Lucide[item.icon] && React.createElement(Lucide[item.icon], { size: 20 })}
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
