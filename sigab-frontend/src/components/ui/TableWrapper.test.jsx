// src/components/ui/TableWrapper.test.jsx
// TableWrapper es el contenedor de tablas densas del shell — usado por
// AdminGlobal. La razón de existir es `overflow-x-auto`: si alguien la
// quita, las tablas largas en móvil se desbordan y rompen el layout.
// Estos tests blindan:
//   - render de children
//   - siempre lleva overflow-x-auto (decisión arquitectónica)
//   - siempre lleva border + rounded-2xl (identidad glass)
//   - CSS vars de tema se aplican como style inline
//   - className custom se concatena
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TableWrapper from './TableWrapper';

describe('TableWrapper — render base', () => {
  it('renderiza los children', () => {
    render(<TableWrapper><table><tbody><tr><td>dato</td></tr></tbody></table></TableWrapper>);
    expect(screen.getByText('dato')).toBeInTheDocument();
  });

  it('siempre lleva overflow-x-auto (decisión arquitectónica)', () => {
    const { container } = render(<TableWrapper>x</TableWrapper>);
    expect(container.firstChild).toHaveClass('overflow-x-auto');
  });

  it('siempre lleva border + rounded-2xl + shadow-sm (identidad glass)', () => {
    const { container } = render(<TableWrapper>x</TableWrapper>);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('border');
    expect(wrapper).toHaveClass('rounded-2xl');
    expect(wrapper).toHaveClass('shadow-sm');
  });

  it('aplica las CSS vars de tema como style inline', () => {
    const { container } = render(<TableWrapper>x</TableWrapper>);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle({ background: 'var(--content-surface)' });
    expect(wrapper).toHaveStyle({ borderColor: 'var(--content-border)' });
  });
});

describe('TableWrapper — composición', () => {
  it('concatena className custom', () => {
    const { container } = render(<TableWrapper className="mt-4">x</TableWrapper>);
    expect(container.firstChild).toHaveClass('mt-4');
    // Y no se pierde overflow-x-auto.
    expect(container.firstChild).toHaveClass('overflow-x-auto');
  });
});
