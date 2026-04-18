import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../utils/constants';
import * as Lucide from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">SIGAB</h1>
        <p className="text-xs text-slate-500 mt-0.5">Gestión de Activos Biomédicos</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            {item.icon_name && Lucide[item.icon_name] ? (
              React.createElement(Lucide[item.icon_name], { className: "w-5 h-5 flex-shrink-0" })
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            )}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-600">
          <p>HGR No. 1 — IMSS Tijuana</p>
          <p className="mt-0.5">v1.0.0 — On-Premise</p>
        </div>
      </div>
    </aside>
  );
}
