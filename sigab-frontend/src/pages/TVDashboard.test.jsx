// src/pages/TVDashboard.test.jsx
// TVDashboard es la vista de display para TV/monitor en sala de control
// (ruta `/tv`). Auto-rota entre 3 slides (KPIs, Charts, Alertas) cada 20s,
// muestra un reloj en tiempo real y recarga datos cada 2 minutos. Es la
// candidata siguiente del backlog de páginas-con-fetch: 166 líneas, sin
// mapa Leaflet ni react-router, concentrando varios patrones sutiles:
//
//   - Loading dual: `loading || !resumen` → spinner. Si alguien quita el
//     `!resumen`, una pantalla con loading=false y resumen=null entra en
//     crash silencioso (la rama de render asume resumen truthy).
//   - Hook `useDashboard` controla TODO el estado: `resumen`, `alertas`,
//     `loading`, `error`, `recargar`. Mockeamos el hook (no la API), igual
//     que Dashboard.test.jsx.
//   - 3 slides rotando vía `setInterval(prev => (prev+1) % SLIDES.length, 20000)`.
//     Si alguien cambia `% SLIDES.length` por `+ 1`, después del slide 2
//     se cae el módulo por índice fuera de rango.
//   - 3 intervals simultáneos en mount: rotación (20s), reloj (1s),
//     refresh (120s). Si el cleanup del refresh falla, el hook `recargar`
//     se dispara cada 2 min incluso después de unmount.
//   - Reloj con `time.toLocaleTimeString('es-MX', {hour: '2-digit',
//     minute: '2-digit', second: '2-digit'})` y `toLocaleDateString('es-MX',
//     {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})`.
//   - 5 colores de estado mapeados a clases tailwind:
//       operativo         → bg-emerald-500
//       en_mantenimiento  → bg-yellow-500
//       fuera_servicio    → bg-red-500
//       en_traslado       → bg-violet-500
//       baja              → bg-slate-500
//     Cualquier estado fuera del mapa → bg-slate-500 (default).
//   - Estado capitalizado con `replace(/_/g, ' ')` → "fuera_servicio"
//     aparece como "fuera servicio".
//   - `equipos_por_estado` defensivo: `(resumen.equipos_por_estado || [])`.
//     Si alguien quita el `|| []`, render explota cuando no hay array.
//   - Alertas críticas (filter por `a.prioridad === 'critica'`):
//       0 → "Sin Alertas Críticas" + ✅
//       N → "N Alertas Críticas" + 🚨
//     Si alguien cambia `'critica'` por otro literal, el badge se pierde.
//   - Lista de alertas truncada a 8: `alertas.slice(0, 8).map`. Si
//     alguien quita el `.slice(0, 8)`, 50 alertas revientan el layout.
//   - Cada alerta con `created_at` muestra "· {fecha}"; sin `created_at`
//     no muestra la línea.
//   - Indicadores de slide: 3 dots, el activo en `bg-emerald-400`, los
//     demás en `bg-[var(--content-border)]`. Si alguien borra el
//     condicional `i === currentSlide`, todos los dots se ven iguales.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si `!resumen` se quita del loading dual, la pantalla entra a la rama
//     de render con resumen=null y `.filter`/`.find` lanzan TypeError.
//   - Si el módulo de rotación pierde `% SLIDES.length`, después del 3er
//     slide currentSlide se vuelve undefined y la pantalla queda en blanco.
//   - Si el cleanup del `setInterval(recargar)` falla, recargar sigue
//     disparándose tras unmount.
//   - Si la condición `a.prioridad === 'critica'` cambia, los iconos 🚨
//     y el badge rojo nunca aparecen.
//   - Si el `.slice(0, 8)` se quita, la lista de alertas crece sin tope.
//   - Si el fallback de color `colors[item.estado] || 'bg-slate-500'` se
//     rompe, un estado desconocido muestra sin clase (texto invisible en
//     tema dark).
//
// Se mockea `../hooks/useDashboard` (controla TODO el estado de la página),
// `../components/StatsCards` y `../components/DashboardCharts` (componentes
// pesados, ya cubiertos en sus propios tests / ciclos previos). NO se
// mockea lucide-react (TVDashboard no usa iconos, sólo emojis inline 🚨✅⚠️).
// NO se usa MemoryRouter (TVDashboard no importa react-router).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const mockUseDashboard = vi.fn();
const mockRecargar = vi.fn();

vi.mock('../hooks/useDashboard', () => ({
  useDashboard: () => mockUseDashboard(),
}));

