import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const STATUS_CONFIG = {
  operativo:        { color: '#10b981', bg: '#064e3b', label: 'Operativo', icon: '✓' },
  en_mantenimiento: { color: '#eab308', bg: '#713f12', label: 'En Mantenimiento', icon: '🔧' },
  fuera_servicio:   { color: '#ef4444', bg: '#7f1d1d', label: 'Fuera de Servicio', icon: '⚠' },
  en_traslado:      { color: '#8b5cf6', bg: '#4c1d95', label: 'En Traslado', icon: '🚚' },
  baja:             { color: '#64748b', bg: '#1e293b', label: 'Baja', icon: '✕' },
};

const CRITICIDAD_BADGE = {
  alta:  'bg-red-500/20 text-red-300 border-red-500/40',
  media: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  baja:  'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

export default function EquipoPublico() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`/api/equipos/public/${token}`);
        setData(res.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? 'Equipo no encontrado. El código QR puede ser inválido o el equipo fue dado de baja.'
            : 'Error al cargar la información del equipo.'
        );
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex gap-3 items-center text-slate-400">
          <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Cargando información del equipo...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">📋</div>
          <h1 className="text-xl font-bold text-white">Equipo no encontrado</h1>
          <p className="text-slate-400 text-sm">{error}</p>
          <div className="pt-4 border-t border-slate-800">
            <p className="text-slate-600 text-xs">SIGAB — Hospital General Regional No. 1</p>
            <p className="text-slate-700 text-xs">IMSS Tijuana, B.C.</p>
          </div>
        </div>
      </div>
    );
  }

  const { equipo, ordenes_recientes, preventivos } = data;
  const status = STATUS_CONFIG[equipo.estado] || STATUS_CONFIG.baja;
  const mantenimientoVencido = equipo.fecha_proximo_mantenimiento &&
    new Date(equipo.fecha_proximo_mantenimiento) < new Date();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header institucional */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">S</div>
          <div>
            <div className="text-sm font-semibold text-white">SIGAB</div>
            <div className="text-[10px] text-slate-500">Hospital General Regional No. 1 · IMSS Tijuana</div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Estado Badge Grande */}
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ backgroundColor: status.bg, border: `1px solid ${status.color}40` }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            {equipo.imagen_url ? (
              <img src={equipo.imagen_url} className="w-full h-full object-cover rounded-xl" alt="" />
            ) : (
              status.icon
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{equipo.nombre}</h1>
            <p className="text-sm opacity-70">{equipo.marca} · {equipo.modelo}</p>
            <div className="flex gap-2 mt-1.5">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${status.color}30`, color: status.color }}>
                {status.label}
              </span>
              {equipo.criticidad && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${CRITICIDAD_BADGE[equipo.criticidad]}`}>
                  Riesgo {equipo.criticidad}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Datos Técnicos */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
          <div className="px-4 py-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Datos Técnicos</h2>
          </div>
          {[
            ['N° Serie', equipo.serie],
            ['Tipo', equipo.tipo_equipo?.replace('_', ' ')],
            ['Clase COFEPRIS', equipo.clase_cofepris ? `Clase ${equipo.clase_cofepris}` : null],
            ['Ubicación', [equipo.area, equipo.piso].filter(Boolean).join(' · ')],
            ['Fecha Compra', equipo.fecha_compra ? new Date(equipo.fecha_compra).toLocaleDateString('es-MX') : null],
            ['Proveedor Servicio', equipo.proveedor_servicio],
            ['No. Contrato', equipo.numero_contrato_servicio],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="px-4 py-2.5 flex justify-between items-center">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-sm text-slate-200 font-medium text-right max-w-[55%] truncate">{value}</span>
            </div>
          ))}
        </div>

        {/* Mantenimiento */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
          <div className="px-4 py-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mantenimiento</h2>
          </div>
          <div className="px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-500">Último</span>
            <span className="text-sm text-slate-200">
              {equipo.fecha_ultimo_mantenimiento
                ? new Date(equipo.fecha_ultimo_mantenimiento).toLocaleDateString('es-MX')
                : 'Sin registros'}
            </span>
          </div>
          <div className="px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs text-slate-500">Próximo Programado</span>
            <span className={`text-sm font-semibold ${mantenimientoVencido ? 'text-red-400' : 'text-emerald-400'}`}>
              {equipo.fecha_proximo_mantenimiento
                ? `${new Date(equipo.fecha_proximo_mantenimiento).toLocaleDateString('es-MX')}${mantenimientoVencido ? ' ⚠ VENCIDO' : ''}`
                : 'No programado'}
            </span>
          </div>

          {preventivos.length > 0 && (
            <>
              <div className="px-4 py-2.5">
                <span className="text-xs text-slate-500">Procedimientos Programados:</span>
              </div>
              {preventivos.map((p, i) => (
                <div key={i} className="px-4 py-2 flex justify-between items-start gap-2">
                  <span className="text-xs text-slate-300">{p.tipo_preventivo}</span>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    Cada {p.frecuencia_dias}d · Prox: {p.proxima_ejecucion ? new Date(p.proxima_ejecucion).toLocaleDateString('es-MX') : '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Historial reciente */}
        {ordenes_recientes.length > 0 && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
            <div className="px-4 py-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Últimos Servicios</h2>
            </div>
            {ordenes_recientes.map((os, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  os.estado === 'cerrada' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-slate-400">{os.numero_orden}</span>
                    <span className="text-[10px] text-slate-600">
                      {os.fecha ? new Date(os.fecha).toLocaleDateString('es-MX') : ''}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 capitalize">
                    {os.tipo_mantenimiento} · {os.estado?.replace('_', ' ')}
                  </div>
                  {os.tecnico_nombre && (
                    <div className="text-[10px] text-slate-600 mt-0.5">Técnico: {os.tecnico_nombre}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recursos */}
        {(equipo.manual_url || equipo.video_url) && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 divide-y divide-slate-800">
            <div className="px-4 py-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recursos</h2>
            </div>
            <div className="px-4 py-3 flex gap-3">
              {equipo.manual_url && (
                <a href={equipo.manual_url} target="_blank" rel="noreferrer"
                  className="flex-1 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-semibold text-center hover:bg-blue-600/30 transition-colors border border-blue-600/30">
                  📄 Manual
                </a>
              )}
              {equipo.video_url && (
                <a href={equipo.video_url} target="_blank" rel="noreferrer"
                  className="flex-1 py-2 rounded-lg bg-purple-600/20 text-purple-400 text-xs font-semibold text-center hover:bg-purple-600/30 transition-colors border border-purple-600/30">
                  🎬 Video
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-6 pb-8 space-y-1">
          <p className="text-slate-700 text-xs">Sistema Integral de Gestión de Activos Biomédicos</p>
          <p className="text-slate-800 text-[10px]">Departamento de Conservación y Mantenimiento</p>
          <p className="text-slate-800 text-[10px]">Hospital General Regional No. 1 · IMSS · Tijuana, B.C.</p>
        </div>
      </div>
    </div>
  );
}
