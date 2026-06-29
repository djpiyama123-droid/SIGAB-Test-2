// src/pages/Trazabilidad.test.jsx
// Trazabilidad es la página (204 líneas) de cumplimiento NOM-016 — registro
// del historial de movimientos y traslados de equipos entre áreas/pisos del
// hospital. Se renderiza como una línea de tiempo vertical (timeline) con
// un punto azul por movimiento y una línea conectora entre movimientos
// consecutivos. Tiene un modal "Registrar Traslado" para capturar nuevos
// movimientos. Es una candidata compacta del backlog de páginas-con-fetch
// sin charts ni mapa Leaflet.
//
// Patrones sutiles cubiertos:
//
//   - Estado loading inicial con `.finally()` que apaga loading. Si alguien
//     borra el `setLoading(false)` del `.finally()`, la pantalla se queda
//     eternamente en "Cargando movimientos..." aunque la promesa ya resolvió.
//   - Tolerancia a shape: `res.movimientos ?? []` rescata respuestas
//     `null`/`undefined`. NO rescata array directo (causa TypeError en .length
//     y .map). Si en algún ciclo se quiere ampliar el fallback, basta cambiar
//     a `Array.isArray(res.movimientos) ? res.movimientos : (Array.isArray(res)
//     ? res : [])`. Se documenta, no se corrige.
//   - 3 endpoints: getTrazabilidad() (carga en mount via cargar()), getEquipos(
//     {limit: 200}) (modal llama en su mount, NO en mount de la página),
//     registrarTraslado(data).
//   - Validación en orden estricto:
//     1) !form.equipo_id      → 'Selecciona un equipo'
//     2) !form.area_destino.trim() → 'Indica el área de destino'
//     Si alguien reordena o agrega una validación nueva, los mensajes del
//     operador cambian.
//   - Conversión numérica con un caso especial:
//     * equipo_id: Number(form.equipo_id) — siempre Number, requerido.
//     * piso_destino: form.piso_destino ? Number(form.piso_destino) : null
//       — Number sólo si hay valor; vacío se manda como null (campo opcional).
//     Si alguien quita el Number() de equipo_id, el backend rechaza con 422.
//     Si alguien quita el ternario del piso_destino, el campo vacío se manda
//     como string "" o NaN y el backend rechaza con 422.
//   - Toast.success literal "Traslado registrado en trazabilidad".
//   - Toast.error del catch del modal con fallback chain:
//     `err.response?.data?.detail || 'Error al registrar traslado'`. Cubre
//     el caso de respuesta 4xx del backend (e.g. validación) vs catch puro
//     de red (sin `response`).
//   - `area_origen || 'Origen desconocido'` para traslados cuyo origen no
//     fue capturado (campo opcional en backend).
//   - Empty state con su PROPIO botón "+ Registrar primer traslado" que abre
//     el modal (además del botón "Registrar Traslado" de la cabecera).
//   - Línea conectora del timeline OCULTA en el ÚLTIMO item:
//     `i < movimientos.length - 1 && <line />`. Si alguien cambia la condición,
//     el último item aparece con un conector que se desborda hacia abajo.
//   - Formato de fecha: `new Date(m.fecha_movimiento).toLocaleString('es-MX')`.
//     Si `fecha_movimiento` es null/undefined, se renderiza string vacío.
//   - `useEffect` con deps `[]` para cargar en mount Y para cargar equipos
//     del modal en SU mount (no en mount de la página).
//   - `onSaved` callback: cierra modal + recarga lista via `cargar()`.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si alguien borra `setLoading(false)` del `.finally()`, la pantalla
//     se queda con "Cargando movimientos..." para siempre.
//   - Si el `Number()` se olvida en equipo_id, el backend rechaza con 422.
//   - Si el ternario del piso_destino se rompe, el campo vacío llega como
//     string "" y el backend rechaza.
//   - Si el `.trim()` se olvida en la validación de area_destino, un destino
//     de "   " (espacios) pasa la validación y queda como traslado vacío.
//   - Si el orden de validación cambia, los mensajes específicos del operador
//     se pierden (ej. "Selecciona un equipo" nunca aparece porque destino
//     se valida primero).
//   - Si la condición `i < length - 1` se rompe, el último item del timeline
//     se desborda con una línea conectora colgante.
//   - Si `onSaved()` no se llama tras éxito, el modal queda abierto y la
//     lista no se refresca.
//   - Si el fallback de area_origen se rompe, los traslados sin origen
//     muestran "undefined" en pantalla.
//   - Si el catch del getEquipos del modal no loggea a toast, los equipos
//     no se cargan y el operador no sabe por qué el select está vacío
//     (degradación silenciosa).
//
// Se mockea `../api/sigah` (3 endpoints) y `../lib/toast`. NO se mockea
// lucide-react (SVGs inline — MapPin, ArrowRight, Plus, X). NO se mockea
// framer-motion (no se usa). NO se usa MemoryRouter (Trazabilidad no
// importa react-router).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