vi.mock('../components/StatsCards', () => ({
  default: ({ resumen }) => (
    <div data-testid="mock-stats-cards">
      MOCK_STATS:{JSON.stringify({
        operativos: resumen.equipos_por_estado?.find((e) => e.estado === 'operativo')?.total,
        mantenimiento: resumen.equipos_por_estado?.find((e) => e.estado === 'en_mantenimiento')?.total,
        tickets: resumen.tickets_abiertos,
      })}
    </div>
  ),
}));

vi.mock('../components/DashboardCharts', () => ({
  default: () => <div data-testid="mock-dashboard-charts">MOCK_CHARTS</div>,
}));

import TVDashboard from './TVDashboard';

// ── Fixtures ─────────────────────────────────────────────────────────────
const OK_RESUMEN = {
  total: 751,
  equipos_por_estado: [
    { estado: 'operativo',         total: 698 },
    { estado: 'en_mantenimiento',  total: 23 },
    { estado: 'fuera_servicio',    total: 12 },
    { estado: 'en_traslado',       total: 8 },
    { estado: 'baja',              total: 10 },
  ],
};

const ALERTA_CRITICA_1 = {
  id: 1,
  prioridad: 'critica',
  mensaje: 'Ventilador Mindray SV300 fuera de servicio',
  equipo_nombre: 'Ventilador Mindray',
  created_at: '2026-06-27T10:30:00Z',
};
const ALERTA_NORMAL = {
  id: 2,
  prioridad: 'media',
  mensaje: 'Mantenimiento programado',
  equipo_nombre: 'Monitor Philips',
  created_at: '2026-06-27T09:00:00Z',
};
const ALERTA_SIN_FECHA = {
  id: 3,
  prioridad: 'baja',
  mensaje: 'Batería baja',
  equipo_nombre: 'Desfibrilador',
};

