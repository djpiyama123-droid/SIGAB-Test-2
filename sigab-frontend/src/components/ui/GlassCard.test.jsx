// src/components/ui/GlassCard.test.jsx
// GlassCard es la tarjeta "vidrio esmerilado" del shell — usada en
// CommandCenter (3×) y AdminGlobal (2×). Es el bloque visual más repetido
// del v3.0: si alguien rompe `padding` o `hover`, la densidad de las
// páginas salta y se pierde la identidad visual.
// Estos tests blindan:
//   - render de children
//   - padding=true (default) lleva p-4 md:p-5
//   - padding=false omite las clases de padding
//   - hover=true añade transition + cursor-pointer
//   - hover=false (default) NO añade las clases de hover
//   - las CSS vars de tema se aplican como style inline (cross-check con theme)
//   - className custom se concatena
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlassCard from './GlassCard';

describe('GlassCard — render base', () => {
  it('renderiza los children', () => {
    render(<GlassCard><p>contenido</p></GlassCard>);
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('siempre lleva border + rounded-2xl + shadow-sm (identidad glass)', () => {
    const { container } = render(<GlassCard>x</GlassCard>);
    const card = container.firstChild;
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('rounded-2xl');
    expect(card).toHaveClass('shadow-sm');
    expect(card).toHaveClass('backdrop-blur-xl');
  });

  it('aplica las CSS vars de tema como style inline', () => {
    const { container } = render(<GlassCard>x</GlassCard>);
    const card = container.firstChild;
    expect(card).toHaveStyle({ background: 'var(--content-surface)' });
    expect(card).toHaveStyle({ borderColor: 'var(--content-border)' });
  });
});

describe('GlassCard — padding', () => {
  it('padding=true (default) lleva p-4 md:p-5', () => {
    const { container } = render(<GlassCard>x</GlassCard>);
    expect(container.firstChild).toHaveClass('p-4');
    expect(container.firstChild).toHaveClass('md:p-5');
  });

  it('padding=false NO lleva padding (caso AdminGlobal tablas densas)', () => {
    const { container } = render(<GlassCard padding={false}>x</GlassCard>);
    expect(container.firstChild).not.toHaveClass('p-4');
    expect(container.firstChild).not.toHaveClass('md:p-5');
  });
});

describe('GlassCard — hover', () => {
  it('hover=true lleva transition + cursor-pointer (cards clicables)', () => {
    const { container } = render(<GlassCard hover>x</GlassCard>);
    const card = container.firstChild;
    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:shadow-md');
  });

  it('hover=false (default) NO lleva las clases de hover', () => {
    const { container } = render(<GlassCard>x</GlassCard>);
    const card = container.firstChild;
    expect(card).not.toHaveClass('cursor-pointer');
    expect(card).not.toHaveClass('hover:shadow-md');
  });
});

describe('GlassCard — composición', () => {
  it('concatena className custom', () => {
    const { container } = render(<GlassCard className="flex flex-col h-full">x</GlassCard>);
    const card = container.firstChild;
    expect(card).toHaveClass('flex');
    expect(card).toHaveClass('flex-col');
    expect(card).toHaveClass('h-full');
  });
});
