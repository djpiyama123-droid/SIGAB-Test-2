// ============================================================
// HospitalMap.jsx — Mapa Interactivo de Activos Biomédicos
// SIGAB — Hospital General Regional No. 1 IMSS Tijuana
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
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
function EquipmentDot({ equipo, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const status = STATUS_CONFIG[equipo.estado] || STATUS_CONFIG.baja;
  const Icon = EQUIPMENT_ICONS[equipo.tipo_equipo] || EQUIPMENT_ICONS.otro;

  return (
    <div
      className="absolute group"
      style={{
        left: `calc(${equipo.pos_x}% - 24px)`,
        top:  `calc(${equipo.pos_y}% - 24px)`,
        zIndex: showTooltip ? 50 : 10,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Anillo pulsante para equipos con falla */}
      {status.pulse && (
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ backgroundColor: status.border, transform: 'scale(1.4)' }}
        />
      )}

      {/* Circulo principal del equipo */}
      <div
        className="relative w-12 h-12 rounded-full cursor-pointer transition-all duration-200
                   hover:scale-125 hover:z-50 flex items-center justify-center overflow-hidden"
        style={{
          border: `3px solid ${status.border}`,
          backgroundColor: status.bg,
          boxShadow: `0 0 12px ${status.border}55, 0 0 4px ${status.border}`,
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

      {/* Tooltip al hacer hover */}
      {showTooltip && (
        <div
          className="absolute z-[100] w-56 rounded-xl shadow-2xl border border-slate-600/50 overflow-hidden"
          style={{
            bottom: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0f172a',
            backdropFilter: 'blur(20px)',
          }}
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
              onClick={(e) => { e.stopPropagation(); onClick(equipo); }}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600
                         text-white transition-colors"
            >
              Ver Ficha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente: caja de zona hospitalaria
function ZoneBox({ zona, onEquipoClick }) {
  const tieneEquipos = zona.equipos && zona.equipos.length > 0;
  const conFalla = zona.equipos?.some(e => ['fuera_servicio','en_mantenimiento'].includes(e.estado));

  return (
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-300 min-h-[140px]"
      style={{
        backgroundColor: zona.color_bg || '#1e293b',
        border: `1px solid ${conFalla ? '#ef444430' : (zona.color_borde || '#334155')}`,
        boxShadow: conFalla ? '0 0 20px #ef444415' : 'none',
      }}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
          {zona.nombre}
        </span>
        <div className="flex items-center gap-1.5">
          {zona.piso && (
            <span className="text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">
              {zona.piso}
            </span>
          )}
          <span className="text-[10px] font-semibold text-slate-500">
            {zona.total_equipos || 0}
          </span>
        </div>
      </div>

      <div className="relative w-full" style={{ height: tieneEquipos ? '120px' : '80px' }}>
        {!tieneEquipos && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-700 text-xs">Sin equipos registrados</span>
          </div>
        )}
        {zona.equipos?.map(equipo => (
          <EquipmentDot
            key={equipo.id}
            equipo={equipo}
            onClick={onEquipoClick}
          />
        ))}
      </div>
    </div>
  );
}

// ── Panel lateral: Ficha Tecnica del equipo
function FichaTecnica({ equipo, onClose, onAbrirOS, onVerHistorial, onAbrirQR }) {
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

// ── Componente principal: HospitalMap
export default function HospitalMap() {
  const [zonas, setZonas]             = useState([]);
  const [selectedEquipo, setSelected] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [historialEquipo, setHistorialEquipo] = useState(null);
  const [equipoOS, setEquipoOS]               = useState(null);
  const [qrEquipo, setQrEquipo]               = useState(null);
  const eventSourceRef                = useRef(null);
  const toast = useToast();

  const fetchMapa = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/mapa');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setZonas(data.zonas || []);
      setError(null);
    } catch (err) {
      setError('No se pudo cargar el mapa. Verificar que el backend este corriendo.');
      console.error('Error cargando mapa:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapa();

    const sse = new EventSource('/api/dashboard/stream');
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.tipo === 'equipo_update' || payload.tipo === 'nueva_orden') {
          fetchMapa();
        }
      } catch (_) {}
    };

    sse.addEventListener('equipo_update', () => fetchMapa());
    sse.addEventListener('nueva_orden', () => fetchMapa());

    sse.onerror = () => {
      setTimeout(fetchMapa, 5000);
    };

    return () => {
      sse.close();
    };
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
        <span>&#9888;</span>
        <span>{error}</span>
        <button onClick={fetchMapa} className="ml-auto text-xs underline hover:no-underline">
          Reintentar
        </button>
      </div>
    );
  }

  const handleAbrirOS = (equipo) => {
    setEquipoOS(equipo);
  };

  const handleVerHistorial = (equipo) => {
    setHistorialEquipo(equipo);
  };

  const handleOSCreada = (numero) => {
    toast.success(`Orden ${numero} creada`);
    setEquipoOS(null);
    fetchMapa();
  };

  return (
    <>
      {selectedEquipo && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <FichaTecnica
            equipo={selectedEquipo}
            onClose={() => setSelected(null)}
            onAbrirOS={handleAbrirOS}
            onVerHistorial={handleVerHistorial}
            onAbrirQR={(eq) => setQrEquipo(eq)}
          />
        </>
      )}

      {historialEquipo && (
        <HistorialEquipoModal
          equipo={historialEquipo}
          onClose={() => setHistorialEquipo(null)}
        />
      )}

      {equipoOS && (
        <OrdenServicioRapidaModal
          equipo={equipoOS}
          onClose={() => setEquipoOS(null)}
          onCreada={handleOSCreada}
        />
      )}

      {qrEquipo && (
        <QRPanel
          equipo={qrEquipo}
          onClose={() => setQrEquipo(null)}
        />
      )}

      <div className="space-y-4">
        {/* Header del mapa */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-blue-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            </div>
            <span className="text-slate-300 text-sm font-semibold">
              Plano HGR #1 — Trazabilidad de Activos
            </span>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(STATUS_CONFIG).slice(0, 3).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.border }} />
                <span className="text-slate-500 text-xs">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de zonas hospitalarias agrupadas por piso */}
        <div className="space-y-6">
          {['Segundo', 'Primero', 'Tercero', null].map(pisoKey => {
            const zonasPiso = zonas.filter(z => z.piso === pisoKey || (pisoKey === null && !z.piso));
            if (zonasPiso.length === 0) return null;

            return (
              <div key={pisoKey || 'otro'} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded bg-blue-500/50" />
                  {pisoKey ? `${pisoKey} Piso` : 'Otras Áreas'}
                </h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                  {zonasPiso.map(zona => (
                    <ZoneBox
                      key={zona.id}
                      zona={zona}
                      onEquipoClick={setSelected}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timestamp de ultima actualizacion */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Mapa actualizado en tiempo real via SSE</span>
          <span className="ml-auto font-mono">
            {new Date().toLocaleTimeString('es-MX')}
          </span>
        </div>
      </div>
    </>
  );
}
