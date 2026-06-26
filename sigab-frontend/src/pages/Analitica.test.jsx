// src/pages/Analitica.test.jsx
// Analitica es la página de "Ingeniería Clínica 4.0" (186 líneas) — el
// dashboard de métricas predictivas (MTBF/MTTR/Prob. Falla) con el badge
// "Powered by Gemma" y una tabla de heatmap de fiabilidad operativa. Es
// la candidata más compacta del backlog de páginas-con-fetch y concentra
// varios patrones sutiles:
//
//   - Estado loading inicial con useEffect + .finally() para apagarlo.
//     El loading NO tiene texto visible — es un spinner animado puro
//     (`<div class="animate-spin ...">`), así que hay que detectarlo
//     por clase, no por `getByText('Cargando...')`.
//   - 1 endpoint: api.getFiabilidad() (en /api/sigab). El handler
//     espera { ok, fiabilidad: [...] }. Si res.ok es false, setMetricas
//     NO se llama (se queda con el initial []). Si res.ok es true pero
//     falta `fiabilidad`, `res.fiabilidad || []` rescata a [].
//   - 3 KPIs derivados de la lista: Equipos en Riesgo (count de
//     riesgo === 'Crítico'), MTBF Promedio (Math.round sobre reduce de
//     mtbf_dias), MTTR Promedio (toFixed(1) sobre reduce de mttr_horas).
//     Si la lista está vacía, todos = 0.
//   - Disponibilidad Global está hardcoded en 98.4% con delta "+0.4% vs
//     mes anterior" y TrendingUp verde — no se calcula de los datos.
//   - Tabla con 5 columnas (Activo/Serie, Prob. Falla, MTBF (D), MTTR (H),
//     Estatus I.A.) y un bar de probabilidad con width = Math.min(pct, 100)%
//     — el cap es importante: un item con probabilidad > 100% no debe
//     overflowear el contenedor.
//   - Colores de fila (texto + bar) PROVIENEN DE `m.color` (data), no de
//     `m.riesgo`. La rama default es emerald. El color y el riesgo son
//     campos independientes (puede haber un "Medio" con color "red" si
//     el backend lo manda así). NOTA: la constante `bgColor` se declara
//     en el JSX pero NO se usa en el render — es dead code, no testeable.
//   - Estatus I.A. badge con 3 ramas (Crítico → red, Medio → orange,
//     default → emerald + shadow). La rama default incluye `shadow-lg
//     shadow-emerald-500/5` que las otras no — soft glow sólo en bajo
//     riesgo para feedback visual "todo bien".
//   - Botón "Recalcular métricas" (icono Activity) llama cargarDatos()
//     + toast.success('Recalculando métricas…', { duration: 1500 }). El
//     toast lleva elipsis Unicode U+2026, no tres puntos.
//   - Error path: toast.error('Error cargando métricas predictivas') +
//     console.error(err) en el catch.
//   - Header con 2 badges: "Métricas Predictivas" (esmeralda) + "Powered
//     by Gemma" (azul, con icono Brain de lucide).
//
// Riesgos silenciosos cubiertos:
//   - Si alguien borra el `|| []` del setMetricas, la UI rompe con
//     "metricas.filter is not a function" cuando la API devuelve
//     {ok: true} sin la key `fiabilidad`.
//   - Si alguien quita el setLoading(false) del .finally(), la pantalla
//     se queda eternamente con el spinner.
//   - Si alguien cambia el cap `Math.min(p, 100)` por un `p` crudo, una
//     probabilidad de 150% overflowea el contenedor visualmente.
//   - Si alguien cambia el filter `m.riesgo === 'Crítico'` por `m.riesgo
//     === 'Critico'` (sin acento), el contador de "Equipos en Riesgo"
//     siempre queda en 0.
//   - Si el botón Recalcular desconecta el toast.success, el operador
//     no recibe feedback de que la acción se disparó (sólo ve el refetch).
//   - Si el catch deja de loggear a console.error, los errores reales
//     en producción son invisibles para el observador.
//
// Se mockea `../api/sigab` (1 endpoint) y `../lib/toast`. NO se mockea
// lucide-react — los iconos se renderizan como SVGs inline (paths de
// lucide), jsdom los maneja bien. NO se usa MemoryRouter — Analitica
// no importa react-router.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetFiabilidad: vi.fn(),
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
    getFiabilidad: (...args) => mocks.mockGetFiabilidad(...args),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import Analitica from './Analitica';

