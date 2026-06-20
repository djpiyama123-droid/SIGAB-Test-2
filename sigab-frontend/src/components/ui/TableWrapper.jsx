export default function TableWrapper({ children, className = '' }) {
  return (
    <div
      style={{ background: 'var(--content-surface)', borderColor: 'var(--content-border)' }}
      className={`
        border rounded-2xl shadow-sm overflow-x-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}
