import React from 'react';
import { Card, BadgeDelta, Flex } from '@tremor/react';
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
  slate:   { bg: 'bg-slate-500/10',   text: 'text-[var(--content-muted)]'   },
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
      <Card decoration="top" decorationColor={color} className="bg-[var(--content-bg)]/40 border-[var(--content-border)] backdrop-blur-sm shadow-lg hover:shadow-emerald-500/10 transition-all">
        <Flex alignItems="start">
          <div className="flex flex-col">
            {/* Etiqueta y valor con elementos planos + variables theme-aware:
                no dependemos de los colores por defecto de Tremor (sus variantes
                dark: no se activan porque la app usa data-theme, no la clase
                'dark'), que dejaban el texto en gris claro sin contraste AA. */}
            <span className="text-[var(--content-text)] font-semibold text-xs uppercase tracking-wider opacity-90">{title}</span>
            <div className="flex items-baseline justify-start space-x-2 mt-1">
              <span className="text-[var(--content-text)] font-bold text-3xl leading-none tabular-nums">{value}</span>
              {unit && <span className="text-[var(--content-muted)] text-sm">{unit}</span>}
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
          <span className="text-[var(--content-muted)] text-xs truncate">Vs. mes anterior</span>
        </Flex>
      </Card>
    </motion.div>
  );
}