// ── Fixtures ──
// Cubren las 3 ramas de color (red/orange/green), las 3 ramas de riesgo
// (Crítico/Medio/Bajo), bordes del cap Math.min, y un item "happy path".
const EV_OPTIMO = {
  equipo_id: 1,
  modelo: 'Monitor Philips IntelliVue MX450',
  marca: 'Philips',
  serie: 'MX450-2024-001',
  probabilidad_falla_pct: 12,
  mtbf_dias: 180,
  mttr_horas: 2.5,
  riesgo: 'Bajo',
  color: 'green',
};

const EV_PREVENTIVO = {
  equipo_id: 2,
  modelo: 'Ventilador Mindray SV300',
  marca: 'Mindray',
  serie: 'SV300-2023-042',
  probabilidad_falla_pct: 45,
  mtbf_dias: 90,
  mttr_horas: 4.0,
  riesgo: 'Medio',
  color: 'orange',
};

const EV_CRITICO = {
  equipo_id: 3,
  modelo: 'TAC Siemens SOMATOM',
  marca: 'Siemens',
  serie: 'SOMATOM-001-A',
  probabilidad_falla_pct: 78,
  mtbf_dias: 30,
  mttr_horas: 8.0,
  riesgo: 'Crítico',
  color: 'red',
};

// Item con probabilidad > 100 para forzar el branch Math.min(..., 100).
const EV_OVERFLOW = {
  equipo_id: 4,
  modelo: 'Desfibrilador ZOLL R Series',
  marca: 'ZOLL',
  serie: 'ZOLL-R-998',
  probabilidad_falla_pct: 150,
  mtbf_dias: 60,
  mttr_horas: 6.0,
  riesgo: 'Medio',
  color: 'orange',
};

const SAMPLE = [EV_OPTIMO, EV_PREVENTIVO, EV_CRITICO];

// ── Helpers ──
function setupApi(fiabilidad = SAMPLE) {
  mocks.mockGetFiabilidad.mockResolvedValue({ ok: true, fiabilidad });
}

function renderA() {
  return render(<Analitica />);
}

async function renderAndWait(fiabilidad = SAMPLE) {
  setupApi(fiabilidad);
  renderA();
  await act(async () => {
    await Promise.resolve();
  });
}

// Helper: dado un modelo, devuelve la fila de la tabla correspondiente.
function getRowFor(modelo) {
  return screen.getByText(modelo).closest('tr');
}

// Helper: el subtítulo bajo el h1. "MTBF" y "MTTR" aparecen en varios
// sitios (subtitle, KPI label, tabla header) — necesitamos el de la
// cabecera de la página.
function getSubtitle() {
  return screen.getByRole('heading', { name: /ingeniería clínica 4\.0/i, level: 1 })
    .parentElement.querySelector('p');
}

