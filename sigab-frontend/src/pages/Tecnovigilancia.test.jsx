// src/pages/Tecnovigilancia.test.jsx
// Tecnovigilancia es el módulo de compliance legal para reportes de
// eventos adversos a COFEPRIS bajo NOM-240-SSA1-2012. Es una página de
// 199 líneas que concentra varios patrones sutiles:
//
//   - Estado loading inicial con useEffect + .finally() para apagarlo.
//   - 1 endpoint: api.getEventos con params { estado, severidad, busqueda }.
//   - Tolerancia a respuesta sin la key `eventos` (fallback `|| []`).
//   - 6 filtros de estado + 5 filtros de severidad (chips con clase
//     condicional: estado activo → bg-emerald-100 text-emerald-700;
//     severidad activa → bg-red-100 text-red-600).
//   - Búsqueda con `onChange` re-dispara cargar (useCallback deps
//     [estadoFiltro, severidadFiltro, busqueda]).
//   - Tabla con 7 columnas (No. Reporte, Dispositivo, Tipo, Severidad,
//     Estado, Fecha evento, Reportante) y badges con clases CSS de
//     TV_SEVERIDAD_COLORS / TV_ESTADO_COLORS.
//   - Severidad badge: `ev.severidad?.toUpperCase()` — punto crítico
//     para que el operador vea CRITICA/GRAVE/MODERADA/LEVE en mayúsculas.
//   - formatFecha: null → '—'; ISO → toLocaleDateString('es-MX'); fallback
//     String(f) si new Date() falla (try/catch defensivo).
//   - Singular/plural: "1 evento" vs "N eventos" — un fix que rompa
//     esto deja un contador con gramática rota.
//   - Click en fila → abre EventoDetalleModal (modal independiente con
//     lifecycle propio).
//   - "Reportar evento" (desktop) + FAB móvil abren EventoAdversoModal.
//     El onCreated(num) llama cargar() de nuevo para refrescar la lista.
//   - Empty state con SVG inline + texto "Sin eventos adversos
//     registrados con ese filtro." (NO "No hay datos").
//
// Riesgos silenciosos cubiertos:
//   - Si alguien borra el `|| []` del .then(), la UI rompe con
//     "eventos.map is not a function" cuando la API devuelve {}.
//   - Si alguien quita el `setLoading(false)` del .finally(), la
//     pantalla se queda eternamente en "Cargando eventos...".
//   - Si los params de cargar se eliminan (estado/severidad/busqueda
//     undefined → no se envían), los filtros se vuelven no-op.
//   - Si la condición `estadoFiltro === e` se rompe, ningún botón se
//     marca como activo y la UI pierde feedback visual.
//   - Si `ev.severidad?.toUpperCase()` se cambia por `ev.severidad`,
//     los badges se renderizan en minúsculas (inconsistencia visual).
//   - Si la condición `eventos.length !== 1 ? 's' : ''` se rompe,
//     el contador puede decir "1 eventos" (gramática rota).
//   - Si el onClick de la fila se desconecta, el modal de detalle
//     nunca abre y el operador no puede investigar el evento.
//   - Si el onCreated no llama cargar(), la lista queda desactualizada
//     tras crear un evento y el operador no ve su propio registro.
//   - Si el fallback `err?.message || err` se quita, los errores de red
//     se reportan como genéricos ("No se pudieron cargar…").
//
// Se mockea `../api/sigab` (1 endpoint), `../components/Toast`, y los
// dos modales pesados (EventoAdversoModal 389 líneas, EventoDetalleModal
// 529 líneas) que se prueban en su sitio.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  mockGetEventos: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error:   vi.fn(),
    info:    vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../api/sigab', () => ({
  api: {
    getEventos: (...args) => mocks.mockGetEventos(...args),
  },
}));

vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }) => children,
  useToast:      () => mocks.mockToast,
  default:       mocks.mockToast,
}));

// Mock modales pesados — no estamos testeando los modales aquí, sólo que
// Tecnovigilancia los monte correctamente y propague los handlers.
vi.mock('../components/EventoAdversoModal', () => ({
  default: ({ onClose, onCreated }) => (
    <div data-testid="mock-evento-crear">
      MODAL_CREAR
      <button onClick={onClose}>CANCEL_CREAR</button>
      <button onClick={() => onCreated('TV-2026-001')}>CONFIRM_CREAR</button>
    </div>
  ),
}));

