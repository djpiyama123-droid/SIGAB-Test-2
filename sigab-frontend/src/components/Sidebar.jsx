import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../utils/constants';
import * as Lucide from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol === 'superadmin';
  return (
    <aside
      className="h-full w-64 flex flex-col"
      style={{
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="p-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <span className="font-bold text-xs" style={{ color: 'var(--sidebar-text)' }}>S</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--sidebar-text)' }}>
              SIGAB
            </h1>
          </div>
          <p className="text-xs mt-0.5 ml-9" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Activos Biomédicos
          </p>
        </div>
        {/* Botón cerrar — solo en móvil */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            aria-label="Cerrar menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => onClose?.()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={({ isActive }) => ({
              background: isActive ? 'var(--sidebar-active)' : 'transparent',
              color: 'var(--sidebar-text)',
              border: isActive ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
              opacity: isActive ? 1 : 0.8,
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'var(--sidebar-hover)';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              const link = e.currentTarget;
              const isActive = link.getAttribute('aria-current') === 'page';
              if (!isActive) {
                link.style.background = 'transparent';
                link.style.opacity = '0.8';
              }
            }}
          >
            {item.icon_name && Lucide[item.icon_name] ? (
              React.createElement(Lucide[item.icon_name], { className: 'w-4 h-4 flex-shrink-0' })
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            )}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
        {/* ── Sección SIGAH Global — solo superadmin ── */}
        {isSuperAdmin && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
            <p
              className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              SIGAH Global
            </p>
            <NavLink
              to="/admin-global"
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={({ isActive }) => ({
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                color: 'var(--sidebar-text)',
                border: isActive ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                opacity: isActive ? 1 : 0.8,
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'var(--sidebar-hover)';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                const link = e.currentTarget;
                const isActive = link.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  link.style.background = 'transparent';
                  link.style.opacity = '0.8';
                }
              }}
            >
              <Lucide.Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Panel Admin</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="p-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <p className="font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>HGR No. 1 — IMSS Tijuana</p>
          <p className="mt-0.5">v2.0 · On-Premise</p>
        </div>
      </div>
    </aside>
  );
}
