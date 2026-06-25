// src/pages/Preventivos.test.jsx
// Preventivos es el Centro de Mantenimientos Preventivos: lista de
// programaciones con filtro Todos/Vencidos/Próximos 30d y botón "Marcar
// ejecutado" por cada item. Es la página de menor tamaño del SPA con
// fetch (165 líneas) y concentra varios patrones sutiles:
//
//   - Estado loading inicial con useEffect + .finally() para apagarlo.
//   - 2 endpoints: api.getPreventivos (carga) + api.ejecutarPreventivo
//     (mutación con confirmación vía window.confirm, NO un ConfirmDialog).
//   - Tolerancia a respuesta sin la key `preventivos` (fallback `|| []`).
//   - Función utilitaria diasRestantes(fecha) con Math.ceil sobre la
//     diferencia en ms — los días se redondean hacia arriba, lo que
//     rompe bordes (un prevent. a 2.4 días se ve como "3d restantes").
//   - BadgeVencimiento con 4 ramas de color según días:
//       • < 0  → "Vencido hace Nd" (red bg-red-100 text-red-700)
//       • = 0  → "Vence hoy"      (red)
//       • 1-7  → "Nd restantes"   (amber bg-amber-100)
//       • > 7  → "Nd restantes"   (emerald)
//   - Borde de la card: `urgente` (dias <= 3) lleva border-red-700,
//     el resto usa border-[var(--content-border)]. La distinción es
//     OPERATIVA: el operador ve de un vistazo qué requiere acción.
//   - Filtros por días: 'vencidos' = dias < 0; 'proximos' =
//     0 <= dias <= 30; 'todos' = sin filtro.
//   - Tras ejecutar OK, se recarga la lista (api.getPreventivos se
//     invoca de nuevo). Si esto se rompe, el operador ejecuta un
//     preventivo pero la UI sigue mostrándolo como pendiente.
//   - Toast.loading + Toast.success con id compartido (`tid`) para
//     reemplazar el toast de "Registrando ejecución…" cuando termina.
//
// Riesgos silenciosos que un test atrapa:
//   - Si alguien borra el `|| []` del .then(), la UI rompe con
//     "preventivos.filter is not a function" cuando la API no
//     devuelve la key esperada.
//   - Si alguien quita el `setLoading(false)` del .finally(), la
//     pantalla se queda eternamente en "Cargando preventivos...".
//   - Si alguien cambia el operador de dias < 0 por <= 0, los
//     preventivos del día actual dejarían de contarse como vencidos.
//   - Si la condición `dias <= 3` del borde urgente se cambia por
//     `dias < 3`, los preventivos a 3 días ya no se marcan en rojo
//     y el operador pierde la señal visual.
//   - Si handleEjecutar no checa window.confirm, un click accidental
//     ejecuta el preventivo sin pedir confirmación.
//   - Si el reload tras ejecutar se quita, el operador ejecuta un
//     preventivo pero la UI sigue mostrándolo como pendiente (con
//     el badge de "vencido").
//   - Si la cadena toast.loading(id) → toast.success(_, { id }) se
//     rompe, el operador ve dos toasts en cascada.
//
// Se mockea `../api/sigab` (2 endpoints), `../components/Toast` y
// `window.confirm` (controlable por test).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetPreventivos:      vi.fn(),
  mockEjecutarPreventivo:  vi.fn(),
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
    getPreventivos:     (...a) => mocks.mockGetPreventivos(...a),
    ejecutarPreventivo: (...a) => mocks.mockEjecutarPreventivo(...a),
  },
}));

vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }) => children,
  useToast:      () => mocks.mockToast,
  default:       mocks.mockToast,
}));

import Preventivos from './Preventivos';

// ── Fixtures ──
// Generamos fechas relativas a "hoy" para que diasRestantes dé los
// valores exactos esperados sin importar cuándo se corra el test.
// Usamos UTC midnight para evitar drift por timezone/DST.
const daysFromTodayISO = (days) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

