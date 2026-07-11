export default function AlertaBanner({ alertas }) {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alertas.slice(0, 3).map((a, i) => (
        <div key={i} className="bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-red-600 text-lg font-bold flex-shrink-0">!</span>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--content-text)] text-sm font-semibold truncate">{a.mensaje}</p>
            {a.equipo_nombre && (
              <p className="text-[var(--content-muted)] text-xs mt-0.5">{a.equipo_nombre} — {a.equipo_serie}</p>
            )}
          </div>
          <span className="text-red-600 text-xs font-semibold flex-shrink-0">
            {a.prioridad?.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
