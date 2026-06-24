// src/pages/Equipos.test.jsx
// Equipos es la página más transitada del inventario: lista/tabla de equipos
// biomédicos con filtros, orden, paginación, búsqueda debounced, exportación
// CSV y dos modales (detalle + alta). Es la última página del set {Login,
// Dashboard, Equipos} que faltaba cubrir con tests.
//
// Se mockea: `../api/sigab` (5 endpoints), `../components/Toast` (sileo no es
// jsdom-safe), EquipoCard/EquipoTable/EquipoDetail/EquipoForm (componentes
// pesados probados en su sitio), y `useSearchParams` (devuelve un
// URLSearchParams controlable + spy de setter para el deep-link ?equipoId).
// El foco del test es la LÓGICA DE PÁGINA: estados (loading/empty/ok),
// toggle de vista, filtros, paginación, modales, CSV y deep-link por URL.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// vi.mock se hoistea al top del archivo: las refs mutables que la factory
// necesita deben vivir dentro de vi.hoisted() para estar disponibles antes
// de que se ejecute el mock.
const mocks = vi.hoisted(() => {
  const mockSearchParams = new URLSearchParams();
  const mockSetSearchParams = vi.fn((next) => {
    mockSearchParams.length = 0;
    for (const [k, v] of next) mockSearchParams.append(k, v);
  });
  return {
    mockSearchParams,
    mockSetSearchParams,
    mockGetEquipos: vi.fn(),
    mockGetAreasCatalogo: vi.fn(),
    mockGetEquipo: vi.fn(),
    mockDescargarEquiposCsv: vi.fn(),
    mockTriggerDownload: vi.fn(),
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    },
  };
});

// ── Mock api/sigab: 5 endpoints consumidos por Equipos. ──
vi.mock('../api/sigab', () => ({
  api: {
    getEquipos: (...args) => mocks.mockGetEquipos(...args),
    getAreasCatalogo: (...args) => mocks.mockGetAreasCatalogo(...args),
    getEquipo: (...args) => mocks.mockGetEquipo(...args),
    descargarEquiposCsv: (...args) => mocks.mockDescargarEquiposCsv(...args),
    triggerDownload: (...args) => mocks.mockTriggerDownload(...args),
  },
}));

// ── Mock Toast: useToast devuelve un stub estable (sileo no es jsdom-safe). ──
vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => mocks.mockToast,
  default: mocks.mockToast,
}));

// ── Mock useSearchParams: URLSearchParams controlable + spy del setter. ──
// Mantenemos identidad estable del URLSearchParams para que el useEffect
// con dep [searchParams, setSearchParams] NO re-dispare en cada render.
// El setter real muta la URL; el mock replica esa semántica copiando entries.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mocks.mockSearchParams, mocks.mockSetSearchParams],
  };
});

// ── Mock componentes hijos: stubs con data-testid + interacciones mínimas. ──
vi.mock('../components/EquipoCard', () => ({
  default: ({ equipo, onClick }) => (
    <button data-testid="mock-equipo-card" onClick={() => onClick?.(equipo)}>
      {equipo.nombre}
    </button>
  ),
}));
vi.mock('../components/EquipoTable', () => ({
  default: ({ equipos }) => (
    <div data-testid="mock-equipo-table">
      TABLA:{equipos.map((e) => e.nombre).join(',')}
    </div>
  ),
}));
vi.mock('../components/EquipoDetail', () => ({
  default: ({ equipo, onClose }) => (
    <div data-testid="mock-equipo-detail">
      DETAIL:{equipo?.nombre}
      <button onClick={onClose}>CLOSE_DETAIL</button>
    </div>
  ),
}));
vi.mock('../components/EquipoForm', () => ({
  default: ({ onClose, onSaved }) => (
    <div data-testid="mock-equipo-form">
      FORM
      <button onClick={onClose}>CANCEL_FORM</button>
      <button onClick={onSaved}>SAVE_FORM</button>
    </div>
  ),
}));

import Equipos from './Equipos';