const VENCIDO = {
  id: 1,
  tipo_preventivo: 'Calibración anual',
  equipo_nombre: 'Monitor Philips IntelliVue',
  equipo_serie: 'SN-MX450-001',
  equipo_area: 'UCI Adultos',
  proxima_ejecucion: daysFromTodayISO(-5),
  frecuencia_dias: 365,
  descripcion_procedimiento: 'Calibrar sensores de SpO2 y ECG según protocolo del fabricante.',
};
const HOY = {
  id: 2,
  tipo_preventivo: 'Limpieza de filtros',
  equipo_nombre: 'Ventilador Mindray SV300',
  equipo_serie: null, // opcional — sin serie para forzar rama null
  equipo_area: null, // opcional
  proxima_ejecucion: daysFromTodayISO(0),
  frecuencia_dias: 30,
  descripcion_procedimiento: null, // opcional
};
const PROXIMO_3D = {
  id: 3,
  tipo_preventivo: 'Cambio de batería',
  equipo_nombre: 'Desfibrilador ZOLL R Series',
  equipo_serie: null, // sin serie — no debe renderizar span (SN-XXX)
  equipo_area: 'Urgencias',
  proxima_ejecucion: daysFromTodayISO(3),
  frecuencia_dias: 180,
  descripcion_procedimiento: 'Reemplazo de batería interna y prueba de descarga.',
};
const PROXIMO_10D = {
  id: 4,
  tipo_preventivo: 'Verificación funcional',
  equipo_nombre: 'Bomba de infusión',
  equipo_serie: 'SN-BI-777',
  equipo_area: 'Pediatría',
  proxima_ejecucion: daysFromTodayISO(10),
  frecuencia_dias: 90,
  descripcion_procedimiento: 'Prueba de precisión de flujo y alarmas.',
};
const LEJANO_60D = {
  id: 5,
  tipo_preventivo: 'Mantenimiento mayor',
  equipo_nombre: 'TAC Siemens SOMATOM',
  equipo_serie: 'SN-TAC-001',
  equipo_area: 'Imagenología',
  proxima_ejecucion: daysFromTodayISO(60),
  frecuencia_dias: 180,
  descripcion_procedimiento: 'Inspección completa del tubo de rayos y calibración.',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Silenciar console.error — los .catch() de cargar/ejecutar imprimen
  // en errores esperados y contaminan stderr.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // window.confirm por defecto a true; cada test lo sobreescribe.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

// Helper: renderiza y espera a que la promesa inicial de getPreventivos
// se asiente. El useEffect del mount llama a cargar() y el .finally()
// apaga loading.
const renderPreventivos = async () => {
  render(<Preventivos />);
  await act(async () => {
    await Promise.resolve();
  });
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Render base
// ────────────────────────────────────────────────────────────────────────────
describe('Preventivos — render base', () => {
  it('muestra "Cargando preventivos..." mientras la promesa no resuelve', () => {
    // Promesa que nunca resuelve durante este test: loading se queda en true.
    mocks.mockGetPreventivos.mockReturnValue(new Promise(() => {}));

    render(<Preventivos />);

    expect(screen.getByText('Cargando preventivos...')).toBeInTheDocument();
    // El filtro Todos/Vencidos/Próximos se renderiza también durante loading.
    expect(screen.getByRole('button', { name: /^todos$/i })).toBeInTheDocument();
    // Ningún item debe filtrarse al DOM durante loading.
    expect(screen.queryByText(VENCIDO.tipo_preventivo)).not.toBeInTheDocument();
  });

  it('renderiza header + 3 botones de filtro + cards cuando la API responde', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({
      preventivos: [VENCIDO, HOY, PROXIMO_10D, LEJANO_60D],
    });

    await renderPreventivos();

    // Header.
    expect(screen.getByRole('heading', { name: /mantenimientos preventivos/i, level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText('Programación y seguimiento de preventivos')).toBeInTheDocument();

    // 3 botones de filtro.
    expect(screen.getByRole('button', { name: /^todos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^vencidos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^próximos 30d$/i })).toBeInTheDocument();

    // Los 4 tipos preventivos se renderizan (filtro default = todos).
    expect(screen.getByText('Calibración anual')).toBeInTheDocument();
    expect(screen.getByText('Limpieza de filtros')).toBeInTheDocument();
    expect(screen.getByText('Verificación funcional')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento mayor')).toBeInTheDocument();
  });

  it('renderiza la metadata completa de cada card', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [VENCIDO] });

    await renderPreventivos();

    // Tipo preventivo como <h3>.
    expect(screen.getByRole('heading', { name: 'Calibración anual', level: 3 }))
      .toBeInTheDocument();
    // Equipo + serie entre paréntesis.
    expect(screen.getByText('Monitor Philips IntelliVue')).toBeInTheDocument();
    expect(screen.getByText('(SN-MX450-001)')).toBeInTheDocument();
    // Área (sólo si está definida).
    expect(screen.getByText('Área: UCI Adultos')).toBeInTheDocument();
    // Descripción del procedimiento.
    expect(screen.getByText(/calibrar sensores de spo2 y ecg/i)).toBeInTheDocument();
    // Próxima ejecución como ISO + frecuencia.
    expect(screen.getByText(daysFromTodayISO(-5))).toBeInTheDocument();
    expect(screen.getByText('Cada 365 días')).toBeInTheDocument();
  });

  it('omite serie/área/descripción cuando son null', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [HOY] });

    await renderPreventivos();

    // HOY tiene equipo_serie=null → NO debe renderizar span (SN-XXX).
    // El componente renderiza el nombre en un <p> y la serie en un <span>
    // hermano: {pp.equipo_nombre}{pp.equipo_serie && (<span>...</span>)}.
    // Si la serie es null, el <p> contiene SOLO el text node del nombre.
    const equipoParrafo = screen.getByText('Ventilador Mindray SV300').closest('p');
    expect(equipoParrafo.querySelector('span')).toBeNull();

    // HOY tiene equipo_area=null → no debe aparecer "Área: ...".
    expect(screen.queryByText(/^área:/i)).not.toBeInTheDocument();

    // HOY tiene descripcion_procedimiento=null → no debe aparecer el <p>
    // line-clamp-2 que la mostraría.
    expect(screen.queryByText(/reemplazo de batería/i)).not.toBeInTheDocument();
  });

  it('cada card tiene su propio botón "Marcar ejecutado"', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({
      preventivos: [VENCIDO, HOY, PROXIMO_10D, LEJANO_60D],
    });

    await renderPreventivos();

    // 4 cards → 4 botones. (Usamos queryAllByRole porque el texto es idéntico.)
    const botones = screen.queryAllByRole('button', { name: /marcar ejecutado/i });
    expect(botones).toHaveLength(4);
  });

  it('tolerancia: si la API no devuelve la key `preventivos`, trata como vacío', async () => {
    // Cubre el `res.preventivos || []` cuando la respuesta es {} o sin
    // la key. Sin este fallback, .filter() rompe con TypeError.
    mocks.mockGetPreventivos.mockResolvedValue({});

    await renderPreventivos();

    expect(screen.getByText('Sin preventivos en esta categoría.')).toBeInTheDocument();
    // El filtro sigue visible (es independiente de la lista).
    expect(screen.getByRole('button', { name: /^todos$/i })).toBeInTheDocument();
  });

  it('muestra empty state cuando la API rechaza', async () => {
    // Si la carga falla, loading se apaga (gracias al .finally()) y la
    // lista queda en [] → empty state. Además dispara toast.error.
    mocks.mockGetPreventivos.mockRejectedValue(new Error('Network'));

    await renderPreventivos();

    expect(screen.getByText('Sin preventivos en esta categoría.')).toBeInTheDocument();
    expect(mocks.mockToast.error).toHaveBeenCalledWith(
      'No se pudieron cargar los preventivos',
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Filtros
// ────────────────────────────────────────────────────────────────────────────
describe('Preventivos — filtros', () => {
  it('filtro "vencidos" muestra sólo los preventivos con dias < 0', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({
      preventivos: [VENCIDO, HOY, PROXIMO_3D, PROXIMO_10D, LEJANO_60D],
    });

    await renderPreventivos();

    // Estado inicial: filtro "Todos" activo, los 5 visibles.
    expect(screen.queryAllByRole('button', { name: /marcar ejecutado/i })).toHaveLength(5);

    // Click en "Vencidos" → sólo VENCIDO (-5 días).
    fireEvent.click(screen.getByRole('button', { name: /^vencidos$/i }));

    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /marcar ejecutado/i })).toHaveLength(1);
    });
    expect(screen.getByText('Calibración anual')).toBeInTheDocument();
    expect(screen.queryByText('Limpieza de filtros')).not.toBeInTheDocument();
    expect(screen.queryByText('Cambio de batería')).not.toBeInTheDocument();
    expect(screen.queryByText('Verificación funcional')).not.toBeInTheDocument();
    expect(screen.queryByText('Mantenimiento mayor')).not.toBeInTheDocument();
  });

  it('filtro "próximos 30d" muestra los preventivos con 0 <= dias <= 30', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({
      preventivos: [VENCIDO, HOY, PROXIMO_3D, PROXIMO_10D, LEJANO_60D],
    });

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /^próximos 30d$/i }));

    await waitFor(() => {
      // HOY (0d), PROXIMO_3D (3d), PROXIMO_10D (10d) → 3 cards.
      // VENCIDO (-5d) y LEJANO_60D (60d) quedan fuera.
      expect(screen.queryAllByRole('button', { name: /marcar ejecutado/i })).toHaveLength(3);
    });
    expect(screen.getByText('Limpieza de filtros')).toBeInTheDocument();
    expect(screen.getByText('Cambio de batería')).toBeInTheDocument();
    expect(screen.getByText('Verificación funcional')).toBeInTheDocument();
    expect(screen.queryByText('Calibración anual')).not.toBeInTheDocument();
    expect(screen.queryByText('Mantenimiento mayor')).not.toBeInTheDocument();
  });

  it('filtro "vencidos" con ningún match muestra empty state', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({
      preventivos: [HOY, PROXIMO_10D, LEJANO_60D], // ninguno vencido
    });

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /^vencidos$/i }));

    await waitFor(() => {
      expect(screen.getByText('Sin preventivos en esta categoría.')).toBeInTheDocument();
    });
  });

  it('el botón de filtro activo lleva bg-emerald-600 text-white', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [VENCIDO] });

    await renderPreventivos();

    const todosBtn = screen.getByRole('button', { name: /^todos$/i });
    expect(todosBtn.className).toMatch(/bg-emerald-600/);
    expect(todosBtn.className).toMatch(/text-white/);

    // Tras cambiar a Vencidos, el estilo emigra al nuevo botón.
    fireEvent.click(screen.getByRole('button', { name: /^vencidos$/i }));

    await waitFor(() => {
      const vencidosBtn = screen.getByRole('button', { name: /^vencidos$/i });
      expect(vencidosBtn.className).toMatch(/bg-emerald-600/);
      const todosBtnAfter = screen.getByRole('button', { name: /^todos$/i });
      expect(todosBtnAfter.className).not.toMatch(/bg-emerald-600/);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. BadgeVencimiento — 4 ramas de color
// ────────────────────────────────────────────────────────────────────────────
describe('Preventivos — BadgeVencimiento', () => {
  it('días < 0 → "Vencido hace Nd" con clases rojas', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [VENCIDO] });

    await renderPreventivos();

    const badge = screen.getByText(/vencido hace 5d/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-100/);
    expect(badge.className).toMatch(/text-red-700/);
  });

  it('días = 0 → "Vence hoy" con clases rojas', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [HOY] });

    await renderPreventivos();

    const badge = screen.getByText('Vence hoy');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-100/);
    expect(badge.className).toMatch(/text-red-700/);
  });

  it('1 <= días <= 7 → "Nd restantes" con clases amber', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_3D] });

    await renderPreventivos();

    const badge = screen.getByText(/^3d restantes$/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-amber-100/);
    expect(badge.className).toMatch(/text-amber-700/);
  });

  it('días > 7 → "Nd restantes" con clases emerald', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });

    await renderPreventivos();

    const badge = screen.getByText(/^10d restantes$/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-emerald-100/);
    expect(badge.className).toMatch(/text-emerald-700/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Borde urgente (días <= 3)
// ────────────────────────────────────────────────────────────────────────────
describe('Preventivos — borde urgente', () => {
  it('card con días <= 3 lleva border-red-700', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [HOY, PROXIMO_3D] });

    await renderPreventivos();

    // HOY (0d) y PROXIMO_3D (3d) deben tener borde rojo.
    const cards = screen.getAllByRole('heading', { level: 3 }).map(h => h.closest('div.bg-\\[var\\(--content-surface\\)\\]'));
    expect(cards.length).toBeGreaterThanOrEqual(2);
    for (const card of cards) {
      expect(card.className).toMatch(/border-red-700/);
    }
  });

  it('card con días > 3 usa border-[var(--content-border)] (NO rojo)', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D, LEJANO_60D] });

    await renderPreventivos();

    const headings = screen.getAllByRole('heading', { level: 3 });
    for (const h of headings) {
      const card = h.closest('div.bg-\\[var\\(--content-surface\\)\\]');
      expect(card.className).not.toMatch(/border-red-700/);
      expect(card.className).toMatch(/border-\[var\(--content-border\)\]/);
    }
  });

  it('card vencida (-5d) también es urgente (dias <= 3 cubre negativos)', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [VENCIDO] });

    await renderPreventivos();

    const card = screen.getByRole('heading', { name: 'Calibración anual', level: 3 })
      .closest('div.bg-\\[var\\(--content-surface\\)\\]');
    expect(card.className).toMatch(/border-red-700/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. handleEjecutar — flow completo
// ────────────────────────────────────────────────────────────────────────────
describe('Preventivos — handleEjecutar', () => {
  it('confirm cancelado → NO llama api.ejecutarPreventivo', async () => {
    window.confirm.mockReturnValue(false);
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      '¿Registrar este preventivo como ejecutado hoy?',
    );
    expect(mocks.mockEjecutarPreventivo).not.toHaveBeenCalled();
    // Tampoco debe mostrar toast.
    expect(mocks.mockToast.loading).not.toHaveBeenCalled();
  });

  it('confirm aceptado → llama api.ejecutarPreventivo con el id correcto', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });
    mocks.mockEjecutarPreventivo.mockResolvedValue({});

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    await waitFor(() => {
      expect(mocks.mockEjecutarPreventivo).toHaveBeenCalledWith(PROXIMO_10D.id);
    });
  });

  it('éxito → toast.loading seguido de toast.success con el MISMO id', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });
    mocks.mockEjecutarPreventivo.mockResolvedValue({});

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    await waitFor(() => {
      // El id del loading debe reusarse en el success (patrón `tid`
      // que reemplaza el toast de loading en lugar de apilar dos).
      expect(mocks.mockToast.loading).toHaveBeenCalledWith('Registrando ejecución…');
      expect(mocks.mockToast.success).toHaveBeenCalledWith(
        'Preventivo registrado como ejecutado',
        { id: 'toast-id-loading' },
      );
    });
  });

  it('éxito → recarga la lista llamando getPreventivos de nuevo', async () => {
    mocks.mockGetPreventivos
      .mockResolvedValueOnce({ preventivos: [PROXIMO_10D] }) // carga inicial
      .mockResolvedValueOnce({ preventivos: [] });            // recarga post-ejecutar
    mocks.mockEjecutarPreventivo.mockResolvedValue({});

    await renderPreventivos();

    // Tras render inicial, getPreventivos se llamó 1 vez.
    expect(mocks.mockGetPreventivos).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    await waitFor(() => {
      // Tras ejecutar OK, se recarga → 2 llamadas.
      expect(mocks.mockGetPreventivos).toHaveBeenCalledTimes(2);
    });
  });

  it('error del backend con detail → toast.error muestra el detail del backend', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });
    mocks.mockEjecutarPreventivo.mockRejectedValue({
      response: { data: { detail: 'Equipo bloqueado por orden correctiva abierta' } },
    });

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Equipo bloqueado por orden correctiva abierta',
        { id: 'toast-id-loading' },
      );
    });
    // El success NO debe haberse llamado.
    expect(mocks.mockToast.success).not.toHaveBeenCalled();
  });

  it('error del backend sin detail → toast.error con mensaje genérico', async () => {
    // Cubre el fallback `err?.response?.data?.detail || 'No se pudo...'`.
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });
    mocks.mockEjecutarPreventivo.mockRejectedValue(new Error('Network'));

    await renderPreventivos();

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'No se pudo registrar el preventivo',
        { id: 'toast-id-loading' },
      );
    });
  });

  it('error → NO recarga la lista (sólo se recarga en éxito)', async () => {
    mocks.mockGetPreventivos.mockResolvedValue({ preventivos: [PROXIMO_10D] });
    mocks.mockEjecutarPreventivo.mockRejectedValue(new Error('Network'));

    await renderPreventivos();
    expect(mocks.mockGetPreventivos).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /marcar ejecutado/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalled();
    });
    // Tras el error, NO debe haber recarga.
    expect(mocks.mockGetPreventivos).toHaveBeenCalledTimes(1);
  });
});