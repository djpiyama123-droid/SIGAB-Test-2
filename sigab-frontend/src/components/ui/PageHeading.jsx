/**
 * PageHeading — Encabezado estándar de página con icono, título, subtítulo y acciones.
 * Usa el acento indigo de SIGAB.
 */
export default function PageHeading({ icon: Icon, title, subtitle, actions, badge }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex-shrink-0 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Icon className="h-5 w-5 md:h-6 md:w-6 text-indigo-400" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
              {title}
            </h1>
            {badge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/20">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex gap-2 flex-wrap items-center sm:flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
