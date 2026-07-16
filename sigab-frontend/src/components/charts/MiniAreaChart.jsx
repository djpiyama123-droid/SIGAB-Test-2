import { useMemo, useRef, useState } from 'react';

// Suavizado tipo "monotone" ligero: Bezier con punto medio entre cada par de
// puntos (sin librería) — visualmente equivalente al AreaChart de recharts
// que reemplaza, sin cargar recharts+d3 (chunk "charts", ~400 kB) en rutas
// que solo necesitan esta gráfica de tooltip simple.
export function buildSmoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

export default function MiniAreaChart({ data, height = 180, color = '#16a34a', formatTooltip }) {
  const containerRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 600;
  const padding = { top: 8, right: 4, bottom: 20, left: 4 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const gradientId = `grad-mini-area-${color.replace('#', '')}`;

  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
        y: padding.top + innerH - (d.count / maxCount) * innerH,
      })),
    [data, maxCount, innerW, innerH, padding.left, padding.top]
  );

  const linePath = useMemo(() => buildSmoothPath(points), [points]);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x},${padding.top + innerH} L ${points[0].x},${padding.top + innerH} Z`
    : '';

  const tickEvery = Math.max(1, Math.round(data.length / 5));
  const ticks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % tickEvery === 0);

  function updateHoverFromClientX(clientX) {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((relX - padding.left) / innerW) * (data.length - 1));
    setHoverIdx(Math.min(data.length - 1, Math.max(0, idx)));
  }

  const hoverPoint = hoverIdx != null ? points[hoverIdx] : null;

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
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
        {hoverPoint && (
          <line
            x1={hoverPoint.x}
            x2={hoverPoint.x}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="var(--content-border)"
            strokeWidth={1}
          />
        )}
        {ticks.map((t, i) => (
          <text
            key={t.fecha ?? i}
            x={t.x}
            y={height - 4}
            fontSize={11}
            fill="var(--content-muted)"
            textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
          >
            {t.label}
          </text>
        ))}
      </svg>
      {hoverPoint && (
        <div
          className="absolute pointer-events-none px-2 py-1 rounded-lg text-xs whitespace-nowrap bg-[var(--content-surface)] border border-[var(--content-border)] text-[var(--content-text)] shadow-lg z-10"
          style={{
            left: `${Math.min(92, Math.max(8, (hoverPoint.x / width) * 100))}%`,
            top: 0,
            transform: 'translate(-50%, -110%)',
          }}
        >
          <span className="font-semibold">{hoverPoint.label}</span>
          {' · '}
          {formatTooltip ? formatTooltip(hoverPoint.count) : hoverPoint.count}
        </div>
      )}
    </div>
  );
}
