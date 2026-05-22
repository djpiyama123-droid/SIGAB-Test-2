import { useState, useEffect } from 'react';
import { Building2, Activity, Users, Cpu, AlertTriangle, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/sigab';

function HospitalCard({ hospital, onSelect }) {
  const planColor = {
    enterprise: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    premium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    standard: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  }[hospital.plan] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';

  return (
    <div
      onClick={() => onSelect(hospital)}
      className="group bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm leading-tight">{hospital.nombre}</h3>
            {hospital.clave_imss && (
              <p className="text-xs text-slate-500 mt-0.5">{hospital.clave_imss}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${planColor}`}>
          {hospital.plan}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric icon={Cpu} label="Equipos" value={hospital.stats?.total_equipos ?? '—'} />
        <Metric icon={Activity} label="OS abiertas" value={hospital.stats?.tickets_abiertos ?? '—'} />
        <Metric icon={AlertTriangle} label="Alertas" value={hospital.stats?.alertas_pendientes ?? '—'} color="amber" />
        <Metric icon={Users} label="Usuarios" value={hospital.stats?.total_usuarios ?? '—'} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${hospital.activo ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-400">{hospital.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
        <span className="text-xs text-slate-600">{hospital.ciudad}, {hospital.estado}</span>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color = 'slate' }) {
  const colors = {
    amber: 'text-amber-400',
    slate: 'text-slate-300',
  };
  return (
    <div className="bg-slate-800/50 rounded-xl p-2.5 flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${colors[color]} flex-shrink-0`} />
      <div>
        <p className={`text-sm font-semibold ${colors[color]}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function GlobalKPIBar({ hospitales }) {
  const total_equipos = hospitales.reduce((s, h) => s + (h.stats?.total_equipos || 0), 0);
  const total_tickets = hospitales.reduce((s, h) => s + (h.stats?.tickets_abiertos || 0), 0);
  const total_alertas = hospitales.reduce((s, h) => s + (h.stats?.alertas_pendientes || 0), 0);
  const activos = hospitales.filter(h => h.activo).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Hospitales activos', value: activos, icon: Building2, color: 'indigo' },
        { label: 'Equipos totales', value: total_equipos, icon: Cpu, color: 'sky' },
        { label: 'OS abiertas', value: total_tickets, icon: Activity, color: 'emerald' },
        { label: 'Alertas pendientes', value: total_alertas, icon: AlertTriangle, color: 'amber' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className={`w-8 h-8 rounded-xl bg-${color}-500/15 border border-${color}-500/25 flex items-center justify-center mb-2`}>
            <Icon className={`w-4 h-4 text-${color}-400`} />
          </div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const [hospitales, setHospitales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/hospitales/');
      setHospitales(data.hospitales || []);
    } catch (e) {
      setError('No se pudo cargar la lista de hospitales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (user?.rol !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">Acceso restringido</h2>
        <p className="text-sm text-slate-400">Este panel es exclusivo del SuperAdmin SIGAH.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Panel SuperAdmin</h1>
          </div>
          <p className="text-sm text-slate-400">Vista global de todos los hospitales SIGAH</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Nuevo hospital
          </button>
        </div>
      </div>

      {/* KPI Global */}
      {!loading && hospitales.length > 0 && <GlobalKPIBar hospitales={hospitales} />}

      {/* Estado de carga / error */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Cargando hospitales...
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Grid de hospitales */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {hospitales.map(h => (
            <HospitalCard key={h.id} hospital={h} onSelect={setSelected} />
          ))}
          {hospitales.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No hay hospitales registrados aún.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
