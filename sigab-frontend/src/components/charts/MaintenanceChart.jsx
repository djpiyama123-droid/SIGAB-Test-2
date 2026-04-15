import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const data = [
  { name: 'Ene', programadas: 12, completadas: 10 },
  { name: 'Feb', programadas: 15, completadas: 14 },
  { name: 'Mar', programadas: 10, completadas: 11 },
  { name: 'Abr', programadas: 18, completadas: 16 },
];

export default function MaintenanceChart() {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#334155', 
              borderRadius: '12px',
              fontSize: '12px'
            }} 
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '10px' }}
          />
          <Bar 
            dataKey="programadas" 
            name="Programadas" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
          />
          <Bar 
            dataKey="completadas" 
            name="Completadas" 
            fill="#10B981" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
