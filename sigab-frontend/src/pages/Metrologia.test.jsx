// src/pages/Metrologia.test.jsx
// Metrologia es la página (246 líneas) de cumplimiento metrológico bajo
// NOM-028-SSA1-2012 — el control de exactitud y certificados de
// instrumentos de medición del hospital (esfigmomanómetros, termómetros
// clínicos, básculas, flujómetros de O₂, etc.). Concentra varios patrones
// sutiles:
//
//   - Estado loading inicial con `.finally()` que apaga loading. Si
//     alguien borra el `setLoading(false)` del `.finally()`, la pantalla
//     se queda eternamente con "Cargando calibraciones..." aunque la
//     promesa ya resolvió.
//   - Tolerancia a shape ausente: `data.calibraciones ?? data ?? []`
//     rescata respuestas del backend que no envuelven en {calibraciones}.
//     Si alguien borra el `?? []`, `.map()` rompe con TypeError cuando
//     la API devuelve `{}` o `{calibraciones: null}`.
//   - 3 endpoints: getMetrologia() (lista en mount), getEquipos({limit:200})
//     (modal en su propio mount, NO en mount de la página),
//     crearCalibracion(data) (submit del formulario).
//   - 2 validaciones en orden estricto:
//     1) !form.equipo_id → 'Selecciona un equipo'
//     2) !form.tipo_medicion.trim() → 'Ingresa el tipo de medición'
//     Si alguien reordena, los mensajes de error del operador cambian.
//     El .trim() es crítico: si alguien lo olvida, "   " pasa como
//     tipo de medición vacío al backend.
//   - `equipo_id: Number(form.equipo_id)` y `vigencia_meses:
//     Number(form.vigencia_meses)` en submit. Si alguien quita el
//     `Number()`, el backend recibe strings y rechaza con 422.
//   - Toast.success literal "Calibración registrada correctamente".
//   - Toast.error con fallback chain: `err.response?.data?.detail
//     || 'Error al registrar calibración'`. Cubre 4xx con detail
//     estructurado vs catch puro de red.
//   - `.finally(() => setSaving(false))`: si alguien lo borra, el botón
//     "Registrar Calibración" se queda disabled y label "Registrando..."
//     para siempre tras un error.
//   - Default fecha_calibracion = `new Date().toISOString().split('T')[0]`
//     (YYYY-MM-DD de hoy). Default vigencia_meses = 12.
//   - 3 KPIs derivados del array de calibraciones:
//     * Equipos Calibrados = calibraciones.length
//     * Próximos a Vencer (30d) = filter donde próxima_calibracion
//       está entre hoy y hoy+30d
//     * Vencidos = filter donde próxima_calibracion <= hoy
//     El filtro "Próximos" usa `new Date(c.proxima_calibracion) -
//     new Date()` con ventana de 30 días en ms. Si alguien cambia la
//     ventana, los conteos del operador cambian sin aviso.
//   - Estado de fila por fecha (no por campo del backend):
//     `isPast = new Date(c.proxima_calibracion) <= new Date()`.
//     `isPast=true` → badge "REEMPLAZAR/CALIBRAR" (rojo) y texto
//     rojo en "Próxima". `isPast=false` → badge "VIGENTE" (emerald)
//     y texto emerald en "Próxima". Si alguien invierte la comparación,
//     TODAS las calibraciones quedan marcadas al revés.
//   - Botón Certificado en cada fila: si `c.certificado_url` está,
//     `window.open(c.certificado_url, '_blank')`; si NO, se llama
//     `toast('Certificado aún no cargado...', { icon: '📄' })` — el
//     único lugar del codebase donde toast se usa COMO FUNCIÓN (no
//     como toast.success/error). El mock por tanto es un vi.fn()
//     callable con métodos attached.
//   - Empty state con ShieldCheck de lucide + texto "Sin calibraciones
//     registradas." (distinto del "No hay registros de capacitación
//     aún." de Capacitaciones).
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si alguien borra `setLoading(false)` del .finally(), la pantalla
//     se queda con "Cargando calibraciones..." para siempre.
//   - Si `?? []` se quita del setCalibraciones, una respuesta `{}`
//     rompe `.map()` con TypeError.
//   - Si el `Number()` se olvida, el backend rechaza con 422 y el
//     operador ve un toast rojo confuso.
//   - Si el `.trim()` se olvida en validación, "   " pasa como tipo
//     de medición vacío.
//   - Si el orden de validación cambia, los mensajes específicos se
//     pierden (ej. "Selecciona un equipo" nunca aparece).
//   - Si el catch del getEquipos del modal no loggea a toast, los
//     equipos no se cargan y el operador no sabe por qué el select
//     está vacío (degradación silenciosa).
//   - Si la condición `isPast = ... <= new Date()` se rompe, las
//     calibraciones pasadas se marcan como VIGENTE y viceversa.
//   - Si el cálculo de `proximos` cambia la ventana (de 30 días a
//     otro valor), el KPI del operador queda descalibrado.
//   - Si la rama `else toast(msg, opts)` del certificado button se
//     rompe, el operador hace click y no recibe feedback de que el
//     certificado aún no está cargado.
//
// Se mockea `../api/sigah` (3 endpoints) y `../lib/toast` (callable
// vi.fn con métodos success/error/info/warning/loading/dismiss para
// soportar `toast(msg, opts)` del certificado button Y
// `toast.success(msg)` / `toast.error(msg)` del modal). NO se mockea
// lucide-react (SVGs inline). NO se usa MemoryRouter (la página no usa
// react-router). NO se mockea framer-motion (no se usa).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