// ── Fixtures ──
const EQUIPO_BASE = {
  id: 1,
  nombre: 'Ventilador Mindray SV300',
  serie: 'SN-001',
  marca: 'Mindray',
  estado: 'operativo',
  criticidad: 'alta',
  area: 'UCI',
  piso: '2',
  tipo_equipo: 'Ventilador',
};
const EQUIPO_2 = { ...EQUIPO_BASE, id: 2, nombre: 'Monitor Philips IntelliVue', serie: 'SN-002' };
const CATALOGOS = {
  areas: ['UCI', 'Urgencias', 'Consultorios'],
  pisos: ['1', '2', '3'],
};

// ── Helpers ──
function setupApi({
  equipos = [EQUIPO_BASE, EQUIPO_2],
  total = equipos.length,
  catalogos = { marcas: ['Mindray', 'Philips'], tipos: ['Ventilador', 'Monitor'] },
  catalogosAreas = CATALOGOS,
} = {}) {
  mocks.mockGetEquipos.mockResolvedValue({ equipos, total, catalogos });
  mocks.mockGetAreasCatalogo.mockResolvedValue(catalogosAreas);
  mocks.mockGetEquipo.mockResolvedValue({ equipo: { ...EQUIPO_BASE, id: 99, nombre: 'DeepLinked' } });
  mocks.mockDescargarEquiposCsv.mockResolvedValue({});
}

function renderEquipos(initialPath = '/equipos') {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/equipos" element={<Equipos />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  // Reset URL params entre tests (no se filtra el ?equipoId del ciclo previo).
  mocks.mockSearchParams.length = 0;
  mocks.mockSetSearchParams.mockClear();
  // Reset mocks — `vi.clearAllMocks` no restaura implementaciones, solo clears
  // call history, que es lo que queremos.
  mocks.mockGetEquipos.mockReset();
  mocks.mockGetAreasCatalogo.mockReset();
  mocks.mockGetEquipo.mockReset();
  mocks.mockDescargarEquiposCsv.mockReset();
  mocks.mockTriggerDownload.mockReset();
  mocks.mockToast.success.mockReset();
  mocks.mockToast.error.mockReset();
  // Setup por defecto: 2 equipos, total=2 (sin paginación), catálogos llenos.
  setupApi();
});

afterEach(() => {
  cleanup();
  // Limpia el timeout global de búsqueda debounced que Equipos deja en
  // window._sigahEquiposSearch, para no contaminar el siguiente test.
  if (window._sigahEquiposSearch) {
    clearTimeout(window._sigahEquiposSearch);
    delete window._sigahEquiposSearch;
  }
});

// ──────────────────────────────────────────────────────────────────
// Estado: loading
// ──────────────────────────────────────────────────────────────────
describe('Equipos — estado loading', () => {
  it('muestra el spinner "Cargando inventario..." y NO renderiza la tabla', async () => {
    // Hacemos que getEquipos NO resuelva para inspeccionar el estado loading.
    let resolveGet;
    mocks.mockGetEquipos.mockReturnValue(new Promise((res) => { resolveGet = res; }));

    renderEquipos();
    // En el primer render, loading=true → spinner presente.
    expect(screen.getByText(/Cargando inventario/i)).toBeInTheDocument();
    expect(screen.queryByTestId('mock-equipo-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-equipo-card')).not.toBeInTheDocument();

    // Cleanup: resolvemos la promesa para no dejar promesas colgadas.
    await act(async () => { resolveGet({ equipos: [], total: 0 }); });
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: empty
// ──────────────────────────────────────────────────────────────────
describe('Equipos — estado empty', () => {
  it('muestra "No se encontraron equipos" cuando la API devuelve 0 equipos', async () => {
    setupApi({ equipos: [], total: 0, catalogos: { marcas: [], tipos: [] } });
    renderEquipos();
    expect(await screen.findByText(/No se encontraron equipos/i)).toBeInTheDocument();
    expect(screen.getByText(/Intenta con otros filtros/i)).toBeInTheDocument();
    // No debe haber montado ni tabla ni grid de cards.
    expect(screen.queryByTestId('mock-equipo-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-equipo-card')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Estado: ok — header y render por defecto (vista tabla)
// ──────────────────────────────────────────────────────────────────
describe('Equipos — render exitoso (default)', () => {
  it('muestra el título y el conteo "N equipos registrados · HGR No.1 IMSS"', async () => {
    renderEquipos();
    expect(screen.getByRole('heading', { level: 1, name: /Inventario de Equipos/i })).toBeInTheDocument();
    expect(await screen.findByText(/2 equipos registrados · HGR No\.1 IMSS/i)).toBeInTheDocument();
  });

  it('vista por defecto es "tabla" → monta EquipoTable (no EquipoCard)', async () => {
    renderEquipos();
    const table = await screen.findByTestId('mock-equipo-table');
    expect(table).toBeInTheDocument();
    expect(table.textContent).toContain('Ventilador Mindray SV300');
    expect(table.textContent).toContain('Monitor Philips IntelliVue');
    expect(screen.queryByTestId('mock-equipo-card')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Toggle de vista (tabla ↔ tarjetas)
// ──────────────────────────────────────────────────────────────────
describe('Equipos — toggle de vista', () => {
  it('click en "Tarjetas" monta el grid de EquipoCard (y desmonta EquipoTable)', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table'); // confirma que arrancó en tabla

    fireEvent.click(screen.getByRole('button', { name: /Tarjetas/i }));

    const cards = await screen.findAllByTestId('mock-equipo-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toBe('Ventilador Mindray SV300');
    expect(screen.queryByTestId('mock-equipo-table')).not.toBeInTheDocument();
  });

  it('click en "Tabla" después de haber cambiado a tarjetas vuelve a EquipoTable', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');

    fireEvent.click(screen.getByRole('button', { name: /Tarjetas/i }));
    await screen.findAllByTestId('mock-equipo-card');

    fireEvent.click(screen.getByRole('button', { name: /Tabla/i }));
    expect(await screen.findByTestId('mock-equipo-table')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-equipo-card')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Filtros
// ──────────────────────────────────────────────────────────────────
describe('Equipos — filtros', () => {
  it('los selects tienen la opción por defecto "Todos..." (sin filtros activos)', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');
    expect(screen.getByDisplayValue('Todos los estados')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todas las criticidades')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todas las áreas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todos los pisos')).toBeInTheDocument();
    // El badge "activeFilterCount" NO aparece cuando no hay filtros.
    expect(screen.queryByText(/^1$/, { selector: 'span' })).not.toBeInTheDocument();
  });

  it('cambiar el filtro "estado" dispara un nuevo fetch con el filtro aplicado', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');
    mocks.mockGetEquipos.mockClear();

    fireEvent.change(screen.getByDisplayValue('Todos los estados'), {
      target: { value: 'operativo' },
    });

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalled();
    });
    // El filtro `estado: 'operativo'` llegó al backend.
    const lastCall = mocks.mockGetEquipos.mock.calls[mocks.mockGetEquipos.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({ estado: 'operativo', limit: 50, offset: 0 });

    // Aparece el badge "1" de filtro activo (tomamos el del header, no el
    // del FAB móvil que también muestra el contador cuando los filtros están
    // plegados).
    const filterBadges = screen.getAllByText('1', { selector: 'span.bg-emerald-600' });
    expect(filterBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('"Limpiar filtros" resetea filtros y dispara un fetch sin filtros', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');

    // Activa un filtro primero.
    fireEvent.change(screen.getByDisplayValue('Todos los estados'), {
      target: { value: 'fuera_servicio' },
    });
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith(expect.objectContaining({ estado: 'fuera_servicio' }));
    });
    expect(screen.getByRole('button', { name: /Limpiar filtros/i })).toBeInTheDocument();
    mocks.mockGetEquipos.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Limpiar filtros/i }));

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalled();
    });
    const lastCall = mocks.mockGetEquipos.mock.calls[mocks.mockGetEquipos.mock.calls.length - 1][0];
    expect(lastCall.estado).toBeUndefined();
    expect(lastCall.criticidad).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────
// Paginación
// ──────────────────────────────────────────────────────────────────
describe('Equipos — paginación', () => {
  it('NO muestra controles de paginación cuando total ≤ PAGE_SIZE (50)', async () => {
    setupApi({ equipos: [EQUIPO_BASE], total: 1 });
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');
    expect(screen.queryByText(/Mostrando.*de.*equipos/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anterior/i })).not.toBeInTheDocument();
  });

  it('muestra "Mostrando 1–50 de 75 equipos" + Anterior/Siguiente cuando total > 50', async () => {
    setupApi({ equipos: [EQUIPO_BASE], total: 75 });
    renderEquipos();
    expect(await screen.findByText(/Mostrando 1–50 de 75 equipos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeInTheDocument();
    // Anterior disabled en la primera página.
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeDisabled();
    expect(screen.getByText(/Pág\. 1 \/ 2/i)).toBeInTheDocument();
  });

  it('click "Siguiente" avanza offset +50 y dispara un fetch con nuevo offset', async () => {
    setupApi({ equipos: [EQUIPO_BASE], total: 75 });
    renderEquipos();
    await screen.findByText(/Mostrando 1–50 de 75/);
    mocks.mockGetEquipos.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith(expect.objectContaining({ offset: 50 }));
    });
    expect(await screen.findByText(/Mostrando 51–75 de 75/i)).toBeInTheDocument();
    expect(screen.getByText(/Pág\. 2 \/ 2/i)).toBeInTheDocument();
    // Siguiente ahora disabled (estamos en la última página).
    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDisabled();
  });
});

// ──────────────────────────────────────────────────────────────────
// Modales: EquipoDetail (vista tarjeta) y EquipoForm (alta)
// ──────────────────────────────────────────────────────────────────
describe('Equipos — modales', () => {
  it('click en un EquipoCard abre EquipoDetail con el equipo seleccionado', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');

    fireEvent.click(screen.getByRole('button', { name: /Tarjetas/i }));
    const cards = await screen.findAllByTestId('mock-equipo-card');
    fireEvent.click(cards[1]); // Click en el segundo (Monitor Philips)

    const detail = await screen.findByTestId('mock-equipo-detail');
    expect(detail.textContent).toContain('Monitor Philips IntelliVue');
  });

  it('el botón "CLOSE_DETAIL" del detalle cierra el modal', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');
    fireEvent.click(screen.getByRole('button', { name: /Tarjetas/i }));
    fireEvent.click((await screen.findAllByTestId('mock-equipo-card'))[0]);
    await screen.findByTestId('mock-equipo-detail');

    fireEvent.click(screen.getByRole('button', { name: 'CLOSE_DETAIL' }));
    expect(screen.queryByTestId('mock-equipo-detail')).not.toBeInTheDocument();
  });

  it('click "Nuevo equipo" abre EquipoForm; "SAVE_FORM" recarga el inventario', async () => {
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');
    expect(screen.queryByTestId('mock-equipo-form')).not.toBeInTheDocument();

    // Hay dos botones "Nuevo equipo" (desktop + FAB móvil). Tomamos el primero
    // (desktop), que es el que abre EquipoForm con la misma lógica.
    const newButtons = screen.getAllByRole('button', { name: /Nuevo equipo/i });
    fireEvent.click(newButtons[0]);
    expect(await screen.findByTestId('mock-equipo-form')).toBeInTheDocument();
    mocks.mockGetEquipos.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'SAVE_FORM' }));

    // onSaved llama a cargar() → re-fetch.
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalled();
    });
    // El form se cierra tras guardar.
    expect(screen.queryByTestId('mock-equipo-form')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────
// Exportación CSV
// ──────────────────────────────────────────────────────────────────
describe('Equipos — exportación CSV', () => {
  it('click "Exportar CSV" llama a descargarEquiposCsv + triggerDownload + toast.success', async () => {
    const blob = new Blob(['csv-content']);
    mocks.mockDescargarEquiposCsv.mockResolvedValue(blob);
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

    await waitFor(() => {
      expect(mocks.mockDescargarEquiposCsv).toHaveBeenCalledTimes(1);
    });
    expect(mocks.mockTriggerDownload).toHaveBeenCalledTimes(1);
    // triggerDownload(blob, filename) — el filename incluye la fecha.
    const [calledBlob, calledFilename] = mocks.mockTriggerDownload.mock.calls[0];
    expect(calledBlob).toBe(blob);
    expect(calledFilename).toMatch(/^inventario_sigah_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(mocks.mockToast.success).toHaveBeenCalledTimes(1);
    expect(mocks.mockToast.success.mock.calls[0][0]).toMatch(/exportado exitosamente/i);
    expect(mocks.mockToast.error).not.toHaveBeenCalled();
  });

  it('error en descargarEquiposCsv muestra toast.error y NO llama triggerDownload', async () => {
    // Silenciar el console.error del catch de handleExportarCsv (es esperado).
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.mockDescargarEquiposCsv.mockRejectedValue(new Error('Network'));
    renderEquipos();
    await screen.findByTestId('mock-equipo-table');

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledTimes(1);
    });
    expect(mocks.mockToast.error.mock.calls[0][0]).toMatch(/No se pudo exportar/i);
    expect(mocks.mockTriggerDownload).not.toHaveBeenCalled();
    expect(mocks.mockToast.success).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────
// Deep-link por query param: /equipos?equipoId=42
// ──────────────────────────────────────────────────────────────────
describe('Equipos — deep-link por query param', () => {
  it('visitar /equipos?equipoId=42 llama a api.getEquipo(42) y abre EquipoDetail', async () => {
    mocks.mockSearchParams.set('equipoId', '42');
    renderEquipos();

    await waitFor(() => {
      expect(mocks.mockGetEquipo).toHaveBeenCalledWith('42');
    });
    const detail = await screen.findByTestId('mock-equipo-detail');
    // El nombre viene del fixture de mockGetEquipo (DeepLinked).
    expect(detail.textContent).toContain('DeepLinked');
  });

  it('después de auto-abrir, llama a setSearchParams para limpiar el query param', async () => {
    mocks.mockSearchParams.set('equipoId', '99');
    renderEquipos();

    await waitFor(() => {
      expect(mocks.mockSetSearchParams).toHaveBeenCalled();
    });
    // El nuevo params NO contiene equipoId (cleanup con replace:true).
    const next = mocks.mockSetSearchParams.mock.calls[0][0];
    expect(next.get('equipoId')).toBeNull();
    // Y se llamó con { replace: true } (no empuja historia nueva).
    expect(mocks.mockSetSearchParams.mock.calls[0][1]).toEqual({ replace: true });
  });
});

// ──────────────────────────────────────────────────────────────────
// Búsqueda con debounce de 400ms
// ──────────────────────────────────────────────────────────────────
describe('Equipos — búsqueda con debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('tipear en el input dispara api.getEquipos con `buscar` después de 400ms', async () => {
    renderEquipos();
    // flushMountedEffects: avanzamos timers para que las promesas pendientes
    // (getAreasCatalogo, getEquipos inicial) se resuelvan y podamos hacer mockClear.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    mocks.mockGetEquipos.mockClear();

    const input = screen.getByPlaceholderText(/Buscar por nombre, serie, marca, modelo/i);
    fireEvent.change(input, { target: { value: 'ventilador' } });

    // Antes de 400ms NO se disparó la búsqueda con `buscar`.
    expect(mocks.mockGetEquipos).not.toHaveBeenCalledWith(expect.objectContaining({ buscar: 'ventilador' }));

    // Tras los 400ms del debounce, sí.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450);
    });
    const lastCall = mocks.mockGetEquipos.mock.calls[mocks.mockGetEquipos.mock.calls.length - 1]?.[0];
    expect(lastCall).toMatchObject({ buscar: 'ventilador' });
  });
});
