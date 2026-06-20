import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function StatusIndicator({ status = 'green', icon: iconName = 'Circle' }) {
  const Icon = Icons[iconName] || Icons.Circle;

  const colors = {
    green: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      ring: 'ring-emerald-500/20',
      pulse: '#10B981',
    },
    yellow: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      ring: 'ring-amber-500/20',
      pulse: '#F59E0B',
    },
    red: {
      bg: 'bg-rose-500/20',
      text: 'text-rose-400',
      ring: 'ring-rose-500/20',
      pulse: '#EF4444',
    },
  };

  const config = colors[status] || colors.green;

  return (
    <div className="relative flex items-center justify-center">
      {status === 'red' && (
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-full ${config.bg}`}
        />
      )}
      <div className={`relative p-2 rounded-full ${config.bg} ring-2 ${config.ring} shadow-lg shadow-black/20`}>
        <Icon className={`h-4 w-4 ${config.text}`} />
      </div>
    </div>
  );
}
