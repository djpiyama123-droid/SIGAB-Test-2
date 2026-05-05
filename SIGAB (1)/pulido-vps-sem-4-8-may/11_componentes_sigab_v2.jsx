/**
 * sigab-frontend/src/components/v2/SigabUI.jsx
 *
 * Componentes homologados para identidad SIGAB v2 — miércoles 6-may.
 * Solo CSS/JSX/Tailwind. Cero llamadas backend, cero side-effects.
 *
 * Usar como reemplazo *gradual* de los actuales botones/cards/modales/spinners.
 * Cada componente acepta `className` adicional y reenvía props nativas.
 *
 * Convenciones:
 *   - Tipografía: Montserrat (titulos via clase `font-sigabHead`), Open Sans (cuerpo `font-sigabBody`).
 *   - Cobalt #1B4F72 = primario   (`bg-cobalt-700`, `text-cobalt-700`)
 *   - Teal   #2E86AB = acento     (`bg-teal2-500`, `text-teal2-500`)
 *   - Padding card 24px, modal 28px (variables CSS).
 *   - Radio sm=6, md=10, lg=16.
 *   - Focus ring teal opaco al 45%.
 *
 * Aplicación: copiar a sigab-frontend/src/components/v2/SigabUI.jsx tal cual.
 * El archivo es nuevo, no choca con nada existente.
 */
import React from 'react';

// ──────────────────────────────────────────────────────────────────
// Botones
// ──────────────────────────────────────────────────────────────────

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 ' +
  'font-sigabBody font-semibold ' +
  'rounded-md transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal2-500/45 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const BTN_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-base',
};

const BTN_VARIANTS = {
  primary:
    'bg-cobalt-700 text-white hover:bg-cobalt-800 active:bg-cobalt-900',
  secondary:
    'bg-cobalt-50 text-cobalt-700 hover:bg-cobalt-100 active:bg-cobalt-300/40',
  accent:
    'bg-teal2-500 text-white hover:bg-teal2-700 active:bg-teal2-700',
  ghost:
    'bg-transparent text-cobalt-700 hover:bg-cobalt-50 active:bg-cobalt-100',
  danger:
    'bg-[color:var(--sigab-danger)] text-white hover:brightness-95 active:brightness-90',
};

export function SigabButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft = null,
  iconRight = null,
  children,
  className = '',
  disabled,
  ...rest
}) {
  return (
    <button
      type={rest.type || 'button'}
      disabled={disabled || loading}
      className={`${BTN_BASE} ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <SigabSpinner size="sm" /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────
// Spinner / loading
// ──────────────────────────────────────────────────────────────────

const SPIN_SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export function SigabSpinner({ size = 'md', label, className = '' }) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label || 'Cargando'}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <svg
        className={`${SPIN_SIZES[size]} animate-spin text-current`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="font-sigabBody text-sm text-cobalt-700">{label}</span> : null}
    </span>
  );
}

export function SigabSkeleton({ className = '', lines = 3 }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-cobalt-50 animate-pulse"
          style={{ width: `${90 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Card (cabecera + cuerpo + pie homologados)
// ──────────────────────────────────────────────────────────────────

export function SigabCard({ title, action, footer, children, className = '' }) {
  return (
    <section
      className={
        'sigab-v2 bg-white rounded-[var(--sigab-radius-lg)] ' +
        'border border-cobalt-100 shadow-[var(--sigab-shadow-sm)] ' +
        className
      }
    >
      {(title || action) && (
        <header className="flex items-center justify-between px-6 py-4 border-b border-cobalt-100">
          {title && (
            <h3 className="font-sigabHead text-lg font-semibold text-cobalt-700 leading-tight">
              {title}
            </h3>
          )}
          {action}
        </header>
      )}
      <div className="px-6 py-5 font-sigabBody text-cobalt-900">{children}</div>
      {footer && (
        <footer className="px-6 py-3 border-t border-cobalt-100 bg-cobalt-50/50 rounded-b-[var(--sigab-radius-lg)]">
          {footer}
        </footer>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Modal homologado (cabecera + cuerpo + pie con Cancelar/Guardar)
// ──────────────────────────────────────────────────────────────────
//
// Patron: el padre controla `open`. Esc o click en el backdrop dispara onClose.
// Foco se devuelve al elemento que abrió el modal mediante el `aria-modal`.
//

export function SigabModal({
  open,
  title,
  children,
  onCancel,
  onConfirm,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Guardar',
  confirmVariant = 'primary',
  loading = false,
  size = 'md',
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sigab-modal-title"
      className="sigab-v2 fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-cobalt-900/40 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
      onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}
    >
      <div
        className={
          `bg-white w-full ${widths[size]} rounded-[var(--sigab-radius-lg)] ` +
          'shadow-[var(--sigab-shadow-lg)] flex flex-col max-h-[90vh] animate-slide-up'
        }
      >
        <header className="px-7 py-4 border-b border-cobalt-100">
          <h2 id="sigab-modal-title" className="font-sigabHead text-xl font-semibold text-cobalt-700">
            {title}
          </h2>
        </header>
        <div className="px-7 py-5 overflow-y-auto font-sigabBody text-cobalt-900">{children}</div>
        <footer className="px-7 py-4 border-t border-cobalt-100 bg-cobalt-50/40 flex justify-end gap-3 rounded-b-[var(--sigab-radius-lg)]">
          <SigabButton variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </SigabButton>
          <SigabButton variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </SigabButton>
        </footer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Badge / Estado (operativo / en_mantenimiento / fuera_servicio / baja)
// ──────────────────────────────────────────────────────────────────

const ESTADO_STYLES = {
  operativo:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  en_mantenimiento: 'bg-amber-50 text-amber-700 border-amber-200',
  fuera_servicio:   'bg-red-50 text-red-700 border-red-200',
  baja:             'bg-slate-100 text-slate-600 border-slate-200',
};

export function SigabEstadoBadge({ estado }) {
  const cls = ESTADO_STYLES[estado] || ESTADO_STYLES.baja;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-sigabBody font-semibold ${cls}`}
    >
      {estado.replace('_', ' ')}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tabla responsive con scroll horizontal a 1366/768/375
// ──────────────────────────────────────────────────────────────────

export function SigabTable({ columns, rows, empty = 'Sin registros' }) {
  return (
    <div className="sigab-v2 w-full overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
      <table className="min-w-full divide-y divide-cobalt-100 font-sigabBody">
        <thead className="bg-cobalt-50/60">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-cobalt-700"
                style={{ width: c.width }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cobalt-100/60 bg-white text-sm text-cobalt-900">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-cobalt-700/70">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-cobalt-50/40">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 align-top">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Toast helpers (estilo unificado para react-hot-toast)
// ──────────────────────────────────────────────────────────────────

export const sigabToastOptions = {
  duration: 4000,
  style: {
    fontFamily: "'Open Sans', system-ui, sans-serif",
    background: '#FFFFFF',
    color: '#0E2D43',
    border: '1px solid #D4E5F0',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(14,45,67,0.10)',
  },
  success: { iconTheme: { primary: '#1E8449', secondary: '#FFFFFF' } },
  error:   { iconTheme: { primary: '#B0341C', secondary: '#FFFFFF' } },
};