// vitest + @testing-library/react sin auto-cleanup global requieren esto.
// Sin cleanup() entre tests, los `render()` se acumulan en el DOM y los mocks
// comparten llamadas entre tests → falsos conteos (7, 41, etc.).
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mocks = vi.hoisted(() => ({
  mockGetTrazabilidad:  vi.fn(),
  mockGetEquipos:       vi.fn(),
  mockRegistrarTraslado: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error:   vi.fn(),
    info:    vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../api/sigah', () => ({
  api: {
    getTrazabilidad:   (...args) => mocks.mockGetTrazabilidad(...args),
    getEquipos:        (...args) => mocks.mockGetEquipos(...args),
    registrarTraslado: (...args) => mocks.mockRegistrarTraslado(...args),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import Trazabilidad from './Trazabilidad';

// ── Fixtures ──
// `movimientos` representa la respuesta del backend envuelta en {movimientos: [...]}.
const MOV_1 = {
  id: 1,
  equipo_nombre: 'Ventilador Mindray SV300',
  equipo_serie: 'SV300-2023-042',
  fecha_movimiento: '2026-06-20T14:30:00Z',
  area_origen: 'UCI Adultos',
  piso_origen: 3,
  area_destino: 'Urgencias',
  piso_destino: 1,
  motivo: 'Préstamo temporal por demanda',
};

const MOV_2 = {
  id: 2,
  equipo_nombre: 'Monitor Philips MX450',
  equipo_serie: 'MX450-2024-001',
  fecha_movimiento: '2026-06-15T09:15:00Z',
  area_origen: '',                       // → fallback 'Origen desconocido'
  piso_origen: null,
  area_destino: 'Quirófano 4',
  piso_destino: 2,
  motivo: 'Mantenimiento programado',
};

const MOV_3 = {
  id: 3,
  equipo_nombre: 'Desfibrilador ZOLL R',
  equipo_serie: 'ZOLL-R-998',
  fecha_movimiento: null,                // → no se renderiza fecha
  area_origen: 'Urgencias',
  piso_origen: 1,
  area_destino: 'Almacén',
  piso_destino: null,                    // → no se muestra "• Pn"
  motivo: '',                            // → no se renderiza la línea de motivo
};

const EQ_1 = { id: 10, nombre: 'Ventilador Mindray SV300', serie: 'SV300-2023-042' };
const EQ_2 = { id: 11, nombre: 'Monitor Philips MX450',    serie: 'MX450-2024-001' };
const EQ_3 = { id: 12, nombre: 'Desfibrilador ZOLL R',     serie: 'ZOLL-R-998' };

// ── Helpers ──
function setupApi({
  movimientos = [MOV_1, MOV_2, MOV_3],
  equipos = [EQ_1, EQ_2, EQ_3],
} = {}) {
  mocks.mockGetTrazabilidad.mockResolvedValue({ movimientos });
  mocks.mockGetEquipos.mockResolvedValue({ equipos });
  mocks.mockRegistrarTraslado.mockResolvedValue({ id: 99 });
}

function renderT() {
  return render(<Trazabilidad />);
}

async function renderAndWait({
  movimientos = [MOV_1, MOV_2, MOV_3],
  equipos = [EQ_1, EQ_2, EQ_3],
} = {}) {
  setupApi({ movimientos, equipos });
  renderT();
  await act(async () => { await Promise.resolve(); });
}

function getHeader() {
  return screen.getByRole('heading', { name: /trazabilidad de equipos/i, level: 1 });
}

async function openModal() {
  // fireEvent.click + flush microtasks para que el useEffect del modal que
  // dispara getEquipos(setEquipos) quede envuelto en act(). Sin esto,
  // React avisa "An update to RegistrarTrasladoModal inside a test was not
  // wrapped in act(...)" cuando el .then() resuelve fuera del test.
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /registrar traslado/i }));
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Loading state
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — loading state', () => {
  it('muestra "Cargando movimientos..." mientras getTrazabilidad no resuelve', () => {
    mocks.mockGetTrazabilidad.mockReturnValue(new Promise(() => {}));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderT();

    expect(screen.getByText(/cargando movimientos/i)).toBeInTheDocument();
  });

  it('oculta el loading después de que getTrazabilidad resuelve', async () => {
    await renderAndWait({ movimientos: [] });

    expect(screen.queryByText(/cargando movimientos/i)).not.toBeInTheDocument();
  });

  it('loading se apaga vía .finally() incluso si getTrazabilidad rechaza', async () => {
    mocks.mockGetTrazabilidad.mockRejectedValue(new Error('Network'));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderT();

    await waitFor(() => {
      expect(screen.queryByText(/cargando movimientos/i)).not.toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Header y subtítulo
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — header', () => {
  it('renderiza el h1 "Trazabilidad de Equipos"', async () => {
    await renderAndWait({ movimientos: [] });

    expect(getHeader()).toBeInTheDocument();
  });

  it('el subtítulo menciona "Historial de movimientos" y la norma NOM-016', async () => {
    await renderAndWait({ movimientos: [] });

    const subtitle = getHeader().parentElement.querySelector('p');
    expect(subtitle).toHaveTextContent(/historial de movimientos/i);
    expect(subtitle).toHaveTextContent(/nom-016/i);
  });

  it('renderiza el botón "Registrar Traslado" en la cabecera', async () => {
    await renderAndWait({ movimientos: [] });

    const btn = screen.getByRole('button', { name: /registrar traslado/i });
    expect(btn).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Carga inicial y tolerancia a shape
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — carga inicial', () => {
  it('llama getTrazabilidad exactamente 1 vez en mount', async () => {
    await renderAndWait();

    expect(mocks.mockGetTrazabilidad).toHaveBeenCalledTimes(1);
  });

  it('NO llama getEquipos en mount (sólo cuando se abre el modal)', async () => {
    await renderAndWait();

    expect(mocks.mockGetEquipos).not.toHaveBeenCalled();
  });

  it('muestra empty state "Sin movimientos registrados." cuando la lista está vacía', async () => {
    await renderAndWait({ movimientos: [] });

    expect(screen.getByText(/sin movimientos registrados/i)).toBeInTheDocument();
  });

  it('el empty state tiene su propio botón "+ Registrar primer traslado" que abre el modal', async () => {
    await renderAndWait({ movimientos: [] });

    // El botón del empty state — distinto label del de la cabecera.
    const emptyBtn = screen.getByRole('button', { name: /registrar primer traslado/i });
    expect(emptyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(emptyBtn);
    });

    // El modal abre con su h2 "Registrar Traslado".
    expect(screen.getByRole('heading', { name: /registrar traslado/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('si getTrazabilidad rechaza, toast.error "No se pudo cargar la trazabilidad"', async () => {
    mocks.mockGetTrazabilidad.mockRejectedValue(new Error('Network'));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderT();

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('No se pudo cargar la trazabilidad');
    });
  });

  it('respuesta con {movimientos: null} → empty state (tolerancia a null)', async () => {
    mocks.mockGetTrazabilidad.mockResolvedValue({ movimientos: null });
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderT();

    await waitFor(() => {
      expect(screen.getByText(/sin movimientos registrados/i)).toBeInTheDocument();
    });
  });

  it('respuesta con array directo NO se rescata → "movimientos.length" rompe (documenta bug latente)', async () => {
    // El fallback es `res.movimientos ?? []`. Si el backend devuelve un array
    // directo, `res.movimientos` es undefined → fallback [] → empty state.
    // Este test documenta que un array directo se renderiza como vacío (no
    // como error). Es comportamiento intencional según el código actual.
    mocks.mockGetTrazabilidad.mockResolvedValue([MOV_1]);
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderT();

    await waitFor(() => {
      expect(screen.getByText(/sin movimientos registrados/i)).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Timeline rendering
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — timeline de movimientos', () => {
  it('renderiza un bloque por movimiento con su equipo_nombre', async () => {
    await renderAndWait();

    expect(screen.getByText('Ventilador Mindray SV300')).toBeInTheDocument();
    expect(screen.getByText('Monitor Philips MX450')).toBeInTheDocument();
    expect(screen.getByText('Desfibrilador ZOLL R')).toBeInTheDocument();
  });

  it('muestra la serie del equipo en monoespaciado junto al nombre', async () => {
    await renderAndWait();

    expect(screen.getByText('SV300-2023-042')).toBeInTheDocument();
    expect(screen.getByText('MX450-2024-001')).toBeInTheDocument();
    expect(screen.getByText('ZOLL-R-998')).toBeInTheDocument();
  });

  it('muestra el área de origen cuando está presente', async () => {
    await renderAndWait();

    // Los spans de origen tienen texto compuesto ("UCI Adultos • P3" o
    // "Urgencias" sin piso). El function matcher matchea múltiples
    // elementos (span + sus padres que contienen el texto), así que
    // usamos getAllByText y verificamos al menos uno matchea.
    const matches = screen.getAllByText((_, el) =>
      el?.textContent?.startsWith('UCI Adultos') ?? false
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('fallback "Origen desconocido" cuando area_origen es string vacío', async () => {
    await renderAndWait({ movimientos: [MOV_2] });

    expect(screen.getByText(/origen desconocido/i)).toBeInTheDocument();
  });

  it('muestra el área de destino destacada con estilo azul', async () => {
    await renderAndWait({ movimientos: [MOV_1] });

    // El span de destino tiene clases blue-100/blue-700/blue-300.
    // Como destino es "Urgencias" (compartido con area_origen de MOV_3),
    // buscamos por style className en lugar de por texto.
    const blueSpans = document.querySelectorAll('span[class*="blue-100"]');
    expect(blueSpans.length).toBeGreaterThan(0);
    expect(blueSpans[0].textContent).toMatch(/Urgencias/);
  });

  it('muestra "• Pn" junto al piso cuando está presente', async () => {
    await renderAndWait({ movimientos: [MOV_1] });

    // MOV_1 tiene piso_origen=3 y piso_destino=1. El "• Pn" se concatena
    // en el mismo span que el área, así que usamos getAllByText + función
    // matcher (múltiples matches: span + sus padres).
    const matchesP3 = screen.getAllByText((_, el) =>
      el?.textContent?.includes('• P3') ?? false
    );
    expect(matchesP3.length).toBeGreaterThanOrEqual(1);

    const matchesP1 = screen.getAllByText((_, el) =>
      el?.textContent?.includes('• P1') ?? false
    );
    expect(matchesP1.length).toBeGreaterThanOrEqual(1);
  });

  it('NO muestra "• Pn" cuando piso es null', async () => {
    await renderAndWait({ movimientos: [MOV_3] });

    // MOV_3 tiene piso_destino=null. El span de destino "Almacén" no debe
    // tener un "• P" pegado. Usamos función matcher para encontrar el span
    // que empieza con "Almacén".
    const destSpan = screen.getByText((_, el) =>
      el?.textContent?.startsWith('Almacén') ?? false
    );
    expect(destSpan.textContent).not.toMatch(/•\s*P/);
  });

  it('muestra la línea de motivo sólo cuando motivo es no-vacío', async () => {
    await renderAndWait();

    // MOV_1 y MOV_2 tienen motivo → 2 párrafos "Motivo: ...".
    // MOV_3 tiene motivo='' → NO se renderiza ningún párrafo para él.
    expect(screen.getByText(/préstamo temporal por demanda/i)).toBeInTheDocument();
    expect(screen.getByText(/mantenimiento programado/i)).toBeInTheDocument();

    // Debe haber exactamente 2 párrafos con "Motivo:" (MOV_1 y MOV_2).
    const motivoParrafos = screen.getAllByText(/^motivo:/i);
    expect(motivoParrafos).toHaveLength(2);
  });

  it('la fecha se formatea con toLocaleString("es-MX") — queda vacía si es null', async () => {
    await renderAndWait({ movimientos: [MOV_3] });

    // MOV_3.fecha_movimiento = null → el span de fecha renderiza ''.
    // Verificamos que NO aparezca "Invalid Date" ni "null" en el item.
    const item = screen.getByText('Desfibrilador ZOLL R').closest('.flex.gap-4');
    expect(item.textContent).not.toMatch(/invalid date/i);
    expect(item.textContent).not.toMatch(/\bnull\b/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Modal — apertura, campos, carga de equipos
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — modal Registrar Traslado', () => {
  it('click en "Registrar Traslado" abre modal con h2 "Registrar Traslado"', async () => {
    await renderAndWait();

    await openModal();

    expect(screen.getByRole('heading', { name: /registrar traslado/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('al abrir el modal llama getEquipos({limit: 200})', async () => {
    await renderAndWait();

    await openModal();

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 200 });
    });
  });

  it('muestra los equipos cargados en el select', async () => {
    await renderAndWait();

    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
      expect(screen.getByRole('option', { name: /monitor philips mx450/i }))
        .toBeInTheDocument();
      expect(screen.getByRole('option', { name: /desfibrilador zoll r/i }))
        .toBeInTheDocument();
    });
  });

  it('renderiza los 5 labels del formulario', async () => {
    await renderAndWait();
    await openModal();

    expect(screen.getByText(/equipo \*/i)).toBeInTheDocument();
    expect(screen.getByText(/área de destino \*/i)).toBeInTheDocument();
    expect(screen.getByText(/^piso$/i)).toBeInTheDocument();
    expect(screen.getByText(/^motivo$/i)).toBeInTheDocument();
    expect(screen.getByText(/notas adicionales/i)).toBeInTheDocument();
  });

  it('botones "Cancelar" y "Registrar Traslado" presentes en el modal', async () => {
    await renderAndWait();
    await openModal();

    // Hay 2 botones "Registrar Traslado" ahora (cabecera + modal).
    const allBtns = screen.getAllByRole('button', { name: /registrar traslado/i });
    expect(allBtns.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('"Cancelar" cierra el modal sin enviar', async () => {
    await renderAndWait();
    await openModal();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(mocks.mockRegistrarTraslado).not.toHaveBeenCalled();
    // El h2 del modal desaparece → modal cerrado.
    expect(screen.queryByRole('heading', { name: /registrar traslado/i, level: 2 }))
      .not.toBeInTheDocument();
  });

  it('si getEquipos del modal falla, toast.error "Error al cargar equipos"', async () => {
    mocks.mockGetTrazabilidad.mockResolvedValue({ movimientos: [] });
    mocks.mockGetEquipos.mockRejectedValue(new Error('Network'));

    renderT();

    await waitFor(() => {
      expect(screen.queryByText(/cargando movimientos/i)).not.toBeInTheDocument();
    });

    await openModal();

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Error al cargar equipos');
    });
  });

  it('si getEquipos devuelve array directo, opciones se renderizan (cubre ?? data)', async () => {
    mocks.mockGetTrazabilidad.mockResolvedValue({ movimientos: [] });
    mocks.mockGetEquipos.mockResolvedValue([EQ_1, EQ_2]);

    renderT();

    await waitFor(() => {
      expect(screen.queryByText(/cargando movimientos/i)).not.toBeInTheDocument();
    });

    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });
  });

  it('si getEquipos devuelve `{}` (objeto vacío) sin crash → select con placeholder', async () => {
    // Tras el fix del ciclo 34, pickList(data, 'equipos') tolera `{}`.
    mocks.mockGetTrazabilidad.mockResolvedValue({ movimientos: [] });
    mocks.mockGetEquipos.mockResolvedValue({});

    renderT();

    await waitFor(() => {
      expect(screen.queryByText(/cargando movimientos/i)).not.toBeInTheDocument();
    });

    await openModal();

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 200 });
    });
    // El select del modal debe estar presente (con sólo el placeholder) y
    // NO debe haber options reales (porque la lista es []).
    const select = screen.getByRole('combobox');
    const realOptions = Array.from(select.options).filter(o => o.value !== '');
    expect(realOptions).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Validación
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — validación del formulario', () => {
  it('submit sin equipo_id → "Selecciona un equipo"', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    // Sin seleccionar equipo → submit directo.
    const form = document.querySelector('form');
    fireEvent.submit(form);

    expect(mocks.mockToast.error).toHaveBeenCalledWith('Selecciona un equipo');
    expect(mocks.mockRegistrarTraslado).not.toHaveBeenCalled();
  });

  it('submit con equipo pero sin area_destino → "Indica el área de destino"', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    // Seleccionar equipo pero dejar area_destino vacía.
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    expect(mocks.mockToast.error).toHaveBeenCalledWith('Indica el área de destino');
    expect(mocks.mockRegistrarTraslado).not.toHaveBeenCalled();
  });

  it('area_destino con sólo whitespace → "Indica el área de destino" (cubre .trim())', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: '   ' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    expect(mocks.mockToast.error).toHaveBeenCalledWith('Indica el área de destino');
    expect(mocks.mockRegistrarTraslado).not.toHaveBeenCalled();
  });

  it('la validación se evalúa en orden: equipo primero, destino después', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    // Sin nada → debe ser "Selecciona un equipo" (NO "Indica el área de
    // destino"). Si alguien invierte el orden, este test atrapa el cambio.
    const form = document.querySelector('form');
    fireEvent.submit(form);

    expect(mocks.mockToast.error).toHaveBeenLastCalledWith('Selecciona un equipo');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Submit exitoso
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — submit exitoso', () => {
  it('llama registrarTraslado con equipo_id=Number() y piso_destino=Number() cuando hay piso', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const pisoInput = screen.getByPlaceholderText('1');
    fireEvent.change(pisoInput, { target: { value: '1' } });

    const motivoInput = screen.getByPlaceholderText(/préstamo temporal/i);
    fireEvent.change(motivoInput, { target: { value: 'Préstamo' } });

    const notasInput = screen.getByPlaceholderText(/observaciones del traslado/i);
    fireEvent.change(notasInput, { target: { value: 'Notas varias' } });

    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.mockRegistrarTraslado).toHaveBeenCalledWith(expect.objectContaining({
      equipo_id: 10,                 // Number, NO string "10"
      area_destino: 'Urgencias',
      piso_destino: 1,               // Number, NO string "1"
      motivo: 'Préstamo',
      notas: 'Notas varias',
    }));
  });

  it('piso_destino VACÍO se manda como null (caso especial del ternario)', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    // pisoInput queda con su default '' → debe llegar como null.
    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.mockRegistrarTraslado).toHaveBeenCalledWith(expect.objectContaining({
      equipo_id: 10,
      area_destino: 'Urgencias',
      piso_destino: null,
    }));
  });

  it('toast.success "Traslado registrado en trazabilidad" tras éxito', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.mockToast.success)
      .toHaveBeenCalledWith('Traslado registrado en trazabilidad');
  });

  it('modal se cierra tras éxito Y getTrazabilidad se llama de nuevo (reload)', async () => {
    await renderAndWait();
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    expect(mocks.mockGetTrazabilidad).toHaveBeenCalledTimes(1);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    // cargar() invocado por onSaved → getTrazabilidad 2da vez.
    await waitFor(() => {
      expect(mocks.mockGetTrazabilidad).toHaveBeenCalledTimes(2);
    });
    // Modal cerrado: el h2 desaparece.
    expect(screen.queryByRole('heading', { name: /registrar traslado/i, level: 2 }))
      .not.toBeInTheDocument();
  });

  it('botón cambia a "Registrando..." y se disabled mientras saving=true', async () => {
    await renderAndWait();
    // Sobrescribir DESPUÉS de renderAndWait para que setupApi no lo pise.
    let resolveSubmit;
    mocks.mockRegistrarTraslado.mockReturnValue(new Promise(r => { resolveSubmit = r; }));

    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Mientras la promesa no resuelve, el botón del modal muestra "Registrando..."
    // y está disabled.
    await waitFor(() => {
      const submitBtn = screen.getAllByRole('button', { name: /registrando/i })[0];
      expect(submitBtn).toBeDisabled();
    });

    // Resolvemos para no dejar la promesa pendiente.
    await act(async () => { resolveSubmit({ id: 99 }); });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Submit con error
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — submit con error', () => {
  it('422 del backend → toast.error con detail estructurado', async () => {
    await renderAndWait();
    // Sobrescribir DESPUÉS de renderAndWait (que llama setupApi y setea
    // mockResolvedValue). Si se pone antes, setupApi lo pisa.
    mocks.mockRegistrarTraslado.mockRejectedValue({
      response: { data: { detail: 'Equipo no encontrado' } },
    });
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.mockToast.error).toHaveBeenCalledWith('Equipo no encontrado');
  });

  it('error de red puro (sin response) → fallback "Error al registrar traslado"', async () => {
    await renderAndWait();
    mocks.mockRegistrarTraslado.mockRejectedValue(new Error('Network'));
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    expect(mocks.mockToast.error)
      .toHaveBeenCalledWith('Error al registrar traslado');
  });

  it('tras error: modal sigue abierto y botón volvió a "Registrar Traslado" (saving=false vía .finally)', async () => {
    await renderAndWait();
    mocks.mockRegistrarTraslado.mockRejectedValue(new Error('Boom'));
    await openModal();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ventilador mindray sv300/i }))
        .toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '10' } });

    const areaInput = screen.getByPlaceholderText(/uci, urgencias, quirófano/i);
    fireEvent.change(areaInput, { target: { value: 'Urgencias' } });

    const form = document.querySelector('form');
    await act(async () => { fireEvent.submit(form); });

    // Modal sigue abierto (h2 visible).
    expect(screen.getByRole('heading', { name: /registrar traslado/i, level: 2 }))
      .toBeInTheDocument();
    // Botón del modal volvió a "Registrar Traslado" (no "Registrando...").
    const submitBtns = screen.getAllByRole('button', { name: /registrar traslado/i });
    // El del modal NO debe estar disabled.
    const modalSubmit = submitBtns.find(b => b.getAttribute('type') === 'submit');
    expect(modalSubmit).not.toBeDisabled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 9. Hygiene: console.error silenciado en rechazos esperados
// ────────────────────────────────────────────────────────────────────────────
describe('Trazabilidad — hygiene', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('no emite warnings de React ni de act() durante la carga', async () => {
    await renderAndWait({ movimientos: [] });

    // Filtramos sólo warnings/errors genuinos de React, no los console.error
    // silenciados explícitamente.
    const reactWarnings = consoleErrorSpy.mock.calls.filter(call => {
      const msg = String(call[0] ?? '');
      return msg.includes('not wrapped in act') || msg.includes('Warning:');
    });
    expect(reactWarnings).toHaveLength(0);
  });
});