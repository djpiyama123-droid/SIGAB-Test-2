import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../utils/constants';
import * as Lucide from 'lucide-react';

export default function Sidebar({ onClose }) {
  return (
    <aside className="h-full w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      {/* ── Logo ── */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-400 font-bold text-xs">S</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">SIGAB</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 ml-9">Activos Biomédicos</p>
        </div>
        {/* Botón cerrar — solo en móvil */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
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
      </nav>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-medium text-slate-500">HGR No. 1 — IMSS Tijuana</p>
          <p className="mt-0.5">v2.0 · On-Premise</p>
        </div>
      </div>
    </aside>
  );
}
