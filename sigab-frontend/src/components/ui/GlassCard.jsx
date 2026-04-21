/**
 * GlassCard — Tarjeta con efecto glassmorphism.
 * Reemplaza los div plain bg-slate-800 en toda la app.
 */
export default function GlassCard({ children, className = '', padding = true, hover = false }) {
  return (
    <div
      className={`
        bg-slate-800/50 backdrop-blur-md
        border border-slate-700/50
        rounded-2xl shadow-glass
        ${hover ? 'transition-all duration-200 hover:bg-slate-800/70 hover:border-slate-600/60 hover:shadow-indigo' : ''}
        ${padding ? 'p-4 md:p-5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
