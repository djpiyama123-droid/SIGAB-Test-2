export default function GlassCard({ children, className = '', padding = true, hover = false }) {
  return (
    <div
      style={{ background: 'var(--content-surface)', borderColor: 'var(--content-border)' }}
      className={`
        border rounded-2xl shadow-sm backdrop-blur-xl
        ${hover ? 'transition-all duration-200 hover:shadow-md cursor-pointer' : ''}
        ${padding ? 'p-4 md:p-5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
