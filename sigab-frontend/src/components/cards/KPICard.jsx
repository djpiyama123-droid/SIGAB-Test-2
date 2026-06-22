import React from 'react';
import { motion } from 'framer-motion';

// Color map for icon background and the top accent stripe on each KPI card.
const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  bar: 'bg-indigo-500'  },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    bar: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  bar: 'bg-violet-500'  },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   bar: 'bg-amber-500'   },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    bar: 'bg-rose-500'    },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     bar: 'bg-red-500'     },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  bar: 'bg-orange-500'  },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     bar: 'bg-sky-500'     },
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-400',    bar: 'bg-teal-500'    },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-[var(--content-muted)]', bar: 'bg-slate-500' },
};

const DELTA = {
  increase: { arrow: '↑', cls: 'bg-emerald-500/15 text-emerald-400' },
  decrease: { arrow: '↓', cls: 'bg-rose-500/15 text-rose-400' },
  unchanged: { arrow: '−', cls: 'bg-slate-500/15 text-[var(--content-muted)]' },
};

export default function KPICard({ title, value, unit, trend = 'neutral', icon: Icon, color = 'emerald' }) {
  const deltaType = {
    up: 'increase',
    down: 'decrease',
    neutral: 'unchanged',
  }[trend];

  const colors = COLOR_MAP[color] ?? COLOR_MAP.emerald;
  const delta = DELTA[deltaType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative bg-[var(--content-bg)]/40 border border-[var(--content-border)] backdrop-blur-sm shadow-lg hover:shadow-emerald-500/10 rounded-xl transition-all overflow-hidden"
    >
      <div className={`absolute top-0 inset-x-0 h-1 ${colors.bar}`} aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
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
        </div>
        <div className="mt-4 flex items-center justify-start space-x-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${delta.cls}`}>
            {delta.arrow}
          </span>
          <span className="text-[var(--content-muted)] text-xs truncate">Vs. mes anterior</span>
        </div>
      </div>
    </motion.div>
  );
}