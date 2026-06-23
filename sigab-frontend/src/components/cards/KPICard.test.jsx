// src/components/cards/KPICard.test.jsx
// KPICard se usa en Dashboard, Alertas, AdminGlobal, TVDashboard.
// Es la tarjeta de métricas del shell — si alguien rompe el mapeo de
// color o el delta, todos los KPIs del operador se ven grises o sin flecha.
// Estos tests blingan:
//   - render correcto de título / valor / unidad
//   - los 3 tipos de trend (up/down/neutral) muestran la flecha correcta
//   - la barra superior recibe la clase de color correcta
//   - el color cae al fallback `emerald` cuando se pasa un color inválido
//   - el componente funciona con y sin icono
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KPICard from './KPICard';

// Icono mínimo viable (cualquier componente con className funciona).
const DummyIcon = (props) => <svg data-testid="kpi-icon" {...props} />;

describe('KPICard — render', () => {
  it('renderiza título, valor y unidad cuando se pasan', () => {
    render(<KPICard title="Equipos activos" value={42} unit="uds" icon={DummyIcon} />);
    expect(screen.getByText('Equipos activos')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('uds')).toBeInTheDocument();
  });

  it('NO renderiza la unidad cuando no se pasa', () => {
    render(<KPICard title="Tickets" value={7} icon={DummyIcon} />);
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // "uds" no debe estar — sanity de que la rama `unit && ...` funciona.
    expect(screen.queryByText('uds')).not.toBeInTheDocument();
  });

  it('renderiza el icono cuando se pasa', () => {
    render(<KPICard title="Con icono" value={1} icon={DummyIcon} />);
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  it('NO renderiza el bloque del icono cuando NO se pasa (no rompe layout)', () => {
    const { container } = render(<KPICard title="Sin icono" value={1} />);
    expect(screen.queryByTestId('kpi-icon')).not.toBeInTheDocument();
    // El título sigue presente.
    expect(screen.getByText('Sin icono')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });
});

describe('KPICard — trend (delta vs mes anterior)', () => {
  it('trend="up" muestra flecha ↑', () => {
    render(<KPICard title="Subió" value={10} trend="up" icon={DummyIcon} />);
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('trend="down" muestra flecha ↓', () => {
    render(<KPICard title="Bajó" value={10} trend="down" icon={DummyIcon} />);
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('trend="neutral" (default) muestra guion −', () => {
    render(<KPICard title="Neutro" value={10} icon={DummyIcon} />);
    expect(screen.getByText('−')).toBeInTheDocument();
  });
});

describe('KPICard — color', () => {
  it('color="red" aplica la barra superior roja', () => {
    const { container } = render(<KPICard title="Alerta" value={1} color="red" icon={DummyIcon} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar).toHaveClass('bg-red-500');
  });

  it('color="amber" aplica la barra superior ámbar', () => {
    const { container } = render(<KPICard title="Warn" value={1} color="amber" icon={DummyIcon} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar).toHaveClass('bg-amber-500');
  });

  it('color inválido cae al fallback emerald (no rompe)', () => {
    const { container } = render(<KPICard title="Fallback" value={1} color="magenta-inexistente" icon={DummyIcon} />);
    const bar = container.querySelector('[aria-hidden="true"]');
    expect(bar).toHaveClass('bg-emerald-500');
  });
});