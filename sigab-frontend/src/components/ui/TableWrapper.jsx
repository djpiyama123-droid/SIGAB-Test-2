/**
 * TableWrapper — Contenedor para tablas con scroll horizontal y glassmorphism.
 * Garantiza que ninguna tabla clipee su contenido en viewports angostos.
 */
export default function TableWrapper({ children, className = '' }) {
  return (
    <div
      className={`
        bg-slate-800/50 backdrop-blur-md
        border border-slate-700/50
        rounded-2xl shadow-glass
        overflow-x-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}