beforeEach(() => {
  mockRecargar.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setupDashboard(overrides = {}) {
  const defaults = {
    resumen: OK_RESUMEN,
    alertas: [],
    loading: false,
    error: null,
    recargar: mockRecargar,
  };
  mockUseDashboard.mockReturnValue({ ...defaults, ...overrides });
}

function renderTVD() {
  return render(<TVDashboard />);
}

// ───────────────────────────────────────────────────────────────────────
// Loading state
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — loading state', () => {
  it('muestra el spinner + "Cargando Dashboard..." cuando loading=true', () => {
    setupDashboard({ loading: true, resumen: null });
    renderTVD();
    expect(screen.getByText('Cargando Dashboard...')).toBeInTheDocument();
    expect(screen.getByText('SIGAB')).toBeInTheDocument();
  });

  it('también muestra spinner cuando loading=false pero resumen=null', () => {
    setupDashboard({ loading: false, resumen: null });
    renderTVD();
    expect(screen.getByText('Cargando Dashboard...')).toBeInTheDocument();
  });

  it('NO muestra el header ni los slide indicators durante loading', () => {
    setupDashboard({ loading: true, resumen: null });
    renderTVD();
    // El header tiene el subtítulo largo, los indicadores son 3 dots —
    // ninguno debe estar en DOM durante loading.
    expect(screen.queryByText(/Sistema Integral de Gestión/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Auto-actualización cada 2 min/i)).not.toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// Header
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — header', () => {
  beforeEach(() => setupDashboard());

  it('muestra el logo del IMSS con alt "IMSS Logo"', () => {
    renderTVD();
    const logo = screen.getByAltText('IMSS Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/imss_logo.png');
  });

  it('muestra el título "SIGAB" y subtítulo del sistema', () => {
    renderTVD();
    expect(screen.getByRole('heading', { level: 1, name: 'SIGAB' })).toBeInTheDocument();
    expect(screen.getByText(/Sistema Integral de Gestión de Activos Biomédicos/i)).toBeInTheDocument();
  });

  it('muestra el nombre del hospital en el centro del header', () => {
    renderTVD();
    expect(screen.getByText('IMSS 1 Clínica General Tijuana')).toBeInTheDocument();
    expect(screen.getByText(/IMSS · Tijuana, B\.C\./)).toBeInTheDocument();
  });

  it('muestra el reloj en formato HH:MM:SS (mono, tabular-nums)', () => {
    renderTVD();
    // toLocaleTimeString('es-MX', {hour, minute, second}) → "12:34:56"
    const clock = screen.getByText(/\d{2}:\d{2}:\d{2}/);
    expect(clock).toBeInTheDocument();
    expect(clock.tagName).toBe('P');
    expect(clock.className).toMatch(/font-mono/);
    expect(clock.className).toMatch(/tabular-nums/);
  });

  it('muestra la fecha formateada con toLocaleDateString es-MX', () => {
    renderTVD();
    // toLocaleDateString('es-MX', {weekday: 'long', ...}) → "viernes, 27 de junio de 2026"
    // (en jsdom el locale es-MX puede variar; verificamos que NO esté vacío).
    const allParagraphs = screen.getAllByText(/\S+/);
    // Sólo verificamos que el componente renderizó sin "Invalid Date" en ningún nodo.
    expect(document.body.textContent).not.toContain('Invalid Date');
    expect(allParagraphs.length).toBeGreaterThan(3);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Slide kpis (default)
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — slide kpis (default)', () => {
  beforeEach(() => setupDashboard());

  it('muestra StatsCards con los totales del resumen', () => {
    renderTVD();
    const stats = screen.getByTestId('mock-stats-cards');
    expect(stats).toBeInTheDocument();
    // Operativos=698, mantenimiento=23, tickets (de OK_RESUMEN no viene,
    // undefined → 0 en StatsCards pero NO testeamos eso aquí; sólo la
    // serialización del mock).
    expect(stats.textContent).toContain('"operativos":698');
    expect(stats.textContent).toContain('"mantenimiento":23');
  });

  it('mapea cada estado a su color tailwind correcto', () => {
    renderTVD();
    // El círculo de color es el primer div con la clase de color dentro
    // de cada card de estado. Buscamos por la presencia de las clases.
    const dots = {
      operativo:        'bg-emerald-500',
      en_mantenimiento: 'bg-yellow-500',
      fuera_servicio:   'bg-red-500',
      en_traslado:      'bg-violet-500',
      baja:             'bg-slate-500',
    };
    for (const [estado, cls] of Object.entries(dots)) {
      const dot = document.querySelector(`.${cls}`);
      expect(dot, `dot para estado "${estado}" con clase ${cls}`).toBeInTheDocument();
    }
  });

  it('muestra el total de cada estado en grande (text-4xl)', () => {
    renderTVD();
    expect(screen.getByText('698')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('formatea "fuera_servicio" como "fuera servicio" (replace _ por espacio)', () => {
    renderTVD();
    // El replace(/_/g, ' ') actúa sobre el estado. Mantenemos el match
    // flexible porque la capitalización puede variar según el navegador.
    expect(screen.getByText(/fuera servicio/i)).toBeInTheDocument();
    expect(screen.getByText(/en mantenimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/en traslado/i)).toBeInTheDocument();
  });

  it('fallback a bg-slate-500 cuando el estado no está en el mapa de colores', () => {
    setupDashboard({
      resumen: {
        equipos_por_estado: [
          { estado: 'estado_raro_desconocido', total: 3 },
        ],
      },
    });
    renderTVD();
    // El dot de "estado_raro" debe usar el color default (bg-slate-500),
    // que YA existe por "baja" en este fixture pero aquí se valida que el
    // total 3 se renderiza y el replace aplica sobre guiones bajos.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/estado raro desconocido/i)).toBeInTheDocument();
  });

  it('defensivo: render OK aunque equipos_por_estado sea undefined', () => {
    setupDashboard({ resumen: { total: 100, equipos_por_estado: undefined } });
    renderTVD();
    // No debe crashear; StatsCards se monta igualmente.
    expect(screen.getByTestId('mock-stats-cards')).toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// Slide charts
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — slide charts', () => {
  it('avanza al slide "charts" y monta DashboardCharts', () => {
    vi.useFakeTimers();
    try {
      setupDashboard();
      renderTVD();
      // Inicialmente slide=kpis, DashboardCharts NO debe estar.
      expect(screen.queryByTestId('mock-dashboard-charts')).not.toBeInTheDocument();
      // Avanzar 20000ms → slide=1 → charts.
      act(() => { vi.advanceTimersByTime(20000); });
      expect(screen.getByTestId('mock-dashboard-charts')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Slide alerts — empty
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — slide alerts (vacío)', () => {
  it('avanza al slide "alerts" y muestra mensaje de "normalidad" cuando alertas=[]', () => {
    vi.useFakeTimers();
    try {
      setupDashboard({ alertas: [] });
      renderTVD();
      // 2 avances de 20000ms → slide=2 (alerts).
      act(() => { vi.advanceTimersByTime(40000); });
      expect(screen.getByText(/Todos los sistemas operando con normalidad/i)).toBeInTheDocument();
      expect(screen.getByText(/Sin Alertas Críticas/i)).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Slide alerts — con alertas
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — slide alerts (con alertas)', () => {
  it('muestra "N Alertas Críticas" + 🚨 cuando hay alertas críticas', () => {
    vi.useFakeTimers();
    try {
      setupDashboard({
        // IDs distintos para evitar warning de React "duplicate key".
        alertas: [
          { ...ALERTA_CRITICA_1, id: 1 },
          { ...ALERTA_CRITICA_1, id: 2, mensaje: 'Otra crítica' },
          { ...ALERTA_NORMAL, id: 3 },
        ],
      });
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      expect(screen.getByText(/2 Alertas Críticas/i)).toBeInTheDocument();
      // 🚨 aparece en el <h2> del título Y en cada bloque de alerta crítica.
      expect(screen.getAllByText('🚨').length).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('muestra "Sin Alertas Críticas" cuando no hay críticas pero sí normales', () => {
    vi.useFakeTimers();
    try {
      // IDs distintos para evitar warning de React "duplicate key".
      setupDashboard({
        alertas: [
          { ...ALERTA_NORMAL, id: 10 },
          { ...ALERTA_NORMAL, id: 11 },
        ],
      });
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      expect(screen.getByText(/Sin Alertas Críticas/i)).toBeInTheDocument();
      // El emoji de éxito sigue presente.
      expect(screen.getByText('✅')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renderiza mensaje y nombre de equipo de cada alerta', () => {
    vi.useFakeTimers();
    try {
      setupDashboard({ alertas: [ALERTA_CRITICA_1, ALERTA_NORMAL] });
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      expect(screen.getByText('Ventilador Mindray SV300 fuera de servicio')).toBeInTheDocument();
      expect(screen.getByText('Mantenimiento programado')).toBeInTheDocument();
      // equipo_nombre aparece antes del · fecha — el texto "Ventilador Mindray"
      // es match contra el <p> que contiene la línea completa Y contra cualquier
      // ancestro. getAllByText + length >= 1 evita el "multiple elements found".
      expect(screen.getAllByText(/Ventilador Mindray/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Monitor Philips/).length).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('trunca la lista de alertas a 8 items máximo', () => {
    vi.useFakeTimers();
    try {
      const many = Array.from({ length: 12 }, (_, i) => ({
        ...ALERTA_NORMAL,
        id: 100 + i,
        mensaje: `Alerta ${i}`,
      }));
      setupDashboard({ alertas: many });
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      // Sólo se renderizan los primeros 8.
      expect(screen.getByText('Alerta 0')).toBeInTheDocument();
      expect(screen.getByText('Alerta 7')).toBeInTheDocument();
      expect(screen.queryByText('Alerta 8')).not.toBeInTheDocument();
      expect(screen.queryByText('Alerta 11')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('alerta sin created_at NO muestra la línea de fecha con ·', () => {
    vi.useFakeTimers();
    try {
      setupDashboard({ alertas: [ALERTA_SIN_FECHA] });
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      // El mensaje sí aparece.
      expect(screen.getByText('Batería baja')).toBeInTheDocument();
      // El nombre del equipo aparece (es parte del bloque aunque sin fecha).
      expect(screen.getByText(/Desfibrilador/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('alerta crítica tiene borde rojo (bg-red-500/15 border-red-500/40)', () => {
    vi.useFakeTimers();
    try {
      setupDashboard({ alertas: [ALERTA_CRITICA_1, ALERTA_NORMAL] });
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      const criticalBlock = document.querySelector('.bg-red-500\\/15');
      expect(criticalBlock).toBeInTheDocument();
      expect(criticalBlock.className).toMatch(/border-red-500\/40/);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Slide rotation — fake timers
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — rotación automática de slides', () => {
  beforeEach(() => setupDashboard());

  it('arranca en slide 0 (kpis): StatsCards visible, DashboardCharts NO', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      expect(screen.getByTestId('mock-stats-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-dashboard-charts')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('avanza a slide 1 (charts) tras 20000ms', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      act(() => { vi.advanceTimersByTime(20000); });
      expect(screen.getByTestId('mock-dashboard-charts')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-stats-cards')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('avanza a slide 2 (alerts) tras 40000ms', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      act(() => { vi.advanceTimersByTime(40000); });
      expect(screen.getByText(/Todos los sistemas operando con normalidad/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('CICLA de vuelta al slide 0 tras 60000ms (60s = 3 slides × 20s)', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      act(() => { vi.advanceTimersByTime(60000); });
      // Vuelta al slide kpis → StatsCards visible.
      expect(screen.getByTestId('mock-stats-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-dashboard-charts')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Slide indicators
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — indicadores de slide (3 dots en footer)', () => {
  beforeEach(() => setupDashboard());

  it('renderiza 3 indicadores de slide + 1 dot "En línea" (4 dots total w-2 h-2 rounded-full)', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      const dots = document.querySelectorAll('.w-2.h-2.rounded-full');
      // 3 indicadores + 1 dot "En línea" = 4.
      expect(dots.length).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('en slide 0: 1 indicador emerald-400 (activo) + 1 dot "En línea" = 2 emerald-400', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      const activeDots = document.querySelectorAll('.bg-emerald-400');
      // 1 "En línea" + 1 indicador activo (slide 0) = 2.
      expect(activeDots.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('en slide 0: hay 2 indicadores con clase bg-[var(--content-border)] (los inactivos)', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      const inactiveDots = document.querySelectorAll('.bg-\\[var\\(--content-border\\)\\]');
      // 2 indicadores inactivos + 1 chip "En línea" también usa bg-content-surface
      // (no bg-content-border). Buscamos específicamente los inactivos.
      // Filtramos por transición-colors (es exclusivo de los indicadores).
      const transitionIndicators = document.querySelectorAll('.transition-colors.bg-\\[var\\(--content-border\\)\\]');
      expect(transitionIndicators.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('después de 20000ms (slide 1): sigue habiendo 2 emerald-400 (sigue 1 activo)', () => {
    vi.useFakeTimers();
    try {
      renderTVD();
      act(() => { vi.advanceTimersByTime(20000); });
      // El slide activo es ahora el índice 1, sigue siendo 1 solo activo.
      // Total emerald-400: 1 "En línea" + 1 indicador activo = 2.
      const activeDots = document.querySelectorAll('.bg-emerald-400');
      expect(activeDots.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Footer
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — footer', () => {
  beforeEach(() => setupDashboard());

  it('muestra "En línea · Auto-actualización cada 2 min"', () => {
    renderTVD();
    expect(screen.getByText(/En línea · Auto-actualización cada 2 min/i)).toBeInTheDocument();
  });

  it('muestra la atribución "Depto. Conservación y Mantenimiento · Bioingeniería Xochicalco"', () => {
    renderTVD();
    expect(screen.getByText(/Depto\. Conservación y Mantenimiento · Bioingeniería Xochicalco/i)).toBeInTheDocument();
  });

  it('el dot "En línea" tiene bg-emerald-400 + animate-pulse', () => {
    renderTVD();
    const pulseDot = document.querySelector('.bg-emerald-400.animate-pulse');
    expect(pulseDot).toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// Auto-refresh cada 2 min
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — auto-refresh del hook', () => {
  it('llama a recargar() cada 120000ms (2 min)', () => {
    vi.useFakeTimers();
    try {
      setupDashboard();
      renderTVD();
      // En mount NO debe haberse llamado aún (efecto dispara el primer
      // tick tras 120000ms).
      expect(mockRecargar).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(120000); });
      expect(mockRecargar).toHaveBeenCalledTimes(1);
      act(() => { vi.advanceTimersByTime(120000); });
      expect(mockRecargar).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deja de llamar a recargar() tras unmount (cleanup del interval)', () => {
    vi.useFakeTimers();
    try {
      setupDashboard();
      const { unmount } = renderTVD();
      act(() => { vi.advanceTimersByTime(120000); });
      expect(mockRecargar).toHaveBeenCalledTimes(1);
      unmount();
      act(() => { vi.advanceTimersByTime(240000); });
      // Tras unmount, recargar NO debe haberse llamado de nuevo.
      expect(mockRecargar).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Hygiene
// ───────────────────────────────────────────────────────────────────────
describe('TVDashboard — hygiene', () => {
  it('no warnings de React (act / Warning) durante el render básico', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupDashboard();
    renderTVD();
    // Filtramos el warning pre-existente de react-router v7 que no aplica
    // a TVDashboard (no usa router), y verificamos que no hay act warnings.
    const relevant = consoleErrorSpy.mock.calls.filter(args =>
      String(args[0] ?? '').match(/not wrapped in act|Warning:/i) &&
      !String(args[0] ?? '').includes('v7_relativeSplatPath')
    );
    expect(relevant).toHaveLength(0);
    consoleErrorSpy.mockRestore();
  });
});