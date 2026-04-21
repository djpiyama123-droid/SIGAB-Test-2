/**
 * PageWrapper — Contenedor estándar para todas las páginas protegidas.
 * Estandariza el padding y espaciado vertical.
 */
export default function PageWrapper({ children, className = '' }) {
  return (
    <div className={`p-4 md:p-6 space-y-6 min-h-full ${className}`}>
      {children}
    </div>
  );
}
