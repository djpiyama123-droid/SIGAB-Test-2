import { useMemo, useState } from 'react';

// Donut SVG propio (stroke-dasharray sobre un circulo) -- misma idea que
// MiniAreaChart.jsx/MiniGroupedBarChart.jsx: evita cargar el chunk "charts"
// (recharts+d3) para un pastel simple con leyenda. La tecnica de stroke +
// dasharray por segmento evita los casos raros de path de arco SVG (p.ej.
// una sola categoria con 100% del total).
export function buildDonutSegments(data, circumference) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let acc = 0;
  return data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const seg = {
      ...d,
      fraction,
      percent: Math.round(fraction * 100),
      dasharray: `${fraction * circumference} ${circumference - fraction * circumference}`,
      dashoffset: -acc * circumference,
    };
    acc += fraction;
    return seg;
  });
}

export default function MiniDonutChart({ data, height = 220 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 52;
  const strokeWidth = outerR - innerR;
  const r = (outerR + innerR) / 2;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(
    () => buildDonutSegments(data, circumference),
    [data, circumference]
  );

  const hovered = hoverIdx != null ? segments[hoverIdx] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4" style={{ minHeight: height }}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {total === 0 ? (
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--content-border)" strokeWidth={strokeWidth} />
            ) : (
              segments.map((s, i) => (
                <circle
                  key={s.name}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={s.dasharray}
                  strokeDashoffset={s.dashoffset}
                  opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.35}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                />
              ))
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          {hovered ? (
            <>
              <span className="text-xl font-bold" style={{ color: hovered.color }}>{hovered.value}</span>
              <span className="text-[11px] text-[var(--content-muted)]">{hovered.name} ({hovered.percent}%)</span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold text-[var(--content-text)]">{total}</span>
              <span className="text-[11px] text-[var(--content-muted)]">Total</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        {segments.map((s, i) => (
          <div
            key={s.name}
            className="flex items-center gap-2 cursor-pointer"
            style={{ opacity: hoverIdx == null || hoverIdx === i ? 1 : 0.5 }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[var(--content-text)]">{s.name}</span>
            <span className="text-[var(--content-muted)]">{s.value} ({s.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
