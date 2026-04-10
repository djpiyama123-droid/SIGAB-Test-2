import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/sigab';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const { user, logout } = useAuth();

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
    <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6">
      <div className="text-sm text-slate-400">
        Hospital General Regional No. 1 — IMSS Tijuana
      </div>
      <div className="flex items-center gap-4">
        {/* Alertas */}
        <button
          type="button"
          aria-label="Ver alertas"
          className="relative text-slate-400 hover:text-white transition-colors"
          onClick={() => navigate('/alertas')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* Status y Usuario */}
        <div className="flex flex-col items-end mr-4">
          <span className="text-sm font-medium text-slate-200">{user?.nombre || 'Usuario'}</span>
          <span className="text-xs text-slate-400 capitalize">{user?.rol?.replace('_', ' ') || ''}</span>
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-sm text-red-400 hover:text-red-300 transition-colors mr-2"
          title="Cerrar sesión"
        >
          Salir
        </button>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/50 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          En línea
        </span>
      </div>
    </header>
  );
}
