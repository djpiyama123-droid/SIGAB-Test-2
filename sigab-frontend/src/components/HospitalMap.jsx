// ============================================================
// HospitalMap.jsx — Mapa Interactivo de Activos Biomédicos
// SIGAB — Hospital General Regional No. 1 IMSS Tijuana
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import HistorialEquipoModal from './HistorialEquipoModal';
import OrdenServicioRapidaModal from './OrdenServicioRapidaModal';
import QRPanel from './QRPanel';

// ── Iconos SVG por tipo de equipo (inline, sin dependencia externa)
const EQUIPMENT_ICONS = {
  monitor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
      <path d="M6 8l2 3 3-5 2 4 2-2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ventilador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  arco_c: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M8 3C5 3 3 5.5 3 8v8c0 2.5 2 5 5 5h3"/>
      <path d="M16 21c3 0 5-2.5 5-5V8c0-2.5-2-5-5-5h-3"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M10 12H3M21 12h-7"/>
    </svg>
  ),
  anestesia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M8 6h8M8 10h8M8 14h5"/>
      <circle cx="17" cy="17" r="3"/>
      <path d="M15.5 17h3M17 15.5v3"/>
    </svg>
  ),
  incubadora: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="8" width="20" height="12" rx="3"/>
      <circle cx="12" cy="14" r="3"/>
      <path d="M8 8V6a4 4 0 018 0v2"/>
      <path d="M6 20v2M18 20v2"/>
    </svg>
  ),
  desfibrilador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M22 12h-6l-2 4-4-8-2 4H2"/>
      <path d="M9 3l3 5 3-5"/>
    </svg>
  ),
  bomba_infusion: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="7" y="2" width="10" height="6" rx="1"/>
      <path d="M12 8v4M8 12H6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2"/>
      <circle cx="12" cy="16" r="2"/>
    </svg>
  ),
  rayos_x: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/>
      <path d="M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  ultrasonido: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 9a3 3 0 106 0 3 3 0 00-6 0"/>
      <path d="M6 6a6 6 0 1012 0M3 3a9 9 0 0118 0"/>
      <path d="M12 12v9M9 21h6"/>
    </svg>
  ),
  autoclave: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="6" width="18" height="14" rx="2"/>
      <path d="M3 10h18M7 6V4M12 6V3M17 6V4"/>
      <circle cx="12" cy="15" r="2"/>
    </svg>
  ),
  laboratorio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 3v11l-4 5h14l-4-5V3"/>
      <path d="M9 3h6M7 16h10"/>
    </svg>
  ),
  electrocardiografo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M22 12h-6l-2 4-4-8-2 4H2"/>
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  ),
  otro: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 12h6M9 15h4"/>
    </svg>
  ),
};

// ── Colores de estado
const STATUS_CONFIG = {
  operativo:        { border: '#22c55e', bg: '#166534', pulse: false, label: 'Operativo' },
  en_mantenimiento: { border: '#f59e0b', bg: '#78350f', pulse: true,  label: 'En Mantenimiento' },
  fuera_servicio:   { border: '#ef4444', bg: '#7f1d1d', pulse: true,  label: 'Fuera de Servicio' },
  en_traslado:      { border: '#8b5cf6', bg: '#4c1d95', pulse: false, label: 'En Traslado' },
  baja:             { border: '#475569', bg: '#1e293b', pulse: false, label: 'Baja' },
};

