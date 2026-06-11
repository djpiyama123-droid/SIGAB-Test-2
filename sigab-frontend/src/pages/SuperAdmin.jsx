import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  Users, 
  Building2, 
  Terminal, 
  Activity, 
  ShieldAlert, 
  Plus, 
  Cpu, 
  Search, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw, 
  Wifi, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuperAdmin() {
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [tenants, setTenants] = useState([
    { id: 1, slug: 'hgr-1-tijuana', nombre: 'HGR No. 1 IMSS Tijuana', plan: 'Red Metropolitana', estado: 'activo', dbSize: '1.2 GB', reqs: '12.4k' },
    { id: 2, slug: 'hgr-20-tijuana', nombre: 'HGR No. 20 IMSS Tijuana', plan: 'Hospital Singular', estado: 'activo', dbSize: '450 MB', reqs: '3.1k' },
    { id: 3, slug: 'hgp-tijuana', nombre: 'HGP Ginecopediatría Tijuana', plan: 'Hospital Singular', estado: 'suspendido', dbSize: '120 MB', reqs: '0' },
  ]);

  const [nodes, setNodes] = useState([
    { nombre: 'Bluehost VPS Cloud', ip: '129.121.100.147', rol: 'Master Server', estado: 'online', latencia: '14 ms' },
    { nombre: 'ASUS TUF A16', ip: '192.168.1.85', rol: 'Terminal Física Dev', estado: 'online', latencia: '2 ms' },
    { nombre: 'Lenovo ThinkCentre Edge', ip: '10.23.4.112', rol: 'Hospital Edge Node', estado: 'online', latencia: '45 ms' },
  ]);

  const [logs, setLogs] = useState([
    { time: '10:42:15', tenant: 'HGR No. 1', msg: 'Auditoría NOM-016 Quirófano B validada exitosamente.', tipo: 'info' },
    { time: '10:38:02', tenant: 'HGR No. 1', msg: 'Registro de nuevo desfibrilador Mindray D3 por Ing. Gustavo.', tipo: 'success' },
    { time: '10:22:45', tenant: 'HGR No. 20', msg: 'Alerta preventiva: Mantenimiento programado para Rayos X excedido.', tipo: 'warning' },
    { time: '09:15:30', tenant: 'HGP Tijuana', msg: 'Intento de consulta bloqueado: Licencia suspendida.', tipo: 'error' },
  ]);

  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('Hospital Singular');
  const [isAddingTenant, setIsAddingTenant] = useState(false);

  const toggleTenantStatus = (id) => {
    setTenants(tenants.map(t => {
      if (t.id === id) {
        const nuevoEstado = t.estado === 'activo' ? 'suspendido' : 'activo';
        return { ...t, estado: nuevoEstado };
      }
      return t;
    }));
  };

  const handleAddTenant = (e) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug) return;
    const newT = {
      id: tenants.length + 1,
      slug: newTenantSlug.toLowerCase().replace(/\s+/g, '-'),
      nombre: newTenantName,
      plan: newTenantPlan,
      estado: 'activo',
      dbSize: '0 MB',
      reqs: '0'
    };
    setTenants([...tenants, newT]);
    setNewTenantName('');
    setNewTenantSlug('');
    setIsAddingTenant(false);
  };

  const filteredTenants = tenants.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Sidebar / Navigation header */}
      <div className="max-w-7xl mx-auto px-6 py-6 border-b border-slate-900 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">
              SIGAH<span className="text-teal-400 font-extrabold">.mx</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-semibold">SuperAdmin Command Center</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono text-teal-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            Ollama local: Activo
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors border border-slate-800 hover:border-red-900/50 rounded-xl px-4 py-2 bg-slate-900/40"
          >
            <LogOut className="w-4 h-4" /> Salir del Panel
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area: Tenant management */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 text-blue-500/20"><Building2 className="w-10 h-10" /></div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Inquilinos Activos</div>
              <div className="text-3xl font-extrabold text-white">{tenants.filter(t => t.estado === 'activo').length}</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 text-teal-500/20"><Activity className="w-10 h-10" /></div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nodos Conectados</div>
              <div className="text-3xl font-extrabold text-white">{nodes.filter(n => n.estado === 'online').length}</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-4 right-4 text-purple-500/20"><Terminal className="w-10 h-10" /></div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Peticiones Totales (Hoy)</div>
              <div className="text-3xl font-extrabold text-white">15.5k</div>
            </div>
          </div>

          {/* Tenants Section */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 md:p-8 backdrop-blur-sm relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Gestión de Inquilinos</h2>
                <p className="text-slate-400 text-xs mt-1">Hospitales y centros de salud registrados en la plataforma.</p>
              </div>

              <button 
                onClick={() => setIsAddingTenant(!isAddingTenant)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-500/10"
              >
                <Plus className="w-4 h-4" /> Registrar Hospital
              </button>
            </div>

            {/* Add Tenant Form modal / section */}
            {isAddingTenant && (
              <motion.form 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAddTenant}
                className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 mb-8 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Nuevo Registro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="Hospital de Especialidades No. 2"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-teal-400 rounded-xl text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Slug (Identificador en URL)</label>
                    <input 
                      type="text" 
                      placeholder="hgr-2-tijuana"
                      value={newTenantSlug}
                      onChange={(e) => setNewTenantSlug(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-teal-400 rounded-xl text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan SaaS</span>
                    <select 
                      value={newTenantPlan} 
                      onChange={(e) => setNewTenantPlan(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs focus:outline-none focus:border-teal-400"
                    >
                      <option value="Hospital Singular">Hospital Singular</option>
                      <option value="Red Metropolitana">Red Metropolitana</option>
                      <option value="Gubernamental Custom">Gubernamental Custom</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingTenant(false)} 
                      className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/10"
                    >
                      Registrar
                    </button>
                  </div>
                </div>
              </motion.form>
            )}

            {/* Filter Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar por hospital o slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 focus:border-teal-400/50 rounded-xl text-xs focus:outline-none transition-colors"
              />
            </div>

            {/* Tenants Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    <th className="pb-3">Nombre / ID</th>
                    <th className="pb-3">Subdominio / Slug</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Base Datos</th>
                    <th className="pb-3 text-right">Estado / Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs">
                  {filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/10 transition-colors group">
                      <td className="py-4">
                        <div className="font-bold text-slate-200">{t.nombre}</div>
                        <div className="text-[10px] font-mono text-slate-500">ID: #{t.id}</div>
                      </td>
                      <td className="py-4 font-mono text-slate-400">{t.slug}.sigah.mx</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.plan === 'Red Metropolitana' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-slate-400">{t.dbSize}</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.estado === 'activo' ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.estado}
                          </span>
                          <button 
                            onClick={() => toggleTenantStatus(t.id)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {t.estado === 'activo' ? (
                              <ToggleRight className="w-5 h-5 text-teal-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Sidebar Panel: Multi-Node status & logs */}
        <div className="space-y-8">
          
          {/* Health & Topology */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-teal-400" /> Topología y Nodos
              </h2>
              <button className="text-slate-500 hover:text-white transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {nodes.map((n, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{n.nombre}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{n.ip} • {n.rol}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-400 font-bold bg-teal-500/5 px-2 py-0.5 rounded-full border border-teal-500/20">
                      <Wifi className="w-3 h-3 text-teal-400" /> {n.latencia}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-6 backdrop-blur-sm">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
              <ShieldAlert className="w-4 h-4 text-teal-400" /> Auditoría NOM-016 Global
            </h2>

            <div className="space-y-4 font-mono text-[10px] max-h-[300px] overflow-y-auto pr-2 divide-y divide-slate-900">
              {logs.map((log, idx) => (
                <div key={idx} className="pt-3 first:pt-0">
                  <div className="flex justify-between text-slate-500 font-semibold mb-1">
                    <span>{log.time} • Tenant: {log.tenant}</span>
                    <span className={`uppercase font-bold ${
                      log.tipo === 'success' ? 'text-teal-400' :
                      log.tipo === 'warning' ? 'text-yellow-400' :
                      log.tipo === 'error' ? 'text-red-400' : 'text-blue-400'
                    }`}>{log.tipo}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{log.msg}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
