import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

// Static color map — avoids Tailwind purge of dynamic bg-${color}-500/10 classes
const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-t-emerald-500' },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-t-indigo-500'  },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-t-blue-500'    },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-t-violet-500'  },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-t-amber-500'   },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-t-red-500'     },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-t-orange-500'  },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-t-sky-500'     },
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-t-teal-500'    },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-[var(--content-muted)]', border: 'border-t-slate-500' },
};

const DELTA = {
  up:      { Icon: ArrowUp,   className: 'bg-emerald-500/10 text-emerald-400' },
  down:    { Icon: ArrowDown, className: 'bg-red-500/10 text-red-400' },
  neutral: { Icon: Minus,     className: 'bg-slate-500/10 text-[var(--content-muted)]' },
};

export default function KPICard({ title, value, unit, trend = 'neutral', icon: Icon, color = 'emerald' }) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.emerald;
  const delta = DELTA[trend] ?? DELTA.neutral;
  const DeltaIcon = delta.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`bg-[var(--content-bg)]/40 border border-[var(--content-border)] border-t-4 ${colors.border} rounded-xl backdrop-blur-sm shadow-lg hover:shadow-emerald-500/10 transition-all p-5`}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            {/* Etiqueta y valor con elementos planos + variables theme-aware para
                mantener contraste AA (la app usa data-theme, no la clase 'dark'). */}
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
        <div className="flex items-center mt-4 justify-start space-x-2">
          <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${delta.className}`}>
            <DeltaIcon className="h-3 w-3" />
          </span>
          <span className="text-[var(--content-muted)] text-xs truncate">Vs. mes anterior</span>
        </div>
      </div>
    </motion.div>
  );
}
