// src/components/ui/Button.test.jsx
// Button es el CTA principal de LandingPage (marketing → login) y el
// sistema de botones de todo el shell v3.0. Si alguien rompe el mapeo
// de VARIANTS, el login cae a un botón invisible. Si rompe el manejo
// de `loading`, el botón de submit se queda colgado sin spinner.
// Estos tests blindan:
//   - las 5 variantes (primary/glass/ghost/danger/outline) aplican su clase
//   - los 3 tamaños (sm/md/lg) aplican su clase
//   - variantes/tamaños inválidos caen al fallback sin romper
//   - el prop polimórfico `as="a"` cambia la etiqueta y desactiva `disabled`
//   - loading muestra el spinner Loader2 y oculta el icono (pero children sí)
//   - onClick se dispara; disabled/loading bloquean el click
//   - la clase focus-visible:ring-cyan-glow/60 está presente (a11y teclado)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

const Icon = (props) => <svg data-testid="dummy-icon" {...props} />;

describe('Button — etiqueta & props base', () => {
  it('renderiza un <button> por default', () => {
    render(<Button>Hola</Button>);
    expect(screen.getByRole('button', { name: 'Hola' })).toBeInTheDocument();
  });

  it('renderiza un <a> cuando as="a" con href', () => {
    render(<Button as="a" href="#x">Ir</Button>);
    const link = screen.getByRole('link', { name: 'Ir' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#x');
  });

  it('reenvía onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled=true bloquea el click', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Off</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Button — variantes', () => {
  it('primary (default) lleva btn-primary', () => {
    render(<Button>CTA</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('glass lleva glass-panel', () => {
    render(<Button variant="glass">Glass</Button>);
    expect(screen.getByRole('button')).toHaveClass('glass-panel');
  });

  it('ghost es transparente', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('danger pinta en rojo', () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('outline lleva border cyan', () => {
    render(<Button variant="outline">Borde</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-cyan-glow/40');
  });

  it('variante inválida cae al fallback primary (no rompe)', () => {
    render(<Button variant="no-existe">X</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });
});

describe('Button — tamaños', () => {
  it('sm', () => {
    render(<Button size="sm">S</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3 py-1.5 text-xs');
  });

  it('md (default)', () => {
    render(<Button>M</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-5 py-2.5 text-sm');
  });

  it('lg', () => {
    render(<Button size="lg">L</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-7 py-3.5 text-base');
  });

  it('tamaño inválido cae al fallback md', () => {
    render(<Button size="xl-no-existe">X</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-5 py-2.5 text-sm');
  });
});

describe('Button — loading', () => {
  it('muestra el spinner Loader2 y oculta el icono (children siguen visibles)', () => {
    render(<Button loading icon={Icon}>Guardando</Button>);
    // Loader2 de lucide-react: <svg class="lucide lucide-loader-circle animate-spin ...">
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    // El icono propio ya NO se renderiza — el spinner lo reemplaza.
    expect(screen.queryByTestId('dummy-icon')).not.toBeInTheDocument();
    // Children siguen renderizándose (decisión de diseño del componente).
    expect(screen.getByText('Guardando')).toBeInTheDocument();
  });

  it('loading=true en <button> bloquea el click (disabled)', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Enviar</Button>);
    fireEvent.click(screen.getByRole('button', { name: /Enviar/ }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('loading=true en <a> NO añade disabled (atributo no aplica)', () => {
    render(<Button as="a" href="#" loading>Link</Button>);
    expect(screen.getByRole('link')).not.toHaveAttribute('disabled');
  });
});

describe('Button — icono', () => {
  it('iconPosition="left" (default) pone el icono antes de children en el DOM', () => {
    render(<Button icon={Icon}>Left</Button>);
    const btn = screen.getByRole('button', { name: /Left/ });
    const icon = screen.getByTestId('dummy-icon');
    // Recorremos los hijos directos del botón en orden y comprobamos que
    // el icono aparece ANTES que el nodo de texto "Left".
    const kids = Array.from(btn.childNodes);
    const iconIdx = kids.indexOf(icon);
    const textIdx = kids.findIndex((n) => n.nodeType === 3 && n.textContent.trim() === 'Left');
    expect(iconIdx).toBeGreaterThanOrEqual(0);
    expect(textIdx).toBeGreaterThanOrEqual(0);
    expect(iconIdx).toBeLessThan(textIdx);
  });

  it('iconPosition="right" pone el icono después de children en el DOM', () => {
    render(<Button icon={Icon} iconPosition="right">Right</Button>);
    const btn = screen.getByRole('button', { name: /Right/ });
    const icon = screen.getByTestId('dummy-icon');
    const kids = Array.from(btn.childNodes);
    const iconIdx = kids.indexOf(icon);
    const textIdx = kids.findIndex((n) => n.nodeType === 3 && n.textContent.trim() === 'Right');
    expect(iconIdx).toBeGreaterThanOrEqual(0);
    expect(textIdx).toBeGreaterThanOrEqual(0);
    expect(iconIdx).toBeGreaterThan(textIdx);
  });

  it('sin icono, no se renderiza el bloque', () => {
    render(<Button>Solo texto</Button>);
    expect(screen.queryByTestId('dummy-icon')).not.toBeInTheDocument();
  });
});

describe('Button — a11y & composición', () => {
  it('aplica focus-visible:ring para navegación por teclado', () => {
    render(<Button>Focus</Button>);
    expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-2');
  });

  it('concatena className custom al final', () => {
    render(<Button className="w-full mt-2">Full</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('w-full');
    expect(btn).toHaveClass('mt-2');
    // Y no se pierde la variante primary.
    expect(btn).toHaveClass('btn-primary');
  });
});