const CRITICIDAD_CONFIG = {
  alta:  { badge: 'bg-red-900/50 text-red-300 border border-red-700',   label: 'Alto Riesgo' },
  media: { badge: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700', label: 'Riesgo Medio' },
  baja:  { badge: 'bg-slate-700 text-slate-300 border border-slate-600', label: 'Riesgo Bajo' },
};

// ── Componente: punto de equipo individual en el mapa
// mode="flow" (default) → se renderiza dentro de un grid auto-adjustable
// mode="absolute" → usa pos_x/pos_y (layout legacy, conservado por compatibilidad)
const EquipmentDot = React.memo(function EquipmentDot({ equipo, onClick, mode = 'flow' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0, align: 'center' });
  const dotRef = React.useRef(null);

  const status = STATUS_CONFIG[equipo.estado] || STATUS_CONFIG.baja;
  const Icon = EQUIPMENT_ICONS[equipo.tipo_equipo] || EQUIPMENT_ICONS.otro;

  const handleMouseEnter = useCallback(() => {
    if (dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const TOOLTIP_W = 256; // w-64

      let x, align;
      if (vw - rect.right < TOOLTIP_W + 10) {
        x = rect.right;
        align = 'right';
      } else if (rect.left < TOOLTIP_W + 10) {
        x = rect.left;
        align = 'left';
      } else {
        x = rect.left + rect.width / 2;
        align = 'center';
      }
      setTooltipCoords({ x, y: rect.top, align });
    }
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => setShowTooltip(false), []);

  // Hide tooltip while the scroll container scrolls (tooltip is detached from DOM flow)
  useEffect(() => {
    if (!showTooltip) return;
    const hide = () => setShowTooltip(false);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [showTooltip]);

  const wrapperStyle = mode === 'absolute'
    ? {
        position: 'absolute',
        left: `calc(${equipo.pos_x ?? 50}% - 24px)`,
        top:  `calc(${equipo.pos_y ?? 50}% - 24px)`,
        zIndex: 10,
      }
    : {
        position: 'relative',
        zIndex: 1,
      };

  const getTooltipFixedStyle = () => {
    const { x, y, align } = tooltipCoords;
    const GAP = 10;
    const base = {
      position: 'fixed',
      bottom: `${window.innerHeight - y + GAP}px`,
      zIndex: 9999,
      backgroundColor: '#0f172a',
      backdropFilter: 'blur(12px)',
    };
    if (align === 'right') return { ...base, right: `${window.innerWidth - x}px` };
    if (align === 'left')  return { ...base, left: `${x}px` };
    return { ...base, left: `${x}px`, transform: 'translateX(-50%)' };
  };

  const tooltipPortal = showTooltip ? ReactDOM.createPortal(
    <div
      className="w-64 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-600/50 overflow-hidden"
      style={getTooltipFixedStyle()}
    >
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.border }} />
          <span className="text-xs font-medium" style={{ color: status.border }}>
            {status.label}
          </span>
        </div>
        <p className="text-white text-sm font-semibold leading-tight">{equipo.nombre}</p>
        <p className="text-slate-400 text-xs">{equipo.marca} {equipo.modelo}</p>
      </div>

      <div className="p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Serie</span>
          <span className="text-slate-300 font-mono">{equipo.serie}</span>
        </div>
        {equipo.clase_cofepris && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">COFEPRIS</span>
            <span className="text-purple-400 font-semibold">Clase {equipo.clase_cofepris}</span>
          </div>
        )}
        {equipo.fecha_proximo_mantenimiento && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Prox. Mant.</span>
            <span className={`font-medium ${
              new Date(equipo.fecha_proximo_mantenimiento) < new Date()
                ? 'text-red-400' : 'text-slate-300'
            }`}>
              {new Date(equipo.fecha_proximo_mantenimiento).toLocaleDateString('es-MX')}
            </span>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-slate-700 flex gap-1">
        <button
          onMouseDown={(e) => { e.stopPropagation(); onClick(equipo); }}
          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600
                     text-white transition-colors pointer-events-auto"
        >
          Ver Ficha
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={dotRef}
      className="group"
      style={wrapperStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Anillo pulsante para equipos con falla */}
      {status.pulse && (
        <div
          className="absolute inset-0 rounded-full animate-pulse opacity-30 pointer-events-none"
          style={{ backgroundColor: status.border, transform: 'scale(1.2)' }}
        />
      )}

      {/* Circulo principal del equipo */}
      <div
        className="relative w-12 h-12 rounded-full cursor-pointer transition-all duration-200
                   hover:scale-125 flex items-center justify-center overflow-hidden"
        style={{
          border: `3px solid ${status.border}`,
          backgroundColor: status.bg,
          boxShadow: `0 0 8px ${status.border}44`,
          willChange: 'transform',
        }}
        onClick={() => onClick(equipo)}
      >
        {equipo.imagen_url ? (
          <img
            src={equipo.imagen_url}
            alt={equipo.nombre}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}

        <div
          className="absolute inset-0 flex items-center justify-center p-2.5"
          style={{
            display: equipo.imagen_url ? 'none' : 'flex',
            color: status.border,
          }}
        >
          {Icon}
        </div>
      </div>

      {tooltipPortal}
    </div>
  );
});

// ── Componente: caja de zona hospitalaria
// El contenedor crece de forma automática según la cantidad de equipos (grid auto-wrap).
// Además muestra un micro-resumen por estado (operativo / mant. / fuera).
function ZoneBox({ zona, onEquipoClick }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Una vez visible, lo mantenemos (o podemos hacerlo dinámico)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const equipos = zona.equipos || [];
  const tieneEquipos = equipos.length > 0;
  const conFalla = equipos.some(e => ['fuera_servicio', 'en_mantenimiento'].includes(e.estado));

  // Contadores por estado (para el mini-resumen de la zona)
  const counts = equipos.reduce((acc, e) => {
    acc[e.estado] = (acc[e.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-visible transition-shadow duration-200 flex flex-col h-fit"
      style={{
        backgroundColor: zona.color_bg || '#1e293b',
        border: `1px solid ${conFalla ? '#ef444440' : (zona.color_borde || '#334155')}`,
        boxShadow: conFalla ? '0 0 15px #ef444410' : 'none',
      }}
    >
      {/* Header de la zona */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase truncate">
          {zona.nombre}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {zona.piso && (
            <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
              {zona.piso}
            </span>
          )}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: conFalla ? '#7f1d1d' : '#0f172a',
              color: conFalla ? '#fca5a5' : '#cbd5e1',
            }}
            title={`${equipos.length} equipos en la zona`}
          >
            {equipos.length}
          </span>
        </div>
      </div>

      {/* Mini-resumen por estado */}
      {tieneEquipos && (
        <div className="flex items-center gap-2 px-3 pb-1.5 text-[9px] font-medium">
          {counts.operativo > 0 && (
            <span className="text-emerald-400">● {counts.operativo} OK</span>
          )}
          {counts.en_mantenimiento > 0 && (
            <span className="text-amber-400">● {counts.en_mantenimiento} Mant.</span>
          )}
          {counts.fuera_servicio > 0 && (
            <span className="text-red-400">● {counts.fuera_servicio} Fuera</span>
          )}
          {counts.en_traslado > 0 && (
            <span className="text-purple-400">● {counts.en_traslado} Trasl.</span>
          )}
        </div>
      )}

      {/* Cuerpo: grid auto-adjustable — el contenedor crece con la cantidad de equipos */}
      <div className="px-3 pb-3 pt-1 flex-1 overflow-visible">
        {!tieneEquipos ? (
          <div className="flex items-center justify-center py-4">
            <span className="text-slate-600 text-[10px] italic">Sin equipos</span>
          </div>
        ) : !isVisible ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-4 h-4 border-2 border-slate-700 border-t-slate-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className="grid gap-2 map-zone-container"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
              rowGap: '8px',
              overflow: 'visible',
            }}
          >
            {equipos.map(equipo => (
              <div
                key={equipo.id}
                className="flex items-center justify-center min-h-[44px]"
              >
                <EquipmentDot
                  equipo={equipo}
                  onClick={onEquipoClick}
                  mode="flow"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel lateral: Ficha Tecnica del equipo
function FichaTecnica({ equipo, onClose, onAbrirOS, onVerHistorial, onAbrirQR, onAccionRapida, onProgramarPreventivo }) {
  if (!equipo) return null;

  const status = STATUS_CONFIG[equipo.estado] || STATUS_CONFIG.baja;
  const criticidad = CRITICIDAD_CONFIG[equipo.criticidad] || CRITICIDAD_CONFIG.baja;
  const mantenimientoVencido = equipo.fecha_proximo_mantenimiento &&
    new Date(equipo.fecha_proximo_mantenimiento) < new Date();

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 shadow-2xl flex flex-col"
         style={{ backgroundColor: '#0f172a', borderLeft: '1px solid #1e293b' }}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h3 className="text-white font-semibold text-sm">Ficha Tecnica</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors w-7 h-7 flex items-center
                     justify-center rounded-lg hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative bg-slate-800/50 mx-4 mt-4 rounded-xl overflow-hidden h-36 flex items-center justify-center">
          {equipo.imagen_url ? (
            <img src={equipo.imagen_url} alt={equipo.nombre}
                 className="w-full h-full object-contain p-4" />
          ) : (
            <div className="w-16 h-16 opacity-30 text-slate-400">
              {EQUIPMENT_ICONS[equipo.tipo_equipo] || EQUIPMENT_ICONS.otro}
            </div>
          )}
          {equipo.criticidad === 'alta' && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold
                           px-2 py-0.5 rounded-full uppercase tracking-wider">
              Alto Riesgo
            </div>
          )}
        </div>

        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                 style={{ backgroundColor: status.border }} />
            <span className="text-xs font-medium" style={{ color: status.border }}>
              {status.label}
            </span>
          </div>
          <h2 className="text-white text-base font-bold leading-snug">{equipo.nombre}</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {equipo.inventario ? `HGR1-${equipo.inventario}` : equipo.serie}
          </p>
        </div>

        <div className="px-4 py-3 space-y-2.5">
          {[
            { label: 'Marca',  value: equipo.marca },
            { label: 'Modelo', value: equipo.modelo },
            { label: 'N\u00b0 Serie', value: equipo.serie, mono: true },
          ].map(({ label, value, mono }) => value ? (
            <div key={label} className="flex justify-between items-start gap-4">
              <span className="text-slate-500 text-xs flex-shrink-0">{label}</span>
              <span className={`text-slate-200 text-xs text-right ${mono ? 'font-mono' : 'font-medium'}`}>
                {value}
              </span>
            </div>
          ) : null)}
        </div>

        <div className="mx-4 border-t border-slate-800 pt-3 pb-2 space-y-2.5">
          {equipo.clase_cofepris && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase tracking-widest">Clase COFEPRIS</span>
              <span className="bg-purple-900/50 text-purple-300 border border-purple-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                Clase {equipo.clase_cofepris}
              </span>
            </div>
          )}
          {equipo.criticidad && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase tracking-widest">Riesgo</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${criticidad.badge}`}>
                {criticidad.label}
              </span>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-slate-800 pt-3 pb-2 space-y-2.5">
          {equipo.fecha_compra && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Fecha Compra</span>
              <span className="text-slate-300">
                {new Date(equipo.fecha_compra).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
          {equipo.fecha_ultimo_mantenimiento && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Ultimo Mant.</span>
              <span className="text-slate-300">
                {new Date(equipo.fecha_ultimo_mantenimiento).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
          {equipo.fecha_proximo_mantenimiento && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Prox. Mant.</span>
              <span className={mantenimientoVencido ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                {new Date(equipo.fecha_proximo_mantenimiento).toLocaleDateString('es-MX')}
                {mantenimientoVencido && ' \u26a0'}
              </span>
            </div>
          )}
        </div>

        {(equipo.area || equipo.piso) && (
          <div className="mx-4 border-t border-slate-800 pt-3 pb-4">
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <p className="text-[10px] text-blue-400 uppercase tracking-widest font-medium mb-0.5">
                  Ubicacion
                </p>
                <p className="text-white text-xs font-semibold">{equipo.area}</p>
                {equipo.piso && (
                  <p className="text-slate-400 text-xs">{equipo.piso}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => onAbrirOS?.(equipo)}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all
                     bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          Abrir Orden de Servicio
        </button>

        {/* Acción rápida: ir a la OS abierta del equipo (si existe) */}
        <button
          type="button"
          onClick={() => onAccionRapida?.(equipo)}
          className="w-full py-2 rounded-xl font-medium text-xs transition-all
                     bg-amber-800/40 hover:bg-amber-700/50 text-amber-300 border border-amber-700/50
                     flex items-center justify-center gap-2"
        >
          ⚡ Acción Rápida (OS abierta del equipo)
        </button>

        {/* Programar preventivo desde aquí */}
        <button
          type="button"
          onClick={() => onProgramarPreventivo?.(equipo)}
          className="w-full py-2 rounded-xl font-medium text-xs transition-all
                     bg-blue-800/40 hover:bg-blue-700/50 text-blue-300 border border-blue-700/50
                     flex items-center justify-center gap-2"
        >
          📅 Programar Mantenimiento Preventivo
        </button>

        <button
          type="button"
          onClick={() => onVerHistorial?.(equipo)}
          className="w-full py-2 rounded-xl font-medium text-xs transition-all
                     bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          Ver Historial Completo
        </button>
        <button
          type="button"
          onClick={() => onAbrirQR?.(equipo)}
          className="w-full py-2 rounded-xl font-medium text-xs transition-all
                     bg-emerald-800/40 hover:bg-emerald-700/50 text-emerald-300 border border-emerald-700/50"
        >
          📱 Generar QR / Etiqueta
        </button>
      </div>
    </div>
  );
}

// ── Orden canónico de pisos
const ORDEN_PISOS = ['Sótano', '1er Piso', '2do Piso', '3er Piso', '4to Piso'];

// ── Componente principal: HospitalMap
export default function HospitalMap() {
  const [zonas, setZonas]             = useState([]);
  const [selectedEquipo, setSelected] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [historialEquipo, setHistorialEquipo] = useState(null);
  const [equipoOS, setEquipoOS]               = useState(null);
  const [qrEquipo, setQrEquipo]               = useState(null);
  const [accionRapidaLoading, setAccionRapidaLoading] = useState(false);

  // ── Estado de filtros
  const [busqueda, setBusqueda]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pisoActivo, setPisoActivo]   = useState('todos');

  const toast = useToast();
  const navigate = useNavigate();

  const fetchMapa = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/mapa', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setZonas(data.zonas || []);
      setError(null);
    } catch (err) {
      setError('No se pudo cargar el mapa. Verificar que el backend esté corriendo.');
      console.error('Error cargando mapa:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapa();
    const poll = setInterval(fetchMapa, 15000);
    return () => clearInterval(poll);
  }, [fetchMapa]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full mr-3" />
        Cargando mapa de activos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-red-800/50 bg-red-900/20 text-red-400 text-sm">
        <span>⚠</span>
        <span>{error}</span>
        <button onClick={fetchMapa} className="ml-auto text-xs underline hover:no-underline">Reintentar</button>
      </div>
    );
  }

  // ── Derivar lista de pisos reales
  const pisosEnDatos = [
    ...ORDEN_PISOS.filter(p => zonas.some(z => z.piso === p)),
    ...Array.from(new Set(zonas.map(z => z.piso).filter(p => p && !ORDEN_PISOS.includes(p)))),
  ];

  // ── Lógica de filtrado
  const busqLower = busqueda.toLowerCase().trim();
  const zonasFiltradas = zonas
    .filter(zona => pisoActivo === 'todos' || zona.piso === pisoActivo || (!zona.piso && pisoActivo === 'otras'))
    .map(zona => {
      // Filtrar equipos dentro de la zona por búsqueda y estado
      let equiposFiltrados = zona.equipos || [];
      if (filtroEstado) equiposFiltrados = equiposFiltrados.filter(e => e.estado === filtroEstado);
      if (busqLower) {
        equiposFiltrados = equiposFiltrados.filter(e =>
          e.nombre?.toLowerCase().includes(busqLower) ||
          e.serie?.toLowerCase().includes(busqLower) ||
          e.marca?.toLowerCase().includes(busqLower) ||
          zona.nombre?.toLowerCase().includes(busqLower)
        );
      }
      return { ...zona, equipos: equiposFiltrados };
    })
    // Ocultar zonas sin equipos cuando hay filtros activos
    .filter(zona => !busqLower && !filtroEstado ? true : zona.equipos.length > 0);

  const totalEquiposFiltrados = zonasFiltradas.reduce((a, z) => a + z.equipos.length, 0);
  const hayFiltros = busqLower || filtroEstado || pisoActivo !== 'todos';

  const handleAbrirOS = (equipo) => setEquipoOS(equipo);
  const handleVerHistorial = (equipo) => navigate(`/equipos?equipoId=${equipo.id}`);
  const handleOSCreada = (numero) => {
    toast.success(`Orden ${numero} creada`);
    setEquipoOS(null);
    fetchMapa();
  };

  // Acción Rápida: si el equipo tiene OS abierta o en_progreso → navegar a Órdenes con filtro;
  // si no tiene → ir directo al flujo de crear OS rápida.
  const handleAccionRapida = async (equipo) => {
    if (accionRapidaLoading) return;
    setAccionRapidaLoading(true);
    const tid = toast.loading('Buscando OS abiertas del equipo...');
    try {
      // Buscar OS del equipo en estado abierta o en_progreso
      const res = await fetch(`/api/ordenes/?equipo_id=${equipo.id}&estado=abierta&limit=5`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      const abiertas = (data.ordenes || []).filter(o =>
        o.estado === 'abierta' || o.estado === 'en_progreso' || o.estado === 'pendiente_validacion'
      );
      toast.dismiss(tid);
      if (abiertas.length === 0) {
        toast('Sin OS abiertas — abriendo formulario para crear una nueva');
        setEquipoOS(equipo);
      } else if (abiertas.length === 1) {
        // Navegar a Órdenes con la OS abierta seleccionada por query string
        toast.success(`OS ${abiertas[0].numero_orden} encontrada`);
        navigate(`/ordenes?ordenId=${abiertas[0].id}`);
      } else {
        toast.success(`${abiertas.length} OS abiertas para este equipo`);
        navigate(`/ordenes?equipoId=${equipo.id}&estado=abierta`);
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo consultar OS del equipo', { id: tid });
    } finally {
      setAccionRapidaLoading(false);
    }
  };

  // Programar Preventivo: por ahora navega a /preventivos con preset del equipo
  // (UI completa de programación se hará en Fase futura)
  const handleProgramarPreventivo = (equipo) => {
    navigate(`/preventivos?equipoId=${equipo.id}&accion=nuevo`);
  };
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('');
    setPisoActivo('todos');
  };

  return (
    <>
      {selectedEquipo && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <FichaTecnica
            equipo={selectedEquipo}
            onClose={() => setSelected(null)}
            onAbrirOS={handleAbrirOS}
            onVerHistorial={handleVerHistorial}
            onAbrirQR={(eq) => setQrEquipo(eq)}
            onAccionRapida={handleAccionRapida}
            onProgramarPreventivo={handleProgramarPreventivo}
          />
        </>
      )}
      {historialEquipo && <HistorialEquipoModal equipo={historialEquipo} onClose={() => setHistorialEquipo(null)} />}
      {equipoOS && <OrdenServicioRapidaModal equipo={equipoOS} onClose={() => setEquipoOS(null)} onCreada={handleOSCreada} />}
      {qrEquipo && <QRPanel equipo={qrEquipo} onClose={() => setQrEquipo(null)} />}

      <div className="space-y-3">

        {/* ── Barra de filtros ── */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-3">

          {/* Fila 1: búsqueda + estado + limpiar */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar equipo, zona, serie..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filtro por estado */}
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="py-1.5 pl-2.5 pr-6 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>{cfg.label}</option>
              ))}
            </select>

            {/* Leyenda de estados */}
            <div className="hidden md:flex items-center gap-3 ml-2">
              {Object.entries(STATUS_CONFIG).slice(0, 3).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFiltroEstado(filtroEstado === key ? '' : key)}
                  className={`flex items-center gap-1 text-[10px] transition-opacity ${filtroEstado && filtroEstado !== key ? 'opacity-30' : ''}`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.border }} />
                  <span className="text-slate-400">{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* Limpiar filtros */}
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Limpiar
              </button>
            )}
          </div>

          {/* Fila 2: tabs de piso */}
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            <button
              onClick={() => setPisoActivo('todos')}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                pisoActivo === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Todos los pisos
              <span className="ml-1.5 text-[10px] opacity-70">
                ({zonas.reduce((a, z) => a + (z.equipos?.length || 0), 0)})
              </span>
            </button>

            {pisosEnDatos.map(piso => {
              const equiposPiso = zonas.filter(z => z.piso === piso).reduce((a, z) => a + (z.equipos?.length || 0), 0);
              return (
                <button
                  key={piso}
                  onClick={() => setPisoActivo(piso)}
                  className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    pisoActivo === piso
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {piso}
                  <span className="ml-1.5 text-[10px] opacity-70">({equiposPiso})</span>
                </button>
              );
            })}

            {zonas.some(z => !z.piso) && (
              <button
                onClick={() => setPisoActivo('otras')}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  pisoActivo === 'otras'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Otras áreas
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({zonas.filter(z => !z.piso).reduce((a, z) => a + (z.equipos?.length || 0), 0)})
                </span>
              </button>
            )}
          </div>

          {/* Contador de resultados cuando hay filtros */}
          {hayFiltros && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Mostrando {totalEquiposFiltrados} equipo{totalEquiposFiltrados !== 1 ? 's' : ''} en {zonasFiltradas.length} zona{zonasFiltradas.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* ── Contenedor de zonas con altura fija y scroll ── */}
        <div
          className="overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/20 p-1 custom-scrollbar"
          style={{ maxHeight: '600px', overflowY: 'auto' }}
        >
          {zonasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
              <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 6a8 8 0 100 16 8 8 0 000-16z"/>
              </svg>
              <span className="text-sm">Sin resultados para los filtros aplicados</span>
              <button onClick={limpiarFiltros} className="text-xs text-blue-400 hover:text-blue-300 underline">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Agrupar las zonas filtradas por piso */}
              {(() => {
                // Si hay un piso seleccionado, mostrar zonas sin encabezado de piso
                if (pisoActivo !== 'todos') {
                  return (
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                      {zonasFiltradas.map(zona => (
                        <ZoneBox key={zona.id} zona={zona} onEquipoClick={setSelected} />
                      ))}
                    </div>
                  );
                }

                // Vista "todos": agrupar por piso
                const pisosPresentes = [
                  ...ORDEN_PISOS.filter(p => zonasFiltradas.some(z => z.piso === p)),
                  ...Array.from(new Set(zonasFiltradas.map(z => z.piso).filter(p => p && !ORDEN_PISOS.includes(p)))),
                ];
                const groups = [
                  ...pisosPresentes.map(p => ({ key: p, label: p, zonas: zonasFiltradas.filter(z => z.piso === p) })),
                  ...(zonasFiltradas.some(z => !z.piso) ? [{ key: 'otras', label: 'Otras Áreas', zonas: zonasFiltradas.filter(z => !z.piso) }] : []),
                ];

                return groups.map(group => (
                  <div key={group.key} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded bg-blue-500/60" />
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        {group.label}
                      </span>
                      <span className="text-slate-600 text-[9px] ml-auto">
                        {group.zonas.length} zona{group.zonas.length !== 1 ? 's' : ''} · {group.zonas.reduce((a, z) => a + z.equipos.length, 0)} equipos
                      </span>
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                      {group.zonas.map(zona => (
                        <ZoneBox key={zona.id} zona={zona} onEquipoClick={setSelected} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Actualizado cada 15s</span>
          <span className="ml-auto font-mono">{new Date().toLocaleTimeString('es-MX')}</span>
        </div>
      </div>
    </>
  );
}
