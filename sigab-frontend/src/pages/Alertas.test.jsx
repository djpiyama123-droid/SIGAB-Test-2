// src/pages/Alertas.test.jsx
// Alertas es el Centro de Alertas del operador: lista de notificaciones
// pendientes con filtro por prioridad y acciones "Marcar leída" (individual)
// y "Marcar todas leídas" (batch con window.confirm). Es la página más
// pequeña del SPA (145 líneas) pero concentra varios patrones:
//
//   - 3 ramas de render: loading, empty, lista
//   - 5 filtros (Todas/Crítica/Alta/Media/Baja) con highlight del activo
//   - Botón "Marcar todas" CONDICIONAL a alertas.length > 0
//   - 2 endpoints mutantes: marcarLeida(id), marcarTodasLeidas()
//   - Modal de confirmación via window.confirm (no un <ConfirmDialog>)
//   - Toast.success / Toast.error / Toast.loading con id compartido
//
// Riesgos silenciosos que un test atrapa:
//   - Si alguien borra `prev.filter((a) => a.id !== id)` el operador
//     marcaría alertas como leídas sin que desaparezcan de la lista.
//   - Si alguien quita el `setAlertas([])` de marcarTodas, el operador
//     vería "Todas marcadas" con todas las alertas todavía visibles.
//   - Si el filtro deja de aplicar `a.prioridad === filtro`, se rompe
//     la utilidad principal de la página.
//   - Si el botón "Marcar todas" se renderiza sin checar `alertas.length > 0`,
//     aparece en estado vacío y confunde al operador.
//
// Se mockea `../api/sigab` (3 endpoints), `../components/Toast` (sileo no
// es jsdom-safe) y `window.confirm` para controlar la confirmación batch.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetAlertasPendientes: vi.fn(),
  mockMarcarLeida:           vi.fn(),
  mockMarcarTodasLeidas:     vi.fn(),
  mockToast: {
    success: vi.fn(),
    error:   vi.fn(),
    info:    vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'toast-id-loading'),
    dismiss: vi.fn(),
  },
}));

vi.mock('../api/sigab', () => ({
  api: {
    getAlertasPendientes: (...a) => mocks.mockGetAlertasPendientes(...a),
    marcarLeida:          (...a) => mocks.mockMarcarLeida(...a),
    marcarTodasLeidas:    (...a) => mocks.mockMarcarTodasLeidas(...a),
  },
}));

vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }) => children,
  useToast:      () => mocks.mockToast,
  default:       mocks.mockToast,
}));

import Alertas from './Alertas';

