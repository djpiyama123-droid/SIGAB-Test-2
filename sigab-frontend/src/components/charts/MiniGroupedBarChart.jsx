import { useMemo, useRef, useState } from 'react';

// Grafica de barras agrupadas SVG propia (sin recharts) -- misma idea que
// MiniAreaChart.jsx: evita cargar el chunk "charts" (recharts+d3, ~400 kB)
// en rutas que solo necesitan una grafica simple con tooltip.
export function buildGroupedBars(data, keys, { width, height, padding, barGap = 6, groupGap = 20 }) {
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  if (data.length === 0) return { groups: [], maxVal: 1, innerW, innerH, padding };

  const maxVal = Math.max(1, ...data.flatMap((d) => keys.map((k) => d[k] || 0)));
  const groupWidth = innerW / data.length;
  const barWidth = Math.max(2, (groupWidth - groupGap - barGap * (keys.length - 1)) / keys.length);

  const groups = data.map((d, gi) => {
    const groupX = padding.left + gi * groupWidth + groupGap / 2;
    const bars = keys.map((k, ki) => {
      const value = d[k] || 0;
      const barHeight = (value / maxVal) * innerH;
      return {
        key: k,
        value,
        x: groupX + ki * (barWidth + barGap),
        y: padding.top + innerH - barHeight,
        width: barWidth,
        height: barHeight,
      };
    });
    const spanWidth = bars.length * barWidth + (bars.length - 1) * barGap;
    return { name: d.name, bars, centerX: groupX + spanWidth / 2, groupX, groupWidth };
  });

  return { groups, maxVal, innerW, innerH, padding };
}

export default function MiniGroupedBarChart({ data, series, height = 220 }) {
  const containerRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 600;
  const padding = { top: 8, right: 4, bottom: 24, left: 4 };
  const keys = series.map((s) => s.key);

  const { groups, innerH } = useMemo(
    () => buildGroupedBars(data, keys, { width, height, padding }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, keys.join(','), width, height]
  );

  function updateHoverFromClientX(clientX) {
    if (!containerRef.current || groups.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    groups.forEach((g, i) => {
      const dist = Math.abs(g.centerX - relX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIdx(closest);
  }

  const hoverGroup = hoverIdx != null ? groups[hoverIdx] : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height }}
      onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={(e) => updateHoverFromClientX(e.touches[0].clientX)}
      onTouchEnd={() => setHoverIdx(null)}
    >
      <div className="flex items-center justify-end gap-4 mb-1 pr-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[10px] text-[var(--content-muted)]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height - 20} preserveAspectRatio="none" className="overflow-visible">
        {groups.map((g, gi) => (
          <g key={g.name ?? gi}>
            {g.bars.map((b) => (
              <rect
                key={b.key}
                x={b.x}
                y={b.y}
                width={b.width}
                height={Math.max(0, b.height)}
                rx={3}
                fill={series.find((s) => s.key === b.key)?.color}
                opacity={hoverIdx == null || hoverIdx === gi ? 1 : 0.45}
              />
            ))}
            <text
              x={g.centerX}
              y={padding.top + innerH + 16}
              fontSize={10}
              fill="var(--content-muted)"
              textAnchor="middle"
            >
              {g.name}
            </text>
          </g>
        ))}
      </svg>
      {hoverGroup && (
        <div
          className="absolute pointer-events-none px-2 py-1.5 rounded-lg text-xs whitespace-nowrap bg-[var(--content-surface)] border border-[var(--content-border)] text-[var(--content-text)] shadow-lg z-10"
          style={{
            left: `${Math.min(88, Math.max(12, (hoverGroup.centerX / width) * 100))}%`,
            top: 0,
            transform: 'translate(-50%, -105%)',
          }}
        >
          <div className="font-semibold mb-0.5">{hoverGroup.name}</div>
          {hoverGroup.bars.map((b) => (
            <div key={b.key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: series.find((s) => s.key === b.key)?.color }}
              />
              {series.find((s) => s.key === b.key)?.label}: {b.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