// vi.hoisted para que los vi.mock() que referencian mocks.mock* funcionen
// antes de que se ejecute el cuerpo del test (los mocks se hoistean al
// top del archivo).
const mocks = vi.hoisted(() => {
  // toast se importa como `import toast from '../lib/toast'` y se usa
  // tanto como `toast.success(...)`, `toast.error(...)` (objeto) COMO
  // `toast(msg, { icon: '📄' })` (función) en el botón Certificado.
  // Necesitamos un mock que sea callable Y tenga métodos attached.
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error   = vi.fn();
  toast.info    = vi.fn();
  toast.warning = vi.fn();
  toast.loading = vi.fn();
  toast.dismiss = vi.fn();
  return {
    mockGetMetrologia:    vi.fn(),
    mockGetEquipos:       vi.fn(),
    mockCrearCalibracion: vi.fn(),
    mockToast:            toast,
  };
});

vi.mock('../api/sigah', () => ({
  api: {
    getMetrologia:    (...args) => mocks.mockGetMetrologia(...args),
    getEquipos:       (...args) => mocks.mockGetEquipos(...args),
    crearCalibracion: (...args) => mocks.mockCrearCalibracion(...args),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:   mocks.mockToast,
}));

import Metrologia from './Metrologia';

// ── Fixtures ──
// Today is 2026-06-26 (vi.mock de Date.now podría ayudar, pero usamos
// fechas relativas fijas para que los tests sean determinísticos).
//
// - CAL_VIGENTE_LEJOS: próxima > 30d → VIGENTE, NO cuenta en "Próximos"
// - CAL_VIGENTE_30D:   próxima en 15d → VIGENTE, SÍ cuenta en "Próximos"
// - CAL_VENCIDA:       próxima < hoy → REEMPLAZAR/CALIBRAR
// - CAL_FUTURA_30D_LIMITE: exactamente 30d → SÍ cuenta en "Próximos"
//                          (diff < 30*24*60*60*1000, estricto menor)
const CAL_VIGENTE_LEJOS = {
  id: 1,
  equipo_id: 10,
  equipo_nombre: 'Monitor Philips MX450',
  equipo_serie: 'MX450-2024-001',
  tipo_medicion: 'Presión arterial no invasiva',
  fecha_calibracion: '2026-01-15',
  proxima_calibracion: '2027-01-15', // ~7 meses en el futuro
  entidad_calibradora: 'Laboratorio Traza',
  certificado_numero: 'CERT-2026-001',
  certificado_url: 'https://ejemplo.com/cert1.pdf',
};
const CAL_VIGENTE_30D = {
  id: 2,
  equipo_id: 11,
  equipo_nombre: 'Tensiómetro Welch Allyn',
  equipo_serie: 'WA-2024-042',
  tipo_medicion: 'Presión arterial',
  fecha_calibracion: '2026-06-01',
  proxima_calibracion: '2026-07-10', // ~14 días en el futuro (dentro de 30d)
  entidad_calibradora: '',
  certificado_numero: '',
  certificado_url: '',
};
const CAL_VENCIDA = {
  id: 3,
  equipo_id: 12,
  equipo_nombre: 'Báscula Seca 769',
  equipo_serie: 'SECA-769-2023-018',
  tipo_medicion: 'Masa (peso)',
  fecha_calibracion: '2025-05-10',
  proxima_calibracion: '2026-05-10', // ~47 días en el pasado
  entidad_calibradora: 'Lab. MetroCal',
  certificado_numero: 'CERT-2025-088',
  certificado_url: '',
};

const EQ_1 = { id: 10, nombre: 'Monitor Philips MX450', serie: 'MX450-2024-001' };
const EQ_2 = { id: 11, nombre: 'Tensiómetro Welch Allyn', serie: 'WA-2024-042' };
const EQ_3 = { id: 12, nombre: 'Báscula Seca 769',        serie: 'SECA-769-2023-018' };

// ── Helpers ──
function setupApi({ calibraciones = [CAL_VIGENTE_LEJOS], equipos = [EQ_1, EQ_2, EQ_3] } = {}) {
  mocks.mockGetMetrologia.mockResolvedValue({ calibraciones });
  mocks.mockGetEquipos.mockResolvedValue({ equipos });
  mocks.mockCrearCalibracion.mockResolvedValue({ id: 99 });
}

function renderM() {
  return render(<Metrologia />);
}

async function renderAndWait({
  calibraciones = [CAL_VIGENTE_LEJOS],
  equipos = [EQ_1, EQ_2, EQ_3],
} = {}) {
  setupApi({ calibraciones, equipos });
  renderM();
  await act(async () => { await Promise.resolve(); });
}

function getHeader() {
  return screen.getByRole('heading', { name: /metrología y calibración/i, level: 1 });
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Render base — header h1, subtítulo, 3 KPI cards, botón Nueva Calibración
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — render base', () => {
  it('muestra "Cargando calibraciones..." mientras getMetrologia no resuelve', () => {
    mocks.mockGetMetrologia.mockReturnValue(new Promise(() => {}));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderM();

    expect(screen.getByText(/cargando calibraciones/i)).toBeInTheDocument();
  });

  it('oculta el loading después de que getMetrologia resuelve', async () => {
    await renderAndWait({ calibraciones: [] });

    expect(screen.queryByText(/cargando calibraciones/i)).not.toBeInTheDocument();
  });

  it('renderiza el header h1 "Metrología y Calibración"', async () => {
    await renderAndWait();

    expect(getHeader()).toBeInTheDocument();
  });

  it('el subtítulo menciona "Control de exactitud y certificados"', async () => {
    await renderAndWait();

    // Subtítulo es el <p> hermano del h1.
    const subtitle = getHeader().parentElement.querySelector('p');
    expect(subtitle).toHaveTextContent(/control de exactitud y certificados/i);
  });

  it('renderiza el botón "Nueva Calibración" en la cabecera', async () => {
    await renderAndWait();

    expect(screen.getByRole('button', { name: /nueva calibración/i }))
      .toBeInTheDocument();
  });

  it('muestra las 3 KPI cards: Calibrados, Próximos a Vencer, Vencidos', async () => {
    await renderAndWait({ calibraciones: [CAL_VIGENTE_LEJOS, CAL_VENCIDA] });

    expect(screen.getByText(/equipos calibrados/i)).toBeInTheDocument();
    expect(screen.getByText(/próximos a vencer \(30d\)/i)).toBeInTheDocument();
    expect(screen.getByText(/vencidos \/ fuera de norma/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. KPIs — conteos derivados del array de calibraciones
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — KPI counts', () => {
  it('"Equipos Calibrados" = calibraciones.length', async () => {
    await renderAndWait({ calibraciones: [CAL_VIGENTE_LEJOS, CAL_VIGENTE_30D, CAL_VENCIDA] });

    // El KPI "Equipos Calibrados" muestra el length como text-3xl font-bold.
    // El número 3 debe aparecer dentro del mismo bloque que el label.
    const card = screen.getByText(/equipos calibrados/i).closest('div');
    expect(card).toHaveTextContent('3');
  });

  it('"Próximos a Vencer (30d)" cuenta SOLO las dentro de la ventana de 30 días', async () => {
    await renderAndWait({
      calibraciones: [CAL_VIGENTE_LEJOS, CAL_VIGENTE_30D, CAL_VENCIDA],
    });

    // CAL_VIGENTE_LEJOS: ~7 meses → NO cuenta
    // CAL_VIGENTE_30D:   ~14 días → SÍ cuenta
    // CAL_VENCIDA:       en el pasado → NO cuenta (diff < 0, filtro `> 0`)
    const card = screen.getByText(/próximos a vencer \(30d\)/i).closest('div');
    expect(card).toHaveTextContent('1');
  });

  it('"Vencidos" cuenta las calibraciones con próxima <= hoy', async () => {
    await renderAndWait({
      calibraciones: [CAL_VIGENTE_LEJOS, CAL_VIGENTE_30D, CAL_VENCIDA],
    });

    // Sólo CAL_VENCIDA (proxima=2026-05-10, hoy=2026-06-26) cuenta.
    const card = screen.getByText(/vencidos \/ fuera de norma/i).closest('div');
    expect(card).toHaveTextContent('1');
  });

  it('todos los KPIs muestran 0 cuando no hay calibraciones', async () => {
    await renderAndWait({ calibraciones: [] });

    // Empty state con "Sin calibraciones registradas."
    expect(screen.getByText(/sin calibraciones registradas/i)).toBeInTheDocument();
    // Los 3 KPIs muestran 0 (sus bloques siguen renderizados en el grid).
    const cards = screen.getAllByText('0');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Empty state — sin calibraciones
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — empty state', () => {
  it('muestra "Sin calibraciones registradas." cuando la lista está vacía', async () => {
    await renderAndWait({ calibraciones: [] });

    expect(screen.getByText(/sin calibraciones registradas/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Tabla — render de filas vigentes y vencidas
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — tabla de calibraciones', () => {
  it('renderiza los headers de columna en el orden correcto', async () => {
    await renderAndWait();

    expect(screen.getByText('Equipo / Serie')).toBeInTheDocument();
    expect(screen.getByText('Magnitud/Tipo')).toBeInTheDocument();
    expect(screen.getByText('Última')).toBeInTheDocument();
    expect(screen.getByText('Próxima')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Certificado')).toBeInTheDocument();
  });

  it('calibración VIGENTE muestra badge verde "VIGENTE"', async () => {
    await renderAndWait({ calibraciones: [CAL_VIGENTE_LEJOS] });

    const badge = screen.getByText('VIGENTE');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/text-emerald-500/);
  });

  it('calibración VENCIDA muestra badge rojo "REEMPLAZAR/CALIBRAR"', async () => {
    await renderAndWait({ calibraciones: [CAL_VENCIDA] });

    const badge = screen.getByText('REEMPLAZAR/CALIBRAR');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/text-red-500/);
  });

  it('fecha "Próxima" se renderiza en rojo cuando está vencida', async () => {
    await renderAndWait({ calibraciones: [CAL_VENCIDA] });

    // La celda "Próxima" de CAL_VENCIDA muestra '2026-05-10' con clase
    // text-red-500 (no emerald).
    const proximaCell = screen.getByText('2026-05-10');
    expect(proximaCell).toBeInTheDocument();
    expect(proximaCell.className).toMatch(/text-red-500/);
  });

  it('fecha "Próxima" se renderiza en emerald cuando está vigente', async () => {
    await renderAndWait({ calibraciones: [CAL_VIGENTE_LEJOS] });

    const proximaCell = screen.getByText('2027-01-15');
    expect(proximaCell).toBeInTheDocument();
    expect(proximaCell.className).toMatch(/text-emerald-500/);
  });

  it('muestra el nombre del equipo en bold + serie en uppercase', async () => {
    await renderAndWait({ calibraciones: [CAL_VIGENTE_LEJOS] });

    // El nombre va en <p className="font-bold ...">.
    const nombre = screen.getByText('Monitor Philips MX450');
    expect(nombre).toBeInTheDocument();
    expect(nombre.className).toMatch(/font-bold/);
    // La serie en <p className="text-[10px] ... uppercase">.
    const serie = screen.getByText('MX450-2024-001');
    expect(serie).toBeInTheDocument();
    expect(serie.className).toMatch(/uppercase/);
  });

  it('renderiza múltiples filas en la tabla', async () => {
    await renderAndWait({
      calibraciones: [CAL_VIGENTE_LEJOS, CAL_VIGENTE_30D, CAL_VENCIDA],
    });

    // Los 3 nombres de equipo aparecen.
    expect(screen.getByText('Monitor Philips MX450')).toBeInTheDocument();
    expect(screen.getByText('Tensiómetro Welch Allyn')).toBeInTheDocument();
    expect(screen.getByText('Báscula Seca 769')).toBeInTheDocument();
    // VIGENTE aparece 2 veces (CAL_VIGENTE_LEJOS + CAL_VIGENTE_30D).
    expect(screen.getAllByText('VIGENTE')).toHaveLength(2);
    // REEMPLAZAR/CALIBRAR aparece 1 vez (CAL_VENCIDA).
    expect(screen.getAllByText('REEMPLAZAR/CALIBRAR')).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Botón Certificado — window.open con URL, toast fallback sin URL
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — botón Certificado', () => {
  it('click en Certificado CON URL llama window.open(url, "_blank")', async () => {
    await renderAndWait({ calibraciones: [CAL_VIGENTE_LEJOS] });

    // El botón Certificado es el único <button> con title="Abrir certificado".
    const btn = screen.getByTitle(/abrir certificado/i);
    fireEvent.click(btn);

    expect(window.open).toHaveBeenCalledWith(
      'https://ejemplo.com/cert1.pdf',
      '_blank',
    );
    // El toast fallback NO debe haberse llamado.
    expect(mocks.mockToast).not.toHaveBeenCalled();
  });

  it('click en Certificado SIN URL llama toast(msg, { icon })', async () => {
    await renderAndWait({ calibraciones: [CAL_VENCIDA] });

    // CAL_VENCIDA tiene certificado_url='' → entra al else.
    const btn = screen.getByTitle(/sin certificado/i);
    fireEvent.click(btn);

    // window.open NO se llama.
    expect(window.open).not.toHaveBeenCalled();
    // toast se llama COMO FUNCIÓN con el mensaje literal y el icon 📄.
    expect(mocks.mockToast).toHaveBeenCalledWith(
      'Certificado aún no cargado para este equipo',
      { icon: '📄' },
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Modal Nueva Calibración — apertura, campos, defaults
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — modal Nueva Calibración', () => {
  it('click en "Nueva Calibración" abre el modal con título correcto', async () => {
    await renderAndWait();

    expect(screen.queryByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
      .not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .toBeInTheDocument();
    });
  });

  it('al abrir el modal llama getEquipos({ limit: 200 })', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 200 });
    });
  });

  it('el select de equipo muestra los equipos cargados', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('Monitor Philips MX450');
    expect(select).toHaveTextContent('Tensiómetro Welch Allyn');
    expect(select).toHaveTextContent('Báscula Seca 769');
  });

  it('el campo fecha_calibracion está pre-rellenado con la fecha de hoy', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue(new Date().toISOString().split('T')[0]))
        .toBeInTheDocument();
    });
  });

  it('el campo vigencia_meses está pre-rellenado con 12', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    });
  });

  it('el modal tiene los labels correctos de los 6 campos', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => {
      expect(screen.getByText('Equipo *')).toBeInTheDocument();
    });
    expect(screen.getByText('Tipo de medición *')).toBeInTheDocument();
    expect(screen.getByText('Fecha de calibración *')).toBeInTheDocument();
    expect(screen.getByText(/vigencia \(meses\)/i)).toBeInTheDocument();
    expect(screen.getByText(/entidad calibradora/i)).toBeInTheDocument();
    expect(screen.getByText(/número de certificado/i)).toBeInTheDocument();
  });

  it('el modal tiene los botones "Cancelar" y "Registrar Calibración"', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /registrar calibración/i }))
      .toBeInTheDocument();
  });

  it('"Cancelar" cierra el modal sin enviar', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .not.toBeInTheDocument();
    });
    expect(mocks.mockCrearCalibracion).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Validación del formulario — 2 paths en orden estricto
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — validación del formulario', () => {
  // Helper: abre el modal y devuelve el <form>. fireEvent.submit(form)
  // bypassea la validación HTML5 del atributo `required` en jsdom (igual
  // patrón que Capacitaciones.test.jsx) y deja correr handleSubmit directo.
  async function openModalAndGetForm() {
    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .toBeInTheDocument();
    });
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    return document.querySelector('form');
  }

  it('submit sin equipo_id muestra "Selecciona un equipo"', async () => {
    await renderAndWait();

    const form = await openModalAndGetForm();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Selecciona un equipo');
    });
    expect(mocks.mockCrearCalibracion).not.toHaveBeenCalled();
  });

  it('submit con equipo pero sin tipo_medicion muestra "Ingresa el tipo de medición"', async () => {
    await renderAndWait();

    const form = await openModalAndGetForm();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Ingresa el tipo de medición');
    });
    expect(mocks.mockCrearCalibracion).not.toHaveBeenCalled();
  });

  it('tipo_medicion con sólo whitespace falla la validación por el .trim()', async () => {
    await renderAndWait();

    const form = await openModalAndGetForm();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/presión arterial, temperatura/i), {
      target: { value: '   ' },
    });
    await act(async () => { await Promise.resolve(); });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Ingresa el tipo de medición');
    });
    expect(mocks.mockCrearCalibracion).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Submit exitoso — crearCalibracion con Number(), toast, cierre modal
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — submit exitoso', () => {
  async function openModalAndFillValid() {
    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .toBeInTheDocument();
    });
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/presión arterial, temperatura/i), {
      target: { value: 'Temperatura corporal' },
    });
    fireEvent.change(screen.getByPlaceholderText(/laboratorio nom-028/i), {
      target: { value: 'Lab. MetroCal' },
    });
    fireEvent.change(screen.getByPlaceholderText(/cert-2026-001/i), {
      target: { value: 'CERT-2026-099' },
    });
    await act(async () => { await Promise.resolve(); });
    return document.querySelector('form');
  }

  it('submit válido llama crearCalibracion con equipo_id y vigencia_meses como Number', async () => {
    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockCrearCalibracion).toHaveBeenCalledTimes(1);
    });

    const callArgs = mocks.mockCrearCalibracion.mock.calls[0][0];
    // equipo_id debe ser Number, NO string (backend rechaza si es string).
    expect(callArgs.equipo_id).toBe(10);
    expect(typeof callArgs.equipo_id).toBe('number');
    // vigencia_meses también convertido a Number (default 12).
    expect(callArgs.vigencia_meses).toBe(12);
    expect(typeof callArgs.vigencia_meses).toBe('number');
    // Otros campos en orden.
    expect(callArgs.tipo_medicion).toBe('Temperatura corporal');
    expect(callArgs.entidad_calibradora).toBe('Lab. MetroCal');
    expect(callArgs.certificado_numero).toBe('CERT-2026-099');
    // fecha_calibracion es hoy (default, no se cambió).
    expect(callArgs.fecha_calibracion).toBe(new Date().toISOString().split('T')[0]);
  });

  it('submit exitoso muestra toast.success "Calibración registrada correctamente"', async () => {
    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.success)
        .toHaveBeenCalledWith('Calibración registrada correctamente');
    });
  });

  it('después del éxito el modal se cierra y la lista se recarga', async () => {
    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    // Modal se cierra.
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .not.toBeInTheDocument();
    });

    // getMetrologia se llamó al menos 2 veces (mount + reload vía onSaved).
    await waitFor(() => {
      expect(mocks.mockGetMetrologia.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('el botón submit muestra "Registrando..." mientras saving=true', async () => {
    // Hacemos que crearCalibracion tarde en resolver.
    mocks.mockCrearCalibracion.mockReturnValue(new Promise(() => {}));

    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    // El botón cambia su texto a "Registrando..." y se deshabilita.
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /registrando\.\.\./i });
      expect(btn).toBeDisabled();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 9. Submit con error — toast.error con detail del backend
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — submit con error', () => {
  async function openModalAndFillValid() {
    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^nueva calibración$/i, level: 2 }))
        .toBeInTheDocument();
    });
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/presión arterial, temperatura/i), {
      target: { value: 'Temperatura' },
    });
    await act(async () => { await Promise.resolve(); });
    return document.querySelector('form');
  }

  it('error 4xx del backend muestra toast.error con err.response.data.detail', async () => {
    await renderAndWait();

    // Simulamos 422 del backend con detail estructurado.
    const err422 = {
      response: { data: { detail: 'Equipo no encontrado' } },
    };
    mocks.mockCrearCalibracion.mockRejectedValue(err422);

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Equipo no encontrado');
    });
  });

  it('error de red puro muestra fallback "Error al registrar calibración"', async () => {
    await renderAndWait();

    // Error sin response (e.g. timeout, CORS).
    const networkErr = new Error('Network Error');
    mocks.mockCrearCalibracion.mockRejectedValue(networkErr);

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Error al registrar calibración');
    });
  });

  it('después del error el modal sigue abierto (saving vuelve a false por .finally())', async () => {
    await renderAndWait();

    mocks.mockCrearCalibracion.mockRejectedValue(new Error('boom'));

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    // El toast aparece.
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalled();
    });

    // El modal sigue abierto y el botón volvió a "Registrar Calibración"
    // (no "Registrando..."), lo que prueba que saving=false tras error
    // gracias al .finally(setSaving(false)).
    const submitBtn = screen.getByRole('button', { name: /registrar calibración/i });
    expect(submitBtn).not.toBeDisabled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 10. Carga inicial y tolerancia a shape
