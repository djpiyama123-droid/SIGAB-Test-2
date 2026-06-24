// src/pages/Dashboard.test.jsx
// Dashboard es el "Centro de Control" — la página más transitada del operador.
// Muestra 4 KPIs, alertas críticas, mapa del hospital, gráfica de mantenimiento
// y dos CTAs (Poka-Yoke + NOM-016).
// Se mockean: useDashboard (controla loading/error/data), useResponsive
// (controla isControlRoom → visibilidad del 4º KPI), HospitalMap, MaintenanceChart,
// TripleValidationModal y AlertaBanner (componentes pesados probados en su sitio).
// El foco de este test es la LÓGICA DE PÁGINA: estados (loading/error/ok),
// composición de KPIs, alertas críticas, CTAs y render defensivo.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Mocks: los hooks custom controlan TODO el estado de la página. ──
const mockUseDashboard = vi.fn();
const mockUseResponsive = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../hooks/useDashboard', () => ({
  useDashboard: () => mockUseDashboard(),
}));
vi.mock('../hooks/useResponsive', () => ({
  useResponsive: () => mockUseResponsive(),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ── Mocks: componentes pesados. El test verifica que se MONTAN, no su
// contenido (esos viven en sus propios test files / contratos de uso). ──
vi.mock('../components/HospitalMap', () => ({
  default: () => <div data-testid="mock-hospital-map">MOCK_MAP</div>,
}));
vi.mock('../components/charts/MaintenanceChart', () => ({
  default: () => <div data-testid="mock-maintenance-chart">MOCK_CHART</div>,
}));
vi.mock('../components/TripleValidationModal', () => ({
  default: ({ isOpen, onClose, onValidated }) =>
    isOpen ? (
      <div data-testid="mock-pokayoke">
        MOCK_POKAYOKE
        <button onClick={onClose}>CLOSE</button>
        <button onClick={() => onValidated?.({ id: 99, nombre: 'eq-test' })}>
          VALIDATE
        </button>
      </div>
    ) : null,
}));
vi.mock('../components/AlertaBanner', () => ({
  default: ({ alertas }) => (
    <div data-testid="mock-alerta-banner">
      ALERTAS:{alertas.map((a) => a.mensaje).join('|')}
    </div>
  ),
}));

import Dashboard from './Dashboard';

// ── Fixtures ──
const OK_RESUMEN = {
  total: 751,
  operativos: 698,
  mantenimiento_proximo: 23,
};
const ALERTA_CRITICA_1 = {
  id: 1,
  prioridad: 'critica',
  mensaje: 'Ventilador UCI fuera de servicio',
  equipo_nombre: 'Ventilador Mindray',
  equipo_serie: 'SN-AAA-001',
};
const ALERTA_NORMAL = {
  id: 2,
  prioridad: 'media',
  mensaje: 'Mantenimiento programado',
};

// Stub de window.location.reload para que el botón "Reintentar conexión" no
// explote jsdom (no se puede `delete` en jsdom, redefinimos la propiedad).
beforeEach(() => {
  mockNavigate.mockReset();
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: vi.fn() },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setupDashboard(overrides = {}, { isControlRoom = false } = {}) {
  const defaults = {
    loading: false,
    error: null,
    resumen: OK_RESUMEN,
    equipos: [],
    alertas: [],
  };
  mockUseDashboard.mockReturnValue({ ...defaults, ...overrides });
  mockUseResponsive.mockReturnValue({
    isControlRoom,
    isMobile: false,
    width: isControlRoom ? 4000 : 1440,
  });
}

function renderDashboard(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checklists" element={<div>CHECKLISTS_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ──────────────────────────────────────────────────────────────────
// Estado: loading
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — estado loading', () => {
  it('muestra el spinner "Iniciando SIGAH Engine..." y NO renderiza KPIs', () => {
    setupDashboard({ loading: true });
    renderDashboard();
    expect(screen.getByText(/Iniciando SIGAH Engine/i)).toBeInTheDocument();
    // El header/kpis NO están en este estado — sanity de la rama `if (loading)`.
    expect(screen.queryByText('CENTRO DE CONTROL')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Activos')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: error
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — estado error', () => {
  it('muestra el mensaje de error y un botón "Reintentar conexión"', () => {
    setupDashboard({ error: 'Backend caído (503)' });
    renderDashboard();
    expect(screen.getByText('Error de Enlace')).toBeInTheDocument();
    expect(screen.getByText('Backend caído (503)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar conexión/i })).toBeInTheDocument();
  });

  it('el botón "Reintentar conexión" llama a window.location.reload()', () => {
    setupDashboard({ error: 'Timeout' });
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar conexión/i }));
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: ok — composición de la página
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — render exitoso (header)', () => {
  beforeEach(() => setupDashboard());

  it('muestra el título "CENTRO DE CONTROL" con "SIGAB" destacado en verde', () => {
    renderDashboard();
    const title = screen.getByRole('heading', { level: 1, name: /CENTRO DE CONTROL.*SIGAB/i });
    expect(title).toBeInTheDocument();
    // El span "SIGAB" existe dentro del heading.
    expect(within(title).getByText('SIGAB')).toBeInTheDocument();
  });

  it('muestra el subtítulo del hospital y la descripción del sistema', () => {
    renderDashboard();
    expect(screen.getByText(/IMSS 1 Clínica General Tijuana/i)).toBeInTheDocument();
    expect(screen.getByText(/Sistema Integral de Activos Biomédicos/i)).toBeInTheDocument();
  });

  it('muestra el botón Poka-Yoke y el botón NOM-016', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /Poka-Yoke/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /NOM-016/i })).toBeInTheDocument();
  });

  it('el botón NOM-016 navega a /checklists al hacer click', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /NOM-016/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/checklists');
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: ok — KPIs
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — KPIs', () => {
  it('muestra los 3 KPIs base con los valores del resumen', () => {
    setupDashboard();
    renderDashboard();
    // Total Activos: 751 (con unidad "Equipos").
    expect(screen.getByText('Total Activos')).toBeInTheDocument();
    expect(screen.getByText('751')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();
    // Operativos: 698.
    expect(screen.getByText('Operativos')).toBeInTheDocument();
    expect(screen.getByText('698')).toBeInTheDocument();
    // Fallas Críticas: 0 (sin alertas críticas).
    expect(screen.getByText('Fallas Críticas')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('NO muestra el KPI "Mantenimiento Due" cuando isControlRoom=false', () => {
    setupDashboard({}, { isControlRoom: false });
    renderDashboard();
    expect(screen.queryByText('Mantenimiento Due')).not.toBeInTheDocument();
  });

  it('SÍ muestra el KPI "Mantenimiento Due" cuando isControlRoom=true', () => {
    setupDashboard({}, { isControlRoom: true });
    renderDashboard();
    expect(screen.getByText('Mantenimiento Due')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('cuenta las alertas críticas en el KPI "Fallas Críticas"', () => {
    setupDashboard({ alertas: [ALERTA_CRITICA_1, ALERTA_CRITICA_1, ALERTA_NORMAL] });
    renderDashboard();
    // 2 críticas → el KPI muestra 2.
    const fallasCard = screen.getByText('Fallas Críticas').closest('div');
    expect(within(fallasCard.parentElement).getByText('2')).toBeInTheDocument();
  });

  it('render defensivo: usa 0 cuando resumen es null (no crashea)', () => {
    setupDashboard({ resumen: null });
    renderDashboard();
    // Total = 0, Operativos = 0 — sin excepción, sin "NaN".
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: ok — alertas críticas
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — banner de alertas críticas', () => {
  it('NO muestra el banner cuando no hay alertas críticas', () => {
    setupDashboard({ alertas: [ALERTA_NORMAL] });
    renderDashboard();
    expect(screen.queryByTestId('mock-alerta-banner')).not.toBeInTheDocument();
  });

  it('SÍ muestra el banner cuando hay al menos una alerta crítica', () => {
    setupDashboard({ alertas: [ALERTA_CRITICA_1, ALERTA_NORMAL] });
    renderDashboard();
    const banner = screen.getByTestId('mock-alerta-banner');
    expect(banner).toBeInTheDocument();
    // Sólo las críticas llegan al banner (no las "media").
    expect(banner.textContent).toContain('Ventilador UCI fuera de servicio');
    expect(banner.textContent).not.toContain('Mantenimiento programado');
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: ok — secciones inferiores
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — mapa y gráfica de mantenimiento', () => {
  it('renderiza la sección "Mapa de Activos por Zona" y monta HospitalMap', () => {
    setupDashboard();
    renderDashboard();
    expect(screen.getByText('Mapa de Activos por Zona')).toBeInTheDocument();
    expect(screen.getByTestId('mock-hospital-map')).toBeInTheDocument();
  });

  it('renderiza la sección "Cumplimiento de Mantenimiento" y monta MaintenanceChart', () => {
    setupDashboard();
    renderDashboard();
    expect(screen.getByText('Cumplimiento de Mantenimiento')).toBeInTheDocument();
    expect(screen.getByTestId('mock-maintenance-chart')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Interacción: Poka-Yoke modal
// ──────────────────────────────────────────────────────────────────
describe('Dashboard — modal Poka-Yoke', () => {
  it('NO muestra el modal en estado inicial', () => {
    setupDashboard();
    renderDashboard();
    expect(screen.queryByTestId('mock-pokayoke')).not.toBeInTheDocument();
  });

  it('ABRE el modal al hacer click en el botón Poka-Yoke', () => {
    setupDashboard();
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Poka-Yoke/i }));
    expect(screen.getByTestId('mock-pokayoke')).toBeInTheDocument();
  });

  it('CIERRA el modal al disparar onClose desde el modal mockeado', () => {
    setupDashboard();
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Poka-Yoke/i }));
    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));
    expect(screen.queryByTestId('mock-pokayoke')).not.toBeInTheDocument();
  });
});
