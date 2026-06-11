/**
 * Button.jsx — Sistema de botones SIGAH/SIGAB (Clinical Precision Glass).
 *
 * Variantes:
 *   - primary : gradiente cyan→azul IMSS, hover lift + glow (CTA principal)
 *   - glass   : panel de vidrio esmerilado, texto cyan (acción secundaria)
 *   - ghost   : transparente, hover sutil
 *   - danger  : rojo, acciones destructivas
 *
 * Props:
 *   variant, size ('sm'|'md'|'lg'), icon (componente lucide), iconPosition ('left'|'right'),
 *   loading, as ('button'|'a'), ...rest (onClick, href, type, disabled, className)
 *
 * Uso:
 *   import { Button } from '../components/ui';
 *   <Button variant="primary" icon={ArrowRight} iconPosition="right">Comenzar</Button>
 */
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'btn-primary shadow-blue-sm',
  glass:
    'glass-panel text-cyan-glow hover:text-white',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-white/5 hover:text-white border border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 hover:-translate-y-0.5',
  outline:
    'bg-transparent border border-cyan-glow/40 text-cyan-glow hover:bg-cyan-glow/10 hover:border-cyan-glow/70',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  as = 'button',
  className = '',
  children,
  disabled,
  ...rest
}) {
  const Tag = as;
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-display font-semibold uppercase ' +
    'tracking-wider transition-all duration-300 select-none active:scale-[0.97] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow/60 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-glass-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';

  const cls = `${base} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`;

  return (
    <Tag className={cls} disabled={as === 'button' ? (disabled || loading) : undefined} {...rest}>
      {loading
        ? <Loader2 className="animate-spin" size={size === 'lg' ? 20 : 16} />
        : Icon && iconPosition === 'left' && <Icon size={size === 'lg' ? 20 : 16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={size === 'lg' ? 20 : 16} />}
    </Tag>
  );
}
