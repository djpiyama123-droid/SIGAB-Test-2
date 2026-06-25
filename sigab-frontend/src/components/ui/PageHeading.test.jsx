// src/components/ui/PageHeading.test.jsx
// PageHeading es el encabezado estándar de las páginas protegidas — usado
// en CommandCenter y AdminGlobal. Centraliza el bloque "icono + título +
// subtítulo + badge + acciones" que abre cada página del operador.
// Si alguien rompe la indentación flex o el orden de slots, el operador
// ve los botones de acción moverse a la izquierda del título sin saber
// por qué. Estos tests blindan:
//   - title se renderiza como <h1>
//   - subtitle se renderiza como <p> cuando se pasa (y NO cuando se omite)
//   - el bloque del icono aparece solo si se pasa `icon` (no rompe layout)
//   - badge se renderiza inline junto al título cuando se pasa
//   - actions se renderizan en su slot derecho cuando se pasan
//   - sin props opcionales, el componente sigue siendo válido
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeading from './PageHeading';

const Icon = (props) => <svg data-testid="dummy-icon" {...props} />;

describe('PageHeading — title & subtitle', () => {
  it('renderiza title como <h1>', () => {
    render(<PageHeading title="Mi página" />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Mi página' });
    expect(h1).toBeInTheDocument();
  });

  it('renderiza subtitle como <p> cuando se pasa', () => {
    render(<PageHeading title="X" subtitle="descripción corta" />);
    expect(screen.getByText('descripción corta').tagName).toBe('P');
  });

  it('NO renderiza subtitle cuando se omite (no bloque vacío)', () => {
    const { container } = render(<PageHeading title="Solo título" />);
    // Solo hay un <h1>; ningún <p> adentro.
    expect(container.querySelector('p')).toBeNull();
  });
});

describe('PageHeading — icono', () => {
  it('renderiza el bloque del icono cuando se pasa', () => {
    render(<PageHeading title="X" icon={Icon} />);
    expect(screen.getByTestId('dummy-icon')).toBeInTheDocument();
  });

  it('NO renderiza el bloque del icono cuando se omite', () => {
    render(<PageHeading title="Sin icono" />);
    expect(screen.queryByTestId('dummy-icon')).not.toBeInTheDocument();
    // El título sigue presente.
    expect(screen.getByRole('heading', { name: 'Sin icono' })).toBeInTheDocument();
  });
});

describe('PageHeading — badge', () => {
  it('renderiza badge inline cuando se pasa', () => {
    render(<PageHeading title="Tickets" badge="42" />);
    const badge = screen.getByText('42');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-indigo-500/20');
  });

  it('NO renderiza badge cuando se omite', () => {
    const { container } = render(<PageHeading title="Tickets" />);
    // No hay span con clase de badge.
    expect(container.querySelector('.bg-indigo-500\\/20')).toBeNull();
  });
});

describe('PageHeading — actions', () => {
  it('renderiza el slot de acciones cuando se pasan', () => {
    render(
      <PageHeading
        title="X"
        actions={<button>Nuevo</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  it('NO renderiza slot de acciones cuando se omite', () => {
    const { container } = render(<PageHeading title="Sin acciones" />);
    // No hay <button> dentro del heading.
    expect(container.querySelector('button')).toBeNull();
  });
});
