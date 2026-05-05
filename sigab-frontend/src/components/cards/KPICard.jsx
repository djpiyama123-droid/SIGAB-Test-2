import React from 'react';
import { Card, Text, Metric, BadgeDelta, Flex } from '@tremor/react';
import { motion } from 'framer-motion';

// Static color map — avoids Tailwind purge of dynamic bg-${color}-500/10 classes
const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400'  },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400'  },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400'   },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400'     },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400'  },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400'     },
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-400'    },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-400'   },
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
      <Card decoration="top" decorationColor={color} className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-lg hover:shadow-emerald-500/10 transition-all">
        <Flex alignItems="start">
          <div className="flex flex-col">
            <Text className="text-slate-400 font-medium text-xs uppercase tracking-wider">{title}</Text>
            <Flex className="items-baseline justify-start space-x-2 mt-1">
              <Metric className="text-white font-bold">{value}</Metric>
              {unit && <Text className="text-slate-500 text-sm">{unit}</Text>}
            </Flex>
          </div>
          {Icon && (
            <div className={`p-3 ${colors.bg} rounded-xl`}>
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </div>
          )}
        </Flex>
        <Flex className="mt-4 justify-start space-x-2">
          <BadgeDelta deltaType={deltaType} size="xs" />
          <Text className="text-slate-500 text-xs truncate">Vs. mes anterior</Text>
        </Flex>
      </Card>
    </motion.div>
  );
}