vi.mock('../components/EventoDetalleModal', () => ({
  default: ({ eventoId, onClose, onUpdated }) => (
    <div data-testid="mock-evento-detalle" data-evento-id={eventoId}>
      MODAL_DETALLE:{eventoId}
      <button onClick={onClose}>CLOSE_DETALLE</button>
      <button onClick={onUpdated}>REFRESH_DETALLE</button>
    </div>
  ),
}));

import Tecnovigilancia from './Tecnovigilancia';

// ── Fixtures ──
// 5 eventos cubren los 4 colores de severidad + 5 colores de estado
// + bordes (fecha_evento null/inválida/ISO válida).
const EV_CRITICO = {
  id: 1,
  numero_reporte: 'TV-2026-001',
  dispositivo_nombre: 'Ventilador Mindray SV300',
  tipo_evento: 'muerte',
  severidad: 'critica',
  estado: 'escalado_cofepris',
  fecha_evento: '2026-06-20T14:30:00Z',
  reportante_nombre: 'Dr. Juan Pérez',
};

const EV_GRAVE = {
  id: 2,
  numero_reporte: 'TV-2026-002',
  dispositivo_nombre: 'Monitor Philips IntelliVue',
  tipo_evento: 'lesion_grave',
  severidad: 'grave',
  estado: 'en_investigacion',
  fecha_evento: '2026-06-15T09:00:00Z',
  reportante_nombre: 'Ing. María López',
};

const EV_MODERADA = {
  id: 3,
  numero_reporte: 'TV-2026-003',
  dispositivo_nombre: 'Desfibrilador ZOLL R Series',
  tipo_evento: 'deterioro_temporal',
  severidad: 'moderada',
  estado: 'reportado',
  fecha_evento: '2026-06-10T11:15:00Z',
  reportante_nombre: 'Dr. Carlos Ruiz',
};

const EV_LEVE = {
  id: 4,
  numero_reporte: 'TV-2026-004',
  dispositivo_nombre: 'Bomba de infusión Alaris',
  tipo_evento: 'falla_funcional',
  severidad: 'leve',
  estado: 'cerrado',
  fecha_evento: null, // forzar formatFecha(null) → '—'
  reportante_nombre: null, // opcional
};

const EV_DOCUMENTADO = {
  id: 5,
  numero_reporte: 'TV-2026-005',
  dispositivo_nombre: 'TAC Siemens SOMATOM',
  tipo_evento: 'riesgo_potencial',
  severidad: 'moderada',
  estado: 'documentado',
  fecha_evento: 'invalid-date-string', // forzar fallback String(f)
  reportante_nombre: 'Dr. Ana Gómez',
};

// ── Helpers ──
function setupApi(eventos = [EV_CRITICO, EV_GRAVE, EV_MODERADA, EV_LEVE, EV_DOCUMENTADO]) {
  mocks.mockGetEventos.mockResolvedValue({ eventos });
}

function renderT() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Tecnovigilancia />
    </MemoryRouter>
  );
}