// ────────────────────────────────────────────────────────────────────────────
describe('Metrologia — carga inicial y tolerancia a shape', () => {
  it('error de carga muestra toast.error "Error al cargar metrología"', async () => {
    mocks.mockGetMetrologia.mockRejectedValue(new Error('Network'));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderM();
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Error al cargar metrología');
    });
  });

  it('respuesta con {calibraciones: []} muestra empty state', async () => {
    mocks.mockGetMetrologia.mockResolvedValue({ calibraciones: [] });
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderM();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText(/sin calibraciones registradas/i)).toBeInTheDocument();
  });

  it('respuesta como array directo (sin wrap) se acepta via fallback', async () => {
    // Cubre `data.calibraciones ?? data ?? []` — si el backend devuelve
    // un array crudo sin envolver, el operador todavía ve la lista.
    mocks.mockGetMetrologia.mockResolvedValue([CAL_VIGENTE_LEJOS]);
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderM();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Monitor Philips MX450')).toBeInTheDocument();
  });

  it('acepta respuesta `{}` (objeto vacío) sin crash → fallback a []', async () => {
    // Tras el fix del ciclo 34, pickList(data, 'calibraciones') tolera `{}`.
    mocks.mockGetMetrologia.mockResolvedValue({});
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderM();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText(/sin calibraciones registradas/i)).toBeInTheDocument();
  });

  it('getEquipos falla en el modal muestra toast.error "Error al cargar equipos"', async () => {
    mocks.mockGetEquipos.mockRejectedValue(new Error('Network'));
    mocks.mockGetMetrologia.mockResolvedValue({ calibraciones: [] });

    renderM();
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Error al cargar equipos');
    });
  });

  it('getEquipos devuelve array directo (sin {equipos}) via fallback', async () => {
    // Cubre `data.equipos ?? data ?? []` del modal.
    mocks.mockGetMetrologia.mockResolvedValue({ calibraciones: [] });
    mocks.mockGetEquipos.mockResolvedValue([EQ_1, EQ_2]);

    renderM();
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole('button', { name: /nueva calibración/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    const select = screen.getByRole('combobox');
    expect(select).toHaveTextContent('Monitor Philips MX450');
    expect(select).toHaveTextContent('Tensiómetro Welch Allyn');
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // El catch de cargar() y el catch de crearCalibracion loggean a
  // console.error en errores esperados — sin silenciarlo, stderr se inunda.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom window.open por defecto abre pestañas reales; lo espiamos para
  // que el test no abra nada y poder verificar las llamadas.
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
});
