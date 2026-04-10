import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

const COLORS = {
  operativo: '#10b981', // emerald-500
  en_mantenimiento: '#eab308', // yellow-500
  fuera_servicio: '#ef4444', // red-500
  en_traslado: '#8b5cf6', // violet-500
  baja: '#64748b' // slate-500
};

const LABEL_MAP = {
  operativo: 'Operativo',
  en_mantenimiento: 'Mantenimiento',
  fuera_servicio: 'Fuera de Serv.',
  en_traslado: 'Traslado',
  baja: 'Baja'
};

export default function DashboardCharts({ resumen }) {
  if (!resumen) return null;

  const equiposData = (resumen.equipos_por_estado || []).map(item => ({
    name: LABEL_MAP[item.estado] || item.estado,
    value: item.total,
    color: COLORS[item.estado] || '#ffffff'
  }));

  const ordenesData = (resumen.ordenes_por_mes || []).map(item => {
    // Convert 'YYYY-MM' to short month name (e.g. 'Jan')
    const [year, month] = item.mes.split('-');
    const date = new Date(year, parseInt(month) - 1);
    const monthName = date.toLocaleString('es-ES', { month: 'short' });
    return {
      mes: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      Total: item.total
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Equipos por Estado</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={equiposData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {equiposData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                itemStyle={{ color: '#cbd5e1' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Órdenes de Servicio (últimos 6 meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordenesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#1e293b' }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
              />
              <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