beforeEach(() => {
  vi.clearAllMocks();
  // El catch() de cargarDatos loggea a console.error en errores esperados.
  // Sin silenciarlo, stderr se inunda con "Error: Network" en cada test.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});

// ────────────────────────────────────────────────────────────────────────────
// 1. Render base — header, subtítulo, badges Powered by, botón Recalcular
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — render base', () => {
  it('muestra el spinner de loading mientras la promesa no resuelve', () => {
    mocks.mockGetFiabilidad.mockReturnValue(new Promise(() => {}));

    renderA();

    // El loading es un spinner puro (no hay "Cargando..." texto).
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('rounded-full');
  });

  it('oculta el spinner después de que la promesa resuelve', async () => {
    await renderAndWait([]);

    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('renderiza el header h1 "Ingeniería Clínica 4.0" + subtítulo MTBF/MTTR', async () => {
    await renderAndWait([]);

    expect(screen.getByRole('heading', { name: /ingeniería clínica 4\.0/i, level: 1 }))
      .toBeInTheDocument();
    // El subtítulo bajo el h1 menciona MTBF y MTTR en negrita.
    // Lo scopamos al <p> hermano del h1 (no a KPIs ni tabla).
    const subtitle = getSubtitle();
    expect(subtitle).toHaveTextContent(/mtbf/i);
    expect(subtitle).toHaveTextContent(/mttr/i);
  });

  it('renderiza los 2 badges de header: "Métricas Predictivas" y "Powered by Gemma"', async () => {
    await renderAndWait([]);

    expect(screen.getByText('Métricas Predictivas')).toBeInTheDocument();
    expect(screen.getByText(/powered by gemma/i)).toBeInTheDocument();
  });

  it('renderiza el botón "Recalcular métricas" con title accesible', async () => {
    await renderAndWait([]);

    const btn = screen.getByTitle('Recalcular métricas');
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('renderiza las 4 etiquetas de los KPIs principales', async () => {
    await renderAndWait([]);

    expect(screen.getByText('Disponibilidad Global')).toBeInTheDocument();
    expect(screen.getByText('Equipos en Riesgo')).toBeInTheDocument();
    expect(screen.getByText('MTBF Promedio')).toBeInTheDocument();
    expect(screen.getByText('MTTR Promedio')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. KPIs — Disponibilidad hardcoded, enRiesgo count, MTBF/MTTR reducers
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — KPIs', () => {
  it('Disponibilidad Global muestra 98.4% hardcoded + delta + TrendingUp verde', async () => {
    await renderAndWait([]);

    // "98.4%" debe estar en el card de Disponibilidad Global.
    const dispCard = screen.getByText('Disponibilidad Global').closest('div').parentElement;
    expect(dispCard).toHaveTextContent('98.4%');
    // Delta positivo con +0.4%.
    expect(dispCard).toHaveTextContent('+0.4% vs mes anterior');
  });

  it('Equipos en Riesgo cuenta los items con riesgo === "Crítico" (con acento)', async () => {
    await renderAndWait([EV_OPTIMO, EV_PREVENTIVO, EV_CRITICO, EV_OVERFLOW]);

    // Sólo EV_CRITICO tiene riesgo='Crítico'. EV_OVERFLOW es 'Medio'.
    const riesgoCard = screen.getByText('Equipos en Riesgo').closest('div').parentElement;
    expect(riesgoCard).toHaveTextContent('1');
    // Subtítulo "Acción inmediata requerida".
    expect(riesgoCard).toHaveTextContent('Acción inmediata requerida');
  });

  it('Equipos en Riesgo = 0 cuando no hay items "Crítico"', async () => {
    await renderAndWait([EV_OPTIMO, EV_PREVENTIVO]);

    const riesgoCard = screen.getByText('Equipos en Riesgo').closest('div').parentElement;
    expect(riesgoCard).toHaveTextContent('0');
  });

  it('MTBF Promedio = Math.round(promedio de mtbf_dias) sobre los items', async () => {
    // (180 + 90 + 30) / 3 = 100 → Math.round(100) = 100
    await renderAndWait([EV_OPTIMO, EV_PREVENTIVO, EV_CRITICO]);

    const mtbfCard = screen.getByText('MTBF Promedio').closest('div').parentElement;
    expect(mtbfCard).toHaveTextContent('100');
    expect(mtbfCard).toHaveTextContent('días');
  });

  it('MTTR Promedio = promedio de mttr_horas con toFixed(1)', async () => {
    // (2.5 + 4.0 + 8.0) / 3 = 4.8333... → toFixed(1) = "4.8"
    await renderAndWait([EV_OPTIMO, EV_PREVENTIVO, EV_CRITICO]);

    const mttrCard = screen.getByText('MTTR Promedio').closest('div').parentElement;
    expect(mttrCard).toHaveTextContent('4.8');
    expect(mttrCard).toHaveTextContent('hrs');
  });

  it('MTBF y MTTR muestran 0 cuando la lista está vacía', async () => {
    await renderAndWait([]);

    const mtbfCard = screen.getByText('MTBF Promedio').closest('div').parentElement;
    const mttrCard = screen.getByText('MTTR Promedio').closest('div').parentElement;
    // Sin items, el operador ve "0" en ambos (no NaN, no "—").
    // El card incluye el label, así que matcheamos el "0" como token
    // contenido (precedido/seguido de no-dígito para evitar falsos matches).
    expect(mtbfCard.textContent).toMatch(/(^|\D)0(\D|$)/);
    expect(mttrCard.textContent).toMatch(/(^|\D)0(\D|$)/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Tabla — 5 headers + filas + columnas derivadas
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — tabla', () => {
  it('renderiza los 5 headers en orden: Activo/Serie, Prob. Falla, MTBF, MTTR, Estatus', async () => {
    await renderAndWait([EV_OPTIMO]);

    const headers = screen.getByRole('table').querySelectorAll('th');
    expect(headers).toHaveLength(5);
    expect(headers[0]).toHaveTextContent(/activo.*serie/i);
    expect(headers[1]).toHaveTextContent(/prob\.\s*falla/i);
    expect(headers[2]).toHaveTextContent(/mtbf.*d/i);
    expect(headers[3]).toHaveTextContent(/mttr.*h/i);
    expect(headers[4]).toHaveTextContent(/estatus.*i\.a\./i);
  });

  it('renderiza una fila por item con modelo + "marca · serie"', async () => {
    await renderAndWait([EV_OPTIMO, EV_PREVENTIVO, EV_CRITICO]);

    // 3 filas en tbody (excluyendo el header).
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1 + 3);

    // Cada modelo aparece en una fila.
    expect(screen.getByText('Monitor Philips IntelliVue MX450')).toBeInTheDocument();
    expect(screen.getByText('Ventilador Mindray SV300')).toBeInTheDocument();
    expect(screen.getByText('TAC Siemens SOMATOM')).toBeInTheDocument();

    // "marca · serie" en monoespaciado.
    expect(screen.getByText(/philips.*mx450-2024-001/i)).toBeInTheDocument();
    expect(screen.getByText(/mindray.*sv300-2023-042/i)).toBeInTheDocument();
  });

  it('muestra el título de la tabla "Heatmap de Fiabilidad Operativa"', async () => {
    await renderAndWait([]);

    expect(screen.getByRole('heading', { name: /heatmap de fiabilidad operativa/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('muestra la leyenda de colores Óptimo / Preventivo / Crítico en la cabecera', async () => {
    await renderAndWait([]);

    // Los 3 labels de la leyenda en el header de la tabla.
    expect(screen.getByText('Óptimo')).toBeInTheDocument();
    expect(screen.getByText('Preventivo')).toBeInTheDocument();
    // "Crítico" aparece en leyenda y potencialmente en badges. getAllByText.
    const criticos = screen.getAllByText('Crítico');
    expect(criticos.length).toBeGreaterThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Tabla — colores de fila (text/bar) según m.color
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — colores de fila por m.color', () => {
  it('color=red → texto "78%" en text-red-500 + bar bg-red-500', async () => {
    await renderAndWait([EV_CRITICO]);

    // El % "78%" del item tiene clase text-red-500.
    const pctText = screen.getByText('78%');
    expect(pctText.className).toMatch(/text-red-500/);

    // La barra interna tiene bg-red-500 (sin /10). El closest('div') del
    // span es el contenedor flex que envuelve bar+texto; el bar es hijo.
    const flexContainer = pctText.closest('div');
    const bar = flexContainer.querySelector('.bg-red-500');
    expect(bar).toBeInTheDocument();
  });

  it('color=orange → texto "45%" en text-orange-500 + bar bg-orange-500', async () => {
    await renderAndWait([EV_PREVENTIVO]);

    const pctText = screen.getByText('45%');
    expect(pctText.className).toMatch(/text-orange-500/);

    const flexContainer = pctText.closest('div');
    const bar = flexContainer.querySelector('.bg-orange-500');
    expect(bar).toBeInTheDocument();
  });

  it('color=green (default) → texto "12%" en text-emerald-500 + bar bg-emerald-500', async () => {
    await renderAndWait([EV_OPTIMO]);

    const pctText = screen.getByText('12%');
    expect(pctText.className).toMatch(/text-emerald-500/);

    const flexContainer = pctText.closest('div');
    const bar = flexContainer.querySelector('.bg-emerald-500');
    expect(bar).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Estatus I.A. badge — 3 ramas según m.riesgo
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — badge Estatus I.A.', () => {
  it('riesgo="Crítico" → clases rojas (bg-red-500/10 border-red-500/30 text-red-500)', async () => {
    await renderAndWait([EV_CRITICO]);

    // El badge es un span con rounded-xl. Lo desambiguamos de la leyenda
    // que también dice "Crítico" — la leyenda es un <div>, el badge <span>.
    const badge = screen.getByText('Crítico', { selector: 'span' });
    expect(badge.className).toMatch(/bg-red-500\/10/);
    expect(badge.className).toMatch(/border-red-500\/30/);
    expect(badge.className).toMatch(/text-red-500/);
    // La rama Crítico NO lleva shadow.
    expect(badge.className).not.toMatch(/shadow/);
  });

  it('riesgo="Medio" → clases naranjas (bg-orange-500/10 border-orange-500/30 text-orange-500)', async () => {
    await renderAndWait([EV_PREVENTIVO]);

    const badge = screen.getByText('Medio', { selector: 'span' });
    expect(badge.className).toMatch(/bg-orange-500\/10/);
    expect(badge.className).toMatch(/border-orange-500\/30/);
    expect(badge.className).toMatch(/text-orange-500/);
    expect(badge.className).not.toMatch(/shadow/);
  });

  it('default (riesgo="Bajo") → clases esmeralda + shadow-lg shadow-emerald-500/5', async () => {
    await renderAndWait([EV_OPTIMO]);

    const badge = screen.getByText('Bajo', { selector: 'span' });
    expect(badge.className).toMatch(/bg-emerald-500\/10/);
    expect(badge.className).toMatch(/border-emerald-500\/30/);
    expect(badge.className).toMatch(/text-emerald-500/);
    // La rama default incluye el shadow — feedback visual de "todo bien".
    expect(badge.className).toMatch(/shadow-lg/);
    expect(badge.className).toMatch(/shadow-emerald-500\/5/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Prob. Falla bar — cap Math.min(porcentaje, 100)
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — bar de Prob. Falla', () => {
  it('probabilidad normal (45%) → width = "45%"', async () => {
    await renderAndWait([EV_PREVENTIVO]);

    const bar = getRowFor('Ventilador Mindray SV300').querySelector('.bg-orange-500');
    expect(bar).toBeInTheDocument();
    expect(bar.style.width).toBe('45%');
  });

  it('probabilidad > 100% se capa a 100% (cubre Math.min)', async () => {
    await renderAndWait([EV_OVERFLOW]); // probabilidad_falla_pct = 150

    const bar = getRowFor('Desfibrilador ZOLL R Series').querySelector('.bg-orange-500');
    expect(bar).toBeInTheDocument();
    // El width debe ser "100%" (capeado), NO "150%".
    expect(bar.style.width).toBe('100%');
    // El texto del % muestra el valor crudo "150%" (eso es lo que ve el
    // operador en la columna — el cap es sólo visual del bar).
    expect(screen.getByText('150%')).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Botón Recalcular — re-dispara cargarDatos + toast.success
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — botón Recalcular métricas', () => {
  it('click re-invoca api.getFiabilidad', async () => {
    await renderAndWait([]);

    // Mount inicial: 1 llamada.
    expect(mocks.mockGetFiabilidad).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Recalcular métricas'));

    await waitFor(() => {
      expect(mocks.mockGetFiabilidad).toHaveBeenCalledTimes(2);
    });
  });

  it('click muestra toast.success con elipsis Unicode y duration 1500', async () => {
    await renderAndWait([]);

    fireEvent.click(screen.getByTitle('Recalcular métricas'));

    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'Recalculando métricas…', // U+2026, no tres puntos
      { duration: 1500 },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Error path — api rechaza → toast.error + console.error + tabla vacía
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — error path', () => {
  it('api rechaza con Network → toast.error con mensaje específico', async () => {
    mocks.mockGetFiabilidad.mockRejectedValue(new Error('Network'));

    renderA();
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.mockToast.error).toHaveBeenCalledWith(
      'Error cargando métricas predictivas',
    );
    // El catch debe loggear a console.error para observabilidad.
    expect(console.error).toHaveBeenCalled();
  });

  it('tras error, la tabla queda vacía (no rows en tbody, header visible)', async () => {
    mocks.mockGetFiabilidad.mockRejectedValue(new Error('Boom'));

    renderA();
    await act(async () => {
      await Promise.resolve();
    });

    // El spinner ya no está (loading=false se ejecuta en .finally()).
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    // El header de la tabla sigue visible.
    expect(screen.getByRole('heading', { name: /heatmap de fiabilidad operativa/i }))
      .toBeInTheDocument();
    // EnRiesgo = 0 (no hay items).
    const riesgoCard = screen.getByText('Equipos en Riesgo').closest('div').parentElement;
    expect(riesgoCard).toHaveTextContent('0');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 9. Tolerancia a shape ausente — res.ok=true sin key fiabilidad, y res.ok=false
// ────────────────────────────────────────────────────────────────────────────
describe('Analitica — tolerancia a shape ausente', () => {
  it('{ ok: true } sin key fiabilidad → trata como lista vacía sin romper', async () => {
    // Cubre el `res.fiabilidad || []` cuando la API devuelve respuesta
    // parcial. Si alguien borra el `|| []`, la UI rompe con
    // "metricas.filter is not a function".
    mocks.mockGetFiabilidad.mockResolvedValue({ ok: true });

    renderA();
    await act(async () => {
      await Promise.resolve();
    });

    // Spinner ya no está.
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    // KPIs en 0.
    const riesgoCard = screen.getByText('Equipos en Riesgo').closest('div').parentElement;
    expect(riesgoCard).toHaveTextContent('0');
    // Sin filas de datos (sólo el header).
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1);
  });

  it('{ ok: false } → setMetricas NO se llama, queda con initial []', async () => {
    // Si res.ok es false, el `if (res.ok)` no entra y setMetricas no se
    // llama. El estado inicial es [], así que la tabla queda vacía.
    mocks.mockGetFiabilidad.mockResolvedValue({ ok: false });

    renderA();
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    // Sin filas.
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(1);
    // No se debe mostrar toast.error (no es un error de red, es una
    // respuesta de "no ok" — el componente la trata como silencio).
    expect(mocks.mockToast.error).not.toHaveBeenCalled();
  });
});
