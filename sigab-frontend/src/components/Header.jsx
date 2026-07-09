import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/sigah';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const THEMES = [
  { id: 'glass', color: '#22D3EE', label: 'Glass (Clinical Precision)' },
  { id: 'blue',  color: '#006CB7', label: 'Azul IMSS (claro)' },
  { id: 'green', color: '#047857', label: 'Verde-Blanco IMSS (claro)' },
];

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const cargar = () =>
      api.getAlertasPendientes()
        .then((r) => setAlertCount(r?.total ?? r?.alertas?.length ?? 0))
        .catch(() => {});

    cargar();
    const interval = setInterval(cargar, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 gap-4"
      style={{
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        color: 'var(--header-text)',
      }}
    >
      {/* ── Botón hamburguesa (solo móvil) ── */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0"
        style={{ color: 'var(--header-muted)' }}
        aria-label="Abrir menú"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── Nombre hospital (oculto en xs) ── */}
      <div className="hidden sm:block text-sm truncate flex-1 min-w-0" style={{ color: 'var(--header-muted)' }}>
        IMSS 1 Clínica General Tijuana
      </div>

      {/* ── Acciones derecha ── */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">

        {/* ── Toggle de Tema — 3 círculos ── */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl" style={{ background: 'var(--content-bg, #F1F5F9)' }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.label}
              aria-label={`Tema ${t.label}`}
              className="rounded-full transition-all duration-200 flex-shrink-0"
              style={{
                width: theme === t.id ? '18px' : '14px',
                height: theme === t.id ? '18px' : '14px',
                background: t.color,
                boxShadow: theme === t.id
                  ? `0 0 0 2px var(--header-bg), 0 0 0 4px ${t.color}`
                  : 'none',
                opacity: theme === t.id ? 1 : 0.6,
              }}
            />
          ))}
        </div>

        {/* Alertas */}
        <button
          type="button"
          aria-label="Ver alertas"
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: 'var(--header-muted)' }}
          onClick={() => navigate('/alertas')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Usuario */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-medium leading-none" style={{ color: 'var(--header-text)' }}>
            {user?.nombre || 'Usuario'}
          </span>
          <span className="text-xs capitalize mt-0.5" style={{ color: 'var(--header-muted)' }}>
            {user?.rol?.replace('_', ' ') || ''}
          </span>
        </div>

        {/* Salir */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
          title="Cerrar sesión"
        >
          Salir
        </button>

        {/* Status online */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          En línea
        </span>
      </div>
    </header>
  );
}
