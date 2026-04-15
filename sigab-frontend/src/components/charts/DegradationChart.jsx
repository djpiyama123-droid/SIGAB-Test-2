import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { date: '2026-03-12', value: 98 },
  { date: '2026-03-15', value: 95 },
  { date: '2026-03-18', value: 92 },
  { date: '2026-03-22', value: 88 },
  { date: '2026-03-25', value: 85 },
  { date: '2026-03-28', value: 82 },
  { date: '2026-04-01', value: 78 },
  { date: '2026-04-05', value: 75 },
  { date: '2026-04-08', value: 70 },
  { date: '2026-04-11', value: 68 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-xl backdrop-blur-md shadow-2xl">
        <p className="text-slate-400 text-xs mb-1 font-medium">{label}</p>
        <p className="text-emerald-400 font-bold text-sm">
          Salud: <span className="text-white">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DegradationChart({ assetData = data }) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={assetData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => val.split('-').slice(1).join('/')}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
