// src/components/EquipoCard.test.jsx
// EquipoCard se usa en la página /equipos (vista grid).
// El ciclo 3 le añadió accesibilidad teclado (role="button" + tabIndex + Enter/Space).
// Estos tests blindan que ese contrato a11y no se rompe en refactors futuros:
//   - role + tabIndex + aria-label accesible para lectores de pantalla
//   - click + Enter + Space disparan onClick
//   - otras teclas NO disparan onClick
//   - el badge "Crítico" aparece sólo cuando criticidad === 'alta'
//   - los contadores de tickets/alertas sólo aparecen cuando son > 0
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EquipoCard from './EquipoCard';

const baseEquipo = {
  id: 1,
  nombre: 'Monitor de signos vitales',
  marca: 'Philips',
  modelo: 'MX450',
  estado: 'operativo',
  area: 'UCI Adultos',
  serie: 'SN-12345',
  criticidad: 'media',
  tickets_abiertos: 0,
  alertas_pendientes: 0,
  tipo_equipo: 'monitor',
};

describe('EquipoCard — accesibilidad', () => {
  it('expone role=button, tabIndex=0 y aria-label descriptivo', () => {
    render(<EquipoCard equipo={baseEquipo} onClick={() => {}} />);
    const card = screen.getByRole('button', { name: /Ver detalle de Monitor de signos vitales/i });
    expect(card).toHaveAttribute('tabindex', '0');
    // El aria-label concatena nombre + marca + modelo separados por ' — '.
    expect(card.getAttribute('aria-label')).toContain('Philips');
    expect(card.getAttribute('aria-label')).toContain('MX450');
  });
});

describe('EquipoCard — interacción', () => {
  it('click dispara onClick con el equipo', () => {
    const onClick = vi.fn();
    render(<EquipoCard equipo={baseEquipo} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(baseEquipo);
  });

  it('Enter dispara onClick (a11y teclado, ciclo 3)', () => {
    const onClick = vi.fn();
    render(<EquipoCard equipo={baseEquipo} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(baseEquipo);
  });

  it('Space dispara onClick (a11y teclado, ciclo 3)', () => {
    const onClick = vi.fn();
    render(<EquipoCard equipo={baseEquipo} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('otras teclas NO disparan onClick', () => {
    const onClick = vi.fn();
    render(<EquipoCard equipo={baseEquipo} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'a' });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('onClick ausente (undefined) no rompe con Enter', () => {
    // Optional chaining `onClick?.(equipo)` debe cubrir este caso.
    render(<EquipoCard equipo={baseEquipo} />);
    expect(() => {
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    }).not.toThrow();
  });
});

describe('EquipoCard — contenido', () => {
  it('renderiza nombre, marca y modelo', () => {
    render(<EquipoCard equipo={baseEquipo} onClick={() => {}} />);
    expect(screen.getByText('Monitor de signos vitales')).toBeInTheDocument();
    expect(screen.getByText(/Philips/)).toBeInTheDocument();
    expect(screen.getByText(/MX450/)).toBeInTheDocument();
  });

  it('muestra badge "Crítico" cuando criticidad="alta"', () => {
    render(<EquipoCard equipo={{ ...baseEquipo, criticidad: 'alta' }} onClick={() => {}} />);
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  it('NO muestra badge "Crítico" cuando criticidad="media"', () => {
    render(<EquipoCard equipo={{ ...baseEquipo, criticidad: 'media' }} onClick={() => {}} />);
    expect(screen.queryByText('Crítico')).not.toBeInTheDocument();
  });

  it('muestra contador de tickets cuando tickets_abiertos > 0', () => {
    render(<EquipoCard equipo={{ ...baseEquipo, tickets_abiertos: 3 }} onClick={() => {}} />);
    expect(screen.getByText(/3 ticket/)).toBeInTheDocument();
  });

  it('muestra contador de alertas cuando alertas_pendientes > 0', () => {
    render(<EquipoCard equipo={{ ...baseEquipo, alertas_pendientes: 2 }} onClick={() => {}} />);
    expect(screen.getByText(/2 alerta/)).toBeInTheDocument();
  });

  it('NO muestra contadores cuando tickets y alertas son 0', () => {
    render(<EquipoCard equipo={baseEquipo} onClick={() => {}} />);
    expect(screen.queryByText(/ticket/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/alerta/i)).not.toBeInTheDocument();
  });
});