// ── Fixtures ──
const ALERTA_CRITICA = {
  id: 1, prioridad: 'critica',
  tipo: 'falla_equipo',
  mensaje: 'Ventilador Mindray sin respuesta',
  equipo_nombre: 'Ventilador Mindray SV300',
  equipo_serie: 'SN-V300-001',
  created_at: '2026-06-24T10:30:00Z',
};
const ALERTA_ALTA = {
  id: 2, prioridad: 'alta',
  tipo: 'mantenimiento_vencido',
  mensaje: 'Mantenimiento preventivo vencido hace 3 días',
  equipo_nombre: 'Monitor Philips',
  equipo_serie: null,
  created_at: '2026-06-24T09:15:00Z',
};
const ALERTA_MEDIA = {
  id: 3, prioridad: 'media',
  tipo: 'calibracion_proxima',
  mensaje: 'Calibración próxima a vencer',
  equipo_nombre: null,
  equipo_serie: null,
  created_at: '2026-06-24T08:00:00Z',
};
const ALERTA_BAJA = {
  id: 4, prioridad: 'baja',
  tipo: 'info_sistema',
  mensaje: 'Backup completado',
  equipo_nombre: null,
  equipo_serie: null,
  created_at: '2026-06-24T07:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Silenciar el console.error del catch de cargar/marcar/marcarTodas.
  // Los errores son ESPERADOS en los tests negativos; sin esto contaminan
  // stderr con "Error: Network" tres veces por cada test de error.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // window.confirm por defecto a true; cada test lo sobreescribe.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

// Helper: renderiza y espera a que loading termine (fetch inicial resuelto).
const renderAlertas = async () => {
  render(<Alertas />);
  // El useEffect del mount llama a cargar(); mientras loading=true se ve
  // "Cargando alertas...". Esperamos a que la promesa se asiente con act()
  // para no dejar microtasks pendientes.
  await act(async () => {
    await Promise.resolve();
  });
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Estado loading
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — estado loading', () => {
  it('muestra "Cargando alertas..." mientras la promesa no resuelve', async () => {
    // Promesa que nunca resuelve durante este test: loading se queda en true.
    mocks.mockGetAlertasPendientes.mockReturnValue(new Promise(() => {}));

    render(<Alertas />);

    expect(screen.getByText('Cargando alertas...')).toBeInTheDocument();
    // Alertas.jsx renderiza el header siempre (sólo el botón "Marcar todas"
    // es condicional a alertas.length > 0). Lo que NO debe estar en loading
    // es el contenido de la lista ni el empty state.
    expect(screen.queryByText('Sin alertas pendientes')).not.toBeInTheDocument();
    // Ninguna alerta mockeada debe filtrarse al DOM durante loading.
    expect(screen.queryByText(/backup completado/i)).not.toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Estado vacío
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — estado vacío', () => {
  it('muestra empty state cuando la API devuelve alertas: []', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [] });

    await renderAlertas();

    expect(screen.getByText('Sin alertas pendientes')).toBeInTheDocument();
    expect(screen.getByText('El sistema está en buen estado')).toBeInTheDocument();
    // El botón "Marcar todas" NO debe aparecer si no hay alertas.
    expect(screen.queryByRole('button', { name: /marcar todas leídas/i })).not.toBeInTheDocument();
  });

  it('muestra empty state cuando un filtro no tiene matches', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_BAJA] });

    await renderAlertas();

    // Sin filtro, la baja se ve.
    expect(screen.getByText(/backup completado/i)).toBeInTheDocument();

    // Filtrar por "critica": no hay críticas → empty state.
    // El DOM tiene el texto literal 'critica' (sin tilde — el `capitalize`
    // de Tailwind es sólo presentación).
    fireEvent.click(screen.getByRole('button', { name: /^critica$/i }));

    await waitFor(() => {
      expect(screen.getByText('Sin alertas pendientes')).toBeInTheDocument();
    });
    // La baja ya no está visible.
    expect(screen.queryByText(/backup completado/i)).not.toBeInTheDocument();
  });

  it('tolerancia: si la API no devuelve la key `alertas`, trata como vacío', async () => {
    // Cubre un edge case: backend viejo o respuesta parcial. .alertas
    // es `undefined`, el `|| []` debe rescatarlo.
    mocks.mockGetAlertasPendientes.mockResolvedValue({});

    await renderAlertas();

    expect(screen.getByText('Sin alertas pendientes')).toBeInTheDocument();
    expect(mocks.mockGetAlertasPendientes).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Render con alertas
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — render con datos', () => {
  it('header + contador + 5 botones de filtro + lista de cards', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({
      alertas: [ALERTA_CRITICA, ALERTA_ALTA, ALERTA_MEDIA, ALERTA_BAJA],
    });

    await renderAlertas();

    expect(screen.getByRole('heading', { name: 'Centro de Alertas', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('4 alertas pendientes')).toBeInTheDocument();

    // 5 botones de filtro: Todas + 4 prioridades.
    expect(screen.getByRole('button', { name: /^todas$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^critica$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^alta$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^media$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^baja$/i })).toBeInTheDocument();

    // Cada alerta muestra su mensaje.
    expect(screen.getByText(/ventilador mindray sin respuesta/i)).toBeInTheDocument();
    expect(screen.getByText(/mantenimiento preventivo vencido/i)).toBeInTheDocument();
    expect(screen.getByText(/calibración próxima a vencer/i)).toBeInTheDocument();
    expect(screen.getByText(/backup completado/i)).toBeInTheDocument();

    // El botón "Marcar todas" SÍ aparece con alertas.length > 0.
    expect(screen.getByRole('button', { name: /marcar todas leídas/i })).toBeInTheDocument();
  });

  it('muestra serie del equipo entre paréntesis si equipo_serie existe', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_CRITICA] });

    await renderAlertas();

    // El fixture tiene serie 'SN-V300-001' → debe aparecer entre paréntesis.
    expect(screen.getByText(/\(SN-V300-001\)/)).toBeInTheDocument();
  });

  it('omite la línea "Equipo:" si no hay nombre ni serie', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_MEDIA] });

    await renderAlertas();

    // ALERTA_MEDIA tiene ambos null → el bloque "Equipo: ..." NO se renderiza.
    expect(screen.queryByText(/^Equipo:/)).not.toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Filtros por prioridad
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — filtros', () => {
  it('el filtro activo recibe el highlight verde (bg-emerald-100)', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({
      alertas: [ALERTA_CRITICA, ALERTA_BAJA],
    });

    await renderAlertas();

    const btnTodas   = screen.getByRole('button', { name: /^todas$/i });
    const btnCritica = screen.getByRole('button', { name: /^critica$/i });

    // Inicialmente "Todas" está activo.
    expect(btnTodas.className).toMatch(/bg-emerald-100/);
    expect(btnCritica.className).not.toMatch(/bg-emerald-100/);

    fireEvent.click(btnCritica);

    // Ahora "Crítica" toma el highlight y "Todas" lo pierde.
    expect(btnCritica.className).toMatch(/bg-emerald-100/);
    expect(btnTodas.className).not.toMatch(/bg-emerald-100/);
  });

  it('filtrar por prioridad solo deja visibles las alertas de esa prioridad', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({
      alertas: [ALERTA_CRITICA, ALERTA_ALTA, ALERTA_BAJA],
    });

    await renderAlertas();

    fireEvent.click(screen.getByRole('button', { name: /^alta$/i }));

    await waitFor(() => {
      expect(screen.getByText(/mantenimiento preventivo vencido/i)).toBeInTheDocument();
    });
    // Las otras dos desaparecen.
    expect(screen.queryByText(/ventilador mindray sin respuesta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/backup completado/i)).not.toBeInTheDocument();
  });

  it('"Todas" resetea el filtro y vuelve a mostrar todas las alertas', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({
      alertas: [ALERTA_CRITICA, ALERTA_BAJA],
    });

    await renderAlertas();

    fireEvent.click(screen.getByRole('button', { name: /^critica$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/backup completado/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^todas$/i }));
    await waitFor(() => {
      expect(screen.getByText(/backup completado/i)).toBeInTheDocument();
      expect(screen.getByText(/ventilador mindray sin respuesta/i)).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Marcar leída (individual)
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — marcar leída individual', () => {
  it('success: llama api.marcarLeida(id), remueve la alerta, toast.success', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({
      alertas: [ALERTA_CRITICA, ALERTA_ALTA],
    });
    mocks.mockMarcarLeida.mockResolvedValue({ ok: true });

    await renderAlertas();

    // La crítica está visible.
    expect(screen.getByText(/ventilador mindray sin respuesta/i)).toBeInTheDocument();

    // Click en "Marcar leída →" de la crítica. Hay 2 botones con ese texto
    // (uno por alerta); tomamos el primero.
    const botonesMarcar = screen.getAllByRole('button', { name: /marcar leída/i });
    fireEvent.click(botonesMarcar[0]);

    await waitFor(() => {
      expect(mocks.mockMarcarLeida).toHaveBeenCalledWith(ALERTA_CRITICA.id);
      expect(mocks.mockToast.success).toHaveBeenCalledWith('Alerta marcada como leída');
    });

    // La alerta crítica ya no está en la lista.
    await waitFor(() => {
      expect(screen.queryByText(/ventilador mindray sin respuesta/i)).not.toBeInTheDocument();
    });
    // La alta sigue.
    expect(screen.getByText(/mantenimiento preventivo vencido/i)).toBeInTheDocument();
  });

  it('error con response.data.detail: toast.error muestra el detail del backend', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_CRITICA] });
    mocks.mockMarcarLeida.mockRejectedValue({
      response: { data: { detail: 'Alerta ya marcada por otro operador' } },
    });

    await renderAlertas();

    fireEvent.click(screen.getAllByRole('button', { name: /marcar leída/i })[0]);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Alerta ya marcada por otro operador');
    });
    // La alerta SIGUE visible (no se removió porque la API rechazó).
    expect(screen.getByText(/ventilador mindray sin respuesta/i)).toBeInTheDocument();
  });

  it('error sin detail: toast.error usa el mensaje genérico', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_CRITICA] });
    mocks.mockMarcarLeida.mockRejectedValue(new Error('Network down'));

    await renderAlertas();

    fireEvent.click(screen.getAllByRole('button', { name: /marcar leída/i })[0]);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('No se pudo marcar la alerta');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Marcar todas (batch con window.confirm)
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — marcar todas leídas', () => {
  it('confirm=true + success: limpia la lista y muestra toast.success', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({
      alertas: [ALERTA_CRITICA, ALERTA_ALTA, ALERTA_BAJA],
    });
    mocks.mockMarcarTodasLeidas.mockResolvedValue({ ok: true });
    window.confirm.mockReturnValue(true);

    await renderAlertas();

    fireEvent.click(screen.getByRole('button', { name: /marcar todas leídas/i }));

    await waitFor(() => {
      expect(mocks.mockMarcarTodasLeidas).toHaveBeenCalledTimes(1);
    });

    // toast.loading se llamó ANTES del await con un mensaje humano.
    expect(mocks.mockToast.loading).toHaveBeenCalledWith('Marcando todas…');
    // toast.success recibe el mismo id del toast.loading (reemplazo, no duplicado).
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'Todas las alertas marcadas como leídas',
      { id: 'toast-id-loading' },
    );

    // La lista queda vacía → empty state.
    await waitFor(() => {
      expect(screen.getByText('Sin alertas pendientes')).toBeInTheDocument();
    });
    // Ningún mensaje de las 3 alertas queda visible.
    expect(screen.queryByText(/ventilador mindray sin respuesta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mantenimiento preventivo vencido/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/backup completado/i)).not.toBeInTheDocument();
    // El botón "Marcar todas" desaparece (alertas.length === 0).
    expect(screen.queryByRole('button', { name: /marcar todas leídas/i })).not.toBeInTheDocument();
  });

  it('confirm=true + error: toast.error con detail del backend', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_CRITICA] });
    mocks.mockMarcarTodasLeidas.mockRejectedValue({
      response: { data: { detail: 'Servicio ocupado, reintenta en 30s' } },
    });
    window.confirm.mockReturnValue(true);

    await renderAlertas();

    fireEvent.click(screen.getByRole('button', { name: /marcar todas leídas/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Servicio ocupado, reintenta en 30s',
        { id: 'toast-id-loading' },
      );
    });
    // La alerta SIGUE visible (no se vació).
    expect(screen.getByText(/ventilador mindray sin respuesta/i)).toBeInTheDocument();
  });

  it('confirm=true + error sin detail: toast.error genérico', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_CRITICA] });
    mocks.mockMarcarTodasLeidas.mockRejectedValue(new Error('boom'));
    window.confirm.mockReturnValue(true);

    await renderAlertas();

    fireEvent.click(screen.getByRole('button', { name: /marcar todas leídas/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Error al marcar todas',
        { id: 'toast-id-loading' },
      );
    });
  });

  it('confirm=false: la API NO se llama y no se muestra ningún toast', async () => {
    mocks.mockGetAlertasPendientes.mockResolvedValue({ alertas: [ALERTA_CRITICA] });
    window.confirm.mockReturnValue(false);

    await renderAlertas();

    fireEvent.click(screen.getByRole('button', { name: /marcar todas leídas/i }));

    // Damos un tick para asegurar que cualquier llamada se hubiera ejecutado.
    await act(async () => { await Promise.resolve(); });

    expect(mocks.mockMarcarTodasLeidas).not.toHaveBeenCalled();
    expect(mocks.mockToast.loading).not.toHaveBeenCalled();
    expect(mocks.mockToast.success).not.toHaveBeenCalled();
    expect(mocks.mockToast.error).not.toHaveBeenCalled();
    // La alerta sigue visible.
    expect(screen.getByText(/ventilador mindray sin respuesta/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Error al cargar
// ────────────────────────────────────────────────────────────────────────────
describe('Alertas — error en carga inicial', () => {
  it('muestra empty state y toast.error cuando getAlertasPendientes rechaza', async () => {
    mocks.mockGetAlertasPendientes.mockRejectedValue(new Error('Network'));

    await renderAlertas();

    // Sin datos cargados → visibles = [] → empty state.
    expect(screen.getByText('Sin alertas pendientes')).toBeInTheDocument();
    expect(mocks.mockToast.error).toHaveBeenCalledWith('No se pudieron cargar las alertas');
  });
});