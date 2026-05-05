import React from 'react';
import { BadgeDelta, Flex } from '@tremor/react';
import { motion } from 'framer-motion';

// Static color map for V2 identity
const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-t-emerald-500' },
  blue:    { bg: 'bg-cobalt-50',  text: 'text-cobalt-600',  border: 'border-t-cobalt-500'  },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-t-amber-500'   },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-t-rose-500'    },
};

export default function KPICard({ title, value, unit, trend = 'neutral', icon: Icon, color = 'emerald' }) {
  const deltaType = {
    up: 'increase',
    down: 'decrease',
    neutral: 'unchanged',
  }[trend];

  const colors = COLOR_MAP[color] ?? COLOR_MAP.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`bg-sigab-surface border border-sigab-border rounded-[var(--sigab-radius-lg)] p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden border-t-4 ${colors.border}`}>
        <Flex alignItems="start">
          <div className="flex flex-col">
            <span className="text-sigab-text-muted font-semibold text-xs uppercase tracking-wider">{title}</span>
            <div className="flex items-baseline justify-start space-x-2 mt-1">
              <span className="text-cobalt-700 font-bold text-3xl font-sigabHead">{value}</span>
              {unit && <span className="text-sigab-text-muted text-sm">{unit}</span>}
            </div>
          </div>
          {Icon && (
            <div className={`p-3 ${colors.bg} rounded-xl`}>
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </div>
          )}
        </Flex>
        <Flex className="mt-4 justify-start space-x-2">
          <BadgeDelta deltaType={deltaType} size="xs" />
          <span className="text-sigab-text-muted text-xs truncate">Vs. mes anterior</span>
        </Flex>
      </div>
    </motion.div>
  );
}