async function renderAndWait() {
  renderT();
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // console.error se silencia — el .catch() de cargar imprime en errores esperados.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});

// ────────────────────────────────────────────────────────────────────────────
// 1. Render base — header, subtítulo, botones, FAB móvil, filtros
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — render base', () => {
  it('muestra "Cargando eventos..." mientras la promesa no resuelve', () => {
    mocks.mockGetEventos.mockReturnValue(new Promise(() => {}));

    renderT();

    expect(screen.getByText('Cargando eventos...')).toBeInTheDocument();
    // Los filtros se renderizan también durante loading.
    expect(screen.getByRole('button', { name: /^todos$/i })).toBeInTheDocument();
  });

  it('renderiza header + subtítulo NOM-240 + botón "Reportar evento" cuando carga OK', async () => {
    setupApi([]);

    await renderAndWait();

    expect(screen.getByRole('heading', { name: 'Tecnovigilancia', level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText(/NOM-240-SSA1-2012/i)).toBeInTheDocument();
    // Hay 2 botones con "Reportar evento": desktop + FAB. Verificamos que
    // existe al menos uno con el nombre exacto (excluye FAB cuyo title
    // accesible es "Reportar evento adverso").
    const reportarBtns = screen.getAllByRole('button', { name: /reportar evento/i });
    expect(reportarBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza el FAB móvil (md:hidden fixed) además del botón desktop', async () => {
    setupApi([]);

    await renderAndWait();

    // El botón desktop tiene el texto "Reportar evento".
    const desktopBtns = screen.getAllByRole('button', { name: /reportar evento/i });
    // 2 botones: desktop + FAB móvil.
    expect(desktopBtns.length).toBe(2);

    // El FAB móvil lleva title="Reportar evento adverso" (descripción larga).
    const fabByTitle = screen.getByTitle('Reportar evento adverso');
    expect(fabByTitle).toBeInTheDocument();
  });

  it('renderiza 6 botones de filtro de estado y 5 de severidad', async () => {
    setupApi([]);

    await renderAndWait();

    // Estado: Todos, Reportado, En investigación, Documentado, Escalado COFEPRIS, Cerrado
    expect(screen.getByRole('button', { name: /^todos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reportado$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^en investigación$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^documentado$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^escalado cofepris$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cerrado$/i })).toBeInTheDocument();

    // Severidad: Todas, critica, grave, moderada, leve (en minúsculas DOM, CSS capitaliza).
    expect(screen.getByRole('button', { name: /^todas$/i })).toBeInTheDocument();
    const sevBtns = screen.getAllByRole('button', { name: /^(critica|grave|moderada|leve)$/i });
    expect(sevBtns).toHaveLength(4);
  });

  it('renderiza input de búsqueda con placeholder correcto', async () => {
    setupApi([]);

    await renderAndWait();

    const input = screen.getByPlaceholderText(/buscar por no\. reporte o dispositivo/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Empty state — sin eventos o API que devuelve shape ausente
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — empty state', () => {
  it('muestra empty state con SVG y mensaje correcto cuando la lista está vacía', async () => {
    setupApi([]);

    await renderAndWait();

    expect(screen.getByText(/sin eventos adversos registrados con ese filtro/i))
      .toBeInTheDocument();
    // Hay un SVG dentro del empty state (checkmark de escudo).
    const emptyContainer = screen.getByText(/sin eventos adversos/i).closest('div');
    expect(emptyContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('tolerancia: si la API no devuelve la key `eventos`, trata como vacío sin romper', async () => {
    // Cubre `res.eventos || []` cuando la respuesta es {} o sin la key.
    mocks.mockGetEventos.mockResolvedValue({});

    await renderAndWait();

    expect(screen.getByText(/sin eventos adversos registrados con ese filtro/i))
      .toBeInTheDocument();
  });

  it('muestra empty state cuando la API rechaza + toast.error', async () => {
    mocks.mockGetEventos.mockRejectedValue(new Error('Network'));

    await renderAndWait();

    expect(screen.getByText(/sin eventos adversos registrados con ese filtro/i))
      .toBeInTheDocument();
    expect(mocks.mockToast.error).toHaveBeenCalledWith(
      'No se pudieron cargar los eventos de tecnovigilancia',
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Tabla render — 7 columnas + filas + singular/plural
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — tabla render', () => {
  it('renderiza los 7 headers de columna en orden', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    // <thead> tiene los headers como <th>.
    const table = screen.getByRole('table');
    const headers = table.querySelectorAll('th');
    expect(headers).toHaveLength(7);
    expect(headers[0]).toHaveTextContent(/no\. reporte/i);
    expect(headers[1]).toHaveTextContent(/dispositivo/i);
    expect(headers[2]).toHaveTextContent(/tipo/i);
    expect(headers[3]).toHaveTextContent(/severidad/i);
    expect(headers[4]).toHaveTextContent(/estado/i);
    expect(headers[5]).toHaveTextContent(/fecha evento/i);
    expect(headers[6]).toHaveTextContent(/reportante/i);
  });

  it('renderiza cada evento como una fila clickeable', async () => {
    setupApi([EV_CRITICO, EV_GRAVE]);

    await renderAndWait();

    // 2 filas en tbody.
    const rows = screen.getAllByRole('row');
    // 1 header + 2 body rows.
    expect(rows.length).toBe(3);

    // Cada fila muestra el número de reporte y el dispositivo.
    expect(screen.getByText('TV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('TV-2026-002')).toBeInTheDocument();
    expect(screen.getByText('Ventilador Mindray SV300')).toBeInTheDocument();
    expect(screen.getByText('Monitor Philips IntelliVue')).toBeInTheDocument();
  });

  it('muestra "1 evento" (singular) cuando hay un solo registro', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    expect(screen.getByText('1 evento')).toBeInTheDocument();
  });

  it('muestra "N eventos" (plural) cuando hay varios registros', async () => {
    setupApi([EV_CRITICO, EV_GRAVE, EV_MODERADA]);

    await renderAndWait();

    expect(screen.getByText('3 eventos')).toBeInTheDocument();
  });

  it('muestra "—" para campos opcionales null (dispositivo/reporte)', async () => {
    setupApi([EV_LEVE]); // fecha_evento=null, reportante_nombre=null

    await renderAndWait();

    // "—" aparece al menos para fecha_evento y reportante_nombre.
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Badge severidad — 4 colores con UPPERCASE
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — badge severidad', () => {
  it('critica → CRITICA + clases rojas (bg-red-600/30 text-red-300)', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    const badge = screen.getByText('CRITICA');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-600\/30/);
    expect(badge.className).toMatch(/text-red-300/);
  });

  it('grave → GRAVE + clases naranja (bg-orange-500/20 text-orange-400)', async () => {
    setupApi([EV_GRAVE]);

    await renderAndWait();

    const badge = screen.getByText('GRAVE');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-orange-500\/20/);
    expect(badge.className).toMatch(/text-orange-400/);
  });

  it('moderada → MODERADA + clases amarillas (bg-yellow-500/20 text-yellow-400)', async () => {
    setupApi([EV_MODERADA]);

    await renderAndWait();

    const badge = screen.getByText('MODERADA');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-yellow-500\/20/);
    expect(badge.className).toMatch(/text-yellow-400/);
  });

  it('leve → LEVE + clases grises (bg-slate-500/20 text-slate-400)', async () => {
    setupApi([EV_LEVE]);

    await renderAndWait();

    const badge = screen.getByText('LEVE');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-slate-500\/20/);
    expect(badge.className).toMatch(/text-slate-400/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Badge estado — 5 colores según TV_ESTADO_COLORS
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — badge estado', () => {
  // Helper: el badge es un <span> dentro de la celda de estado. El mismo
  // texto aparece como filtro chip (botón) arriba, así que scoping a
  // 'span' lo desambigua.
  const getEstadoBadge = (text) => {
    const matches = screen.getAllByText(text, { selector: 'span' });
    return matches.find((el) => el.className.includes('rounded'));
  };

  it('reportado → clases azules (bg-blue-500/20 text-blue-400)', async () => {
    setupApi([EV_MODERADA]); // estado=reportado

    await renderAndWait();

    const badge = getEstadoBadge('Reportado');
    expect(badge).toBeDefined();
    expect(badge.className).toMatch(/bg-blue-500\/20/);
    expect(badge.className).toMatch(/text-blue-400/);
  });

  it('en_investigacion → clases amarillas (bg-yellow-500/20 text-yellow-400)', async () => {
    setupApi([EV_GRAVE]); // estado=en_investigacion

    await renderAndWait();

    const badge = getEstadoBadge('En investigación');
    expect(badge).toBeDefined();
    expect(badge.className).toMatch(/bg-yellow-500\/20/);
    expect(badge.className).toMatch(/text-yellow-400/);
  });

  it('documentado → clases púrpura (bg-purple-500/20 text-purple-400)', async () => {
    setupApi([EV_DOCUMENTADO]); // estado=documentado

    await renderAndWait();

    const badge = getEstadoBadge('Documentado');
    expect(badge).toBeDefined();
    expect(badge.className).toMatch(/bg-purple-500\/20/);
    expect(badge.className).toMatch(/text-purple-400/);
  });

  it('escalado_cofepris → clases naranja (bg-orange-500/20 text-orange-400)', async () => {
    setupApi([EV_CRITICO]); // estado=escalado_cofepris

    await renderAndWait();

    const badge = getEstadoBadge('Escalado COFEPRIS');
    expect(badge).toBeDefined();
    expect(badge.className).toMatch(/bg-orange-500\/20/);
    expect(badge.className).toMatch(/text-orange-400/);
  });

  it('cerrado → clases esmeralda (bg-emerald-500/20 text-emerald-400)', async () => {
    setupApi([EV_LEVE]); // estado=cerrado

    await renderAndWait();

    const badge = getEstadoBadge('Cerrado');
    expect(badge).toBeDefined();
    expect(badge.className).toMatch(/bg-emerald-500\/20/);
    expect(badge.className).toMatch(/text-emerald-400/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. formatFecha — null/undefined/inválido/ISO
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — formatFecha', () => {
  it('null → "—" (placeholder defensivo)', async () => {
    setupApi([EV_LEVE]); // fecha_evento=null

    await renderAndWait();

    // El "—" para fecha_evento está dentro de la celda. Lo encontramos
    // por scoping via getAllByText. La celda de fecha es la columna 6.
    const row = screen.getByText('TV-2026-004').closest('tr');
    const cells = row.querySelectorAll('td');
    expect(cells[5]).toHaveTextContent('—');
  });

  it('ISO válida → formatea con toLocaleDateString (es-MX, día/mes/año)', async () => {
    setupApi([EV_CRITICO]); // 2026-06-20

    await renderAndWait();

    const row = screen.getByText('TV-2026-001').closest('tr');
    const cells = row.querySelectorAll('td');
    const fechaCell = cells[5].textContent;

    // No debe ser "—" (eso es sólo para null) ni el ISO crudo.
    expect(fechaCell).not.toBe('—');
    expect(fechaCell).not.toBe('2026-06-20T14:30:00Z');

    // En jsdom con es-MX y day:'2-digit' el formato es "20 jun 2026" o
    // similar. Validamos que contenga el año "2026" y un día "20".
    expect(fechaCell).toMatch(/2026/);
    expect(fechaCell).toMatch(/20/);
  });

  it('string inválido → fallback String(f) sin romper', async () => {
    setupApi([EV_DOCUMENTADO]); // fecha_evento='invalid-date-string'

    await renderAndWait();

    const row = screen.getByText('TV-2026-005').closest('tr');
    const cells = row.querySelectorAll('td');
    const fechaCell = cells[5].textContent;

    // new Date('invalid-date-string') lanza Invalid Date → toLocaleDateString
    // devuelve 'Invalid Date' string en jsdom, o cae al catch String(f).
    // Aceptamos cualquiera de los dos como "no rompe".
    expect(fechaCell.length).toBeGreaterThan(0);
    expect(fechaCell).not.toBe('—');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Filtros — click cambia filtro activo y re-dispara cargar
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — filtros', () => {
  it('click en filtro de estado "Reportado" lo marca activo y re-dispara cargar', async () => {
    setupApi([EV_CRITICO, EV_GRAVE, EV_MODERADA]);

    await renderAndWait();

    // Mount inicial: cargar llamado 1 vez sin params.
    expect(mocks.mockGetEventos).toHaveBeenCalledTimes(1);
    expect(mocks.mockGetEventos).toHaveBeenLastCalledWith({});

    // Click "Reportado".
    fireEvent.click(screen.getByRole('button', { name: /^reportado$/i }));

    await waitFor(() => {
      expect(mocks.mockGetEventos).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetEventos).toHaveBeenLastCalledWith({
      estado: 'reportado',
      severidad: undefined,
      busqueda: undefined,
    });

    // El botón "Reportado" lleva clase activa bg-emerald-100 text-emerald-700.
    const reportadoBtn = screen.getByRole('button', { name: /^reportado$/i });
    expect(reportadoBtn.className).toMatch(/bg-emerald-100/);
    expect(reportadoBtn.className).toMatch(/text-emerald-700/);
  });

  it('click en filtro de severidad "critica" lo marca activo y re-dispara cargar', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /^critica$/i }));

    await waitFor(() => {
      expect(mocks.mockGetEventos).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetEventos).toHaveBeenLastCalledWith({
      estado: undefined,
      severidad: 'critica',
      busqueda: undefined,
    });

    // Severidad activa lleva bg-red-100 text-red-600.
    const criticaBtn = screen.getByRole('button', { name: /^critica$/i });
    expect(criticaBtn.className).toMatch(/bg-red-100/);
    expect(criticaBtn.className).toMatch(/text-red-600/);
  });

  it('escribir en búsqueda re-dispara cargar con el parámetro', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    const input = screen.getByPlaceholderText(/buscar por no\. reporte o dispositivo/i);
    fireEvent.change(input, { target: { value: 'ventilador' } });

    await waitFor(() => {
      expect(mocks.mockGetEventos).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetEventos).toHaveBeenLastCalledWith({
      estado: undefined,
      severidad: undefined,
      busqueda: 'ventilador',
    });
    expect(input).toHaveValue('ventilador');
  });

  it('el filtro activo de estado pierde su clase al cambiar a otro', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    // Estado inicial: "Todos" activo.
    const todosBtn = screen.getByRole('button', { name: /^todos$/i });
    expect(todosBtn.className).toMatch(/bg-emerald-100/);

    // Cambiar a "Cerrado".
    fireEvent.click(screen.getByRole('button', { name: /^cerrado$/i }));

    await waitFor(() => {
      const cerradoBtn = screen.getByRole('button', { name: /^cerrado$/i });
      expect(cerradoBtn.className).toMatch(/bg-emerald-100/);
    });
    expect(todosBtn.className).not.toMatch(/bg-emerald-100/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Modales — click row abre detalle, click "Reportar" abre crear
// ────────────────────────────────────────────────────────────────────────────
describe('Tecnovigilancia — modales', () => {
  it('click en una fila abre EventoDetalleModal con el id del evento', async () => {
    setupApi([EV_CRITICO, EV_GRAVE]);

    await renderAndWait();

    // No debe haber modal al inicio.
    expect(screen.queryByTestId('mock-evento-detalle')).not.toBeInTheDocument();

    // Click en la fila del primer evento.
    const row = screen.getByText('TV-2026-001').closest('tr');
    fireEvent.click(row);

    // Modal de detalle abierto con eventoId=1.
    const detalle = screen.getByTestId('mock-evento-detalle');
    expect(detalle).toBeInTheDocument();
    expect(detalle).toHaveAttribute('data-evento-id', '1');
  });

  it('click en "Cerrar" del detalle cierra el modal', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    fireEvent.click(screen.getByText('TV-2026-001').closest('tr'));
    expect(screen.getByTestId('mock-evento-detalle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('CLOSE_DETALLE'));

    expect(screen.queryByTestId('mock-evento-detalle')).not.toBeInTheDocument();
  });

  it('click en botón desktop "Reportar evento" abre EventoAdversoModal', async () => {
    setupApi([]);

    await renderAndWait();

    expect(screen.queryByTestId('mock-evento-crear')).not.toBeInTheDocument();

    // Hay 2 botones con "Reportar evento": desktop (texto) + FAB (title).
    // El desktop lleva el texto accesible exacto "Reportar evento"; el
    // FAB lleva title="Reportar evento adverso". Usamos getAllByRole y
    // tomamos el primero (desktop).
    const buttons = screen.getAllByRole('button', { name: /reportar evento/i });
    fireEvent.click(buttons[0]);

    expect(screen.getByTestId('mock-evento-crear')).toBeInTheDocument();
  });

  it('click en FAB móvil también abre EventoAdversoModal', async () => {
    setupApi([]);

    await renderAndWait();

    const fab = screen.getByTitle('Reportar evento adverso');
    fireEvent.click(fab);

    expect(screen.getByTestId('mock-evento-crear')).toBeInTheDocument();
  });

  it('onCreated(num) cierra el modal, muestra toast.success y recarga la lista', async () => {
    setupApi([]);

    await renderAndWait();

    // Abrir modal.
    const buttons = screen.getAllByRole('button', { name: /reportar evento/i });
    fireEvent.click(buttons[0]);
    expect(screen.getByTestId('mock-evento-crear')).toBeInTheDocument();

    const initialCalls = mocks.mockGetEventos.mock.calls.length;

    // Confirmar creación con número de reporte TV-2026-001.
    fireEvent.click(screen.getByText('CONFIRM_CREAR'));

    // Modal cerrado.
    expect(screen.queryByTestId('mock-evento-crear')).not.toBeInTheDocument();

    // Toast de éxito con el número de reporte.
    expect(mocks.mockToast.success).toHaveBeenCalledWith('Evento TV-2026-001 registrado');

    // cargar() llamado de nuevo (post-creación).
    await waitFor(() => {
      expect(mocks.mockGetEventos.mock.calls.length).toBe(initialCalls + 1);
    });
  });

  it('onUpdated (detalle) recarga la lista vía cargar()', async () => {
    setupApi([EV_CRITICO]);

    await renderAndWait();

    fireEvent.click(screen.getByText('TV-2026-001').closest('tr'));
    expect(screen.getByTestId('mock-evento-detalle')).toBeInTheDocument();

    const callsBefore = mocks.mockGetEventos.mock.calls.length;

    fireEvent.click(screen.getByText('REFRESH_DETALLE'));

    await waitFor(() => {
      expect(mocks.mockGetEventos.mock.calls.length).toBe(callsBefore + 1);
    });
  });
});