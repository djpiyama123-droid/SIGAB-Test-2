// src/pages/Capacitaciones.test.jsx
// Capacitaciones es la página (208 líneas) de cumplimiento NOM-016 — el
// registro de formación en uso y seguridad de equipos médicos. Es un CRUD
// simple: lista tarjetas por capacitación con tema/equipo/instructor/personal
// capacitado, y un modal "Nuevo Registro" con formulario. Es la candidata
// más compacta del backlog de páginas-con-fetch sin charts ni mapa.
//
// Patrones sutiles cubiertos:
//
//   - Estado loading inicial con `.finally()` que apaga loading. Si
//     alguien borra el `setLoading(false)` del `.finally()`, la pantalla
//     se queda eternamente en "Cargando capacitaciones..." aunque la
//     promesa ya resolvió.
//   - Tolerancia a shape ausente: `data.capacitaciones ?? data ?? []`
//     rescata respuestas del backend que no envuelven en {capacitaciones}.
//     Si alguien borra el `?? []`, `.map()` rompe con TypeError.
//   - 3 endpoints: getCapacitaciones(), getEquipos({limit: 200}),
//     crearCapacitacion(data). El modal llama getEquipos en su mount.
//   - Validación en orden estricto:
//     1) !form.equipo_id → 'Selecciona un equipo'
//     2) !form.tema.trim() → 'Ingresa el tema de la capacitación'
//     3) !form.personal_capacitado.trim() → 'Indica el personal capacitado'
//     Si alguien reordena, los mensajes de error del operador cambian.
//   - `equipo_id: Number(form.equipo_id)` en submit. Si alguien quita el
//     `Number()`, el backend recibe un string y rechaza.
//   - Toast.success con texto literal "Capacitación registrada — cumplimiento
//     NOM-016" (con em-dash U+2014, no guion normal). El operador espera
//     ver exactamente este mensaje porque confirma el cumplimiento normativo.
//   - Toast.error del catch del modal usa `err.response?.data?.detail`
//     como fallback a 'Error al registrar capacitación'. Cubre el caso de
//     respuesta 4xx del backend (e.g. validación) vs catch puro de red.
//   - Default fecha_capacitacion = `new Date().toISOString().split('T')[0]`
//     (YYYY-MM-DD de hoy). El input es `type="date"`.
//   - `item.instructor || 'Por definir'` para casos donde el instructor
//     no fue capturado (campo opcional en backend).
//   - `item.personal_capacitado && (...)` para no renderizar el párrafo
//     cuando el personal está vacío (silencio, no "—").
//   - Empty state card con botón "+ Agregar primer registro" que abre
//     el modal también.
//   - Card footer "Evidencia Digital" + ChevronRight de lucide.
//
// Riesgos silenciosos cubiertos:
//   - Si alguien borra el `|| []` del setCapacitaciones, la UI rompe
//     cuando la API devuelve {capacitaciones: null} o {}.
//   - Si el `Number()` se olvida, el backend rechaza con 422 y el
//     operador ve un toast rojo confuso.
//   - Si el `.trim()` se olvida en la validación, un tema de " "
//     (espacios) pasa la validación y queda como capacitación vacía.
//   - Si el `onSaved()` no se llama tras éxito, el modal queda abierto
//     y la lista no se refresca.
//   - Si el orden de validación cambia, los mensajes específicos se
//     pierden (ej. "Selecciona un equipo" nunca aparece porque tema
//     se valida primero).
//   - Si el catch del getEquipos del modal no loggea a toast, los
//     equipos no se cargan y el operador no sabe por qué el select está
//     vacío (degradación silenciosa).
//
// Se mockea `../api/sigah` (3 endpoints) y `../lib/toast`. NO se mockea
// lucide-react (SVGs inline). NO se mockea framer-motion (no se usa).
// NO se usa MemoryRouter (la página no usa react-router).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetCapacitaciones: vi.fn(),
  mockGetEquipos: vi.fn(),
  mockCrearCapacitacion: vi.fn(),
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
    getCapacitaciones: (...args) => mocks.mockGetCapacitaciones(...args),
    getEquipos:         (...args) => mocks.mockGetEquipos(...args),
    crearCapacitacion:  (...args) => mocks.mockCrearCapacitacion(...args),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import Capacitaciones from './Capacitaciones';

// ── Fixtures ──
const CAP_BASIC = {
  id: 1,
  tema: 'Uso seguro del ventilador mecánico',
  equipo_id: 10,
  equipo_nombre: 'Ventilador Mindray SV300',
  equipo_serie: 'SV300-2023-042',
  fecha_capacitacion: '2026-05-15',
  instructor: 'Dr. Martínez',
  personal_capacitado: 'Enf. García, Enf. López, Dr. Martínez',
};

const CAP_SIN_INSTRUCTOR = {
  id: 2,
  tema: 'Calibración de monitores',
  equipo_id: 11,
  equipo_nombre: 'Monitor Philips MX450',
  equipo_serie: 'MX450-2024-001',
  fecha_capacitacion: '2026-06-01',
  instructor: '',
  personal_capacitado: 'Enf. Hernández',
};

const CAP_SIN_PERSONAL = {
  id: 3,
  tema: 'Mantenimiento básico',
  equipo_id: 12,
  equipo_nombre: 'Desfibrilador ZOLL R',
  equipo_serie: 'ZOLL-R-998',
  fecha_capacitacion: '2026-04-20',
  instructor: 'Ing. Ramírez',
  personal_capacitado: '',
};

const EQ_1 = { id: 10, nombre: 'Ventilador Mindray SV300', serie: 'SV300-2023-042' };
const EQ_2 = { id: 11, nombre: 'Monitor Philips MX450', serie: 'MX450-2024-001' };
const EQ_3 = { id: 12, nombre: 'Desfibrilador ZOLL R', serie: 'ZOLL-R-998' };

// ── Helpers ──
function setupApi({ capacitaciones = [CAP_BASIC], equipos = [EQ_1, EQ_2, EQ_3] } = {}) {
  mocks.mockGetCapacitaciones.mockResolvedValue({ capacitaciones });
  mocks.mockGetEquipos.mockResolvedValue({ equipos });
  mocks.mockCrearCapacitacion.mockResolvedValue({ id: 99 });
}

function renderC() {
  return render(<Capacitaciones />);
}

async function renderAndWait({ capacitaciones = [CAP_BASIC], equipos = [EQ_1, EQ_2, EQ_3] } = {}) {
  setupApi({ capacitaciones, equipos });
  renderC();
  await act(async () => {
    await Promise.resolve();
  });
  // También esperamos al useEffect del modal NO se ejecuta hasta abrir.
  // Aquí sólo esperamos a la promesa de la lista principal.
}

function getHeader() {
  return screen.getByRole('heading', { name: /capacitación de personal/i, level: 1 });
}

function getCard(tema) {
  return screen.getByText(tema).closest('.bg-\\[var\\(--content-surface\\)\\]')
      || screen.getByText(tema).closest('div[class*="content-surface"]');
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Render base — header, subtítulo NOM-016, botón Nuevo Registro
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — render base', () => {
  it('muestra "Cargando capacitaciones..." mientras getCapacitaciones no resuelve', () => {
    mocks.mockGetCapacitaciones.mockReturnValue(new Promise(() => {}));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderC();

    expect(screen.getByText(/cargando capacitaciones/i)).toBeInTheDocument();
  });

  it('oculta el loading después de que getCapacitaciones resuelve', async () => {
    await renderAndWait({ capacitaciones: [] });

    expect(screen.queryByText(/cargando capacitaciones/i)).not.toBeInTheDocument();
  });

  it('renderiza el header h1 "Capacitación de Personal"', async () => {
    await renderAndWait();

    expect(getHeader()).toBeInTheDocument();
  });

  it('el subtítulo menciona cumplimiento NOM-016', async () => {
    await renderAndWait();

    // El subtítulo es el <p> hermano del h1. Scopeamos al parent.
    const subtitle = getHeader().parentElement.querySelector('p');
    expect(subtitle).toHaveTextContent(/nom-016/i);
  });

  it('renderiza el botón "Nuevo Registro" en la cabecera', async () => {
    await renderAndWait();

    const btn = screen.getByRole('button', { name: /nuevo registro/i });
    expect(btn).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Cards de capacitación — render de los campos del item
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — cards de items', () => {
  it('renderiza una card por capacitación con tema, equipo y serie', async () => {
    await renderAndWait();

    // El tema aparece en un h3 de la card.
    expect(screen.getByRole('heading', { name: /uso seguro del ventilador/i, level: 3 }))
      .toBeInTheDocument();
    // Equipo + serie en el párrafo descriptivo.
    expect(screen.getByText(/ventilador mindray sv300.*sv300-2023-042/i)).toBeInTheDocument();
  });

  it('muestra la fecha_capacitacion en monoespaciado', async () => {
    await renderAndWait();

    // La fecha está en un <span className="font-mono ...">.
    const fechaSpan = screen.getByText('2026-05-15');
    expect(fechaSpan).toBeInTheDocument();
    expect(fechaSpan).toHaveClass('font-mono');
  });

  it('muestra el instructor con label "Instructor:" y valor en bold', async () => {
    await renderAndWait();

    // El label "Instructor:" aparece en la card.
    expect(screen.getByText(/instructor:/i)).toBeInTheDocument();
    // El valor "Dr. Martínez" en negrita.
    expect(screen.getByText('Dr. Martínez')).toBeInTheDocument();
  });

  it('muestra "Por definir" cuando instructor está vacío', async () => {
    await renderAndWait({ capacitaciones: [CAP_SIN_INSTRUCTOR] });

    expect(screen.getByText(/por definir/i)).toBeInTheDocument();
  });

  it('muestra el personal_capacitado en párrafo truncado', async () => {
    await renderAndWait();

    expect(screen.getByText(/enf\. garcía, enf\. lópez, dr\. martínez/i)).toBeInTheDocument();
  });

  it('NO renderiza el párrafo de personal_capacitado cuando está vacío', async () => {
    await renderAndWait({ capacitaciones: [CAP_SIN_PERSONAL] });

    // Sólo debe aparecer "Mantenimiento básico" (el tema) y "Ing. Ramírez".
    // El patrón "Personal: " con texto siguiente NO debe estar.
    expect(screen.queryByText(/^personal:/i)).not.toBeInTheDocument();
  });

  it('cada card tiene el footer "Evidencia Digital" + ChevronRight', async () => {
    await renderAndWait();

    const footer = screen.getByText('Evidencia Digital');
    expect(footer).toBeInTheDocument();
    // El texto está en un span con clases de uppercase + tracking.
    expect(footer).toHaveClass('uppercase');
  });

  it('renderiza múltiples cards en grid para múltiples capacitaciones', async () => {
    await renderAndWait({
      capacitaciones: [CAP_BASIC, CAP_SIN_INSTRUCTOR, CAP_SIN_PERSONAL],
    });

    expect(screen.getByRole('heading', { name: /uso seguro del ventilador/i, level: 3 }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /calibración de monitores/i, level: 3 }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mantenimiento básico/i, level: 3 }))
      .toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Empty state — sin capacitaciones
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — empty state', () => {
  it('muestra "No hay registros de capacitación aún." cuando la lista está vacía', async () => {
    await renderAndWait({ capacitaciones: [] });

    expect(screen.getByText(/no hay registros de capacitación aún/i)).toBeInTheDocument();
  });

  it('el botón "+ Agregar primer registro" abre el modal', async () => {
    await renderAndWait({ capacitaciones: [] });

    // Antes: modal no existe.
    expect(screen.queryByText(/nuevo registro de capacitación/i)).not.toBeInTheDocument();

    // Click en el botón del empty state.
    const agregarBtn = screen.getByRole('button', { name: /\+ agregar primer registro/i });
    fireEvent.click(agregarBtn);

    // Ahora el modal está visible.
    await waitFor(() => {
      expect(screen.getByText(/nuevo registro de capacitación/i)).toBeInTheDocument();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Modal — apertura y campos
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — modal Nuevo Registro', () => {
  it('click en "Nuevo Registro" abre el modal con el título correcto', async () => {
    await renderAndWait();

    expect(screen.queryByText(/nuevo registro de capacitación/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nuevo registro de capacitación/i, level: 2 }))
        .toBeInTheDocument();
    });
  });

  it('al abrir el modal llama getEquipos({ limit: 200 })', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 200 });
    });
  });

  it('el select de equipo muestra los equipos cargados', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    // Esperamos al useEffect del modal.
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalled();
    });
    await act(async () => { await Promise.resolve(); });

    // Verificamos que los 3 equipos aparecen como <option>.
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('Ventilador Mindray SV300');
    expect(select).toHaveTextContent('Monitor Philips MX450');
    expect(select).toHaveTextContent('Desfibrilador ZOLL R');
  });

  it('el campo fecha_capacitacion está pre-rellenado con la fecha de hoy', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue(new Date().toISOString().split('T')[0]))
        .toBeInTheDocument();
    });
  });

  it('el modal tiene los 5 campos del formulario: equipo, tema, fecha, instructor, personal', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    await waitFor(() => {
      expect(screen.getByText('Equipo *')).toBeInTheDocument();
    });
    expect(screen.getByText('Tema de capacitación *')).toBeInTheDocument();
    expect(screen.getByText('Fecha *')).toBeInTheDocument();
    expect(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.getByText('Personal capacitado *')).toBeInTheDocument();
  });

  it('el modal tiene los botones "Cancelar" y "Registrar Capacitación"', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /registrar capacitación/i })).toBeInTheDocument();
  });

  it('"Cancelar" cierra el modal sin enviar', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));

    await waitFor(() => {
      expect(screen.getByText(/nuevo registro de capacitación/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByText(/nuevo registro de capacitación/i)).not.toBeInTheDocument();
    });
    // crearCapacitacion NO debe haberse llamado.
    expect(mocks.mockCrearCapacitacion).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Validación del formulario — 3 paths en orden estricto
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — validación del formulario', () => {
  // Helper: abre el modal y devuelve el <form>. Usamos fireEvent.submit(form)
  // directamente para BYPASSEAR la validación HTML5 del atributo `required`
  // en jsdom — el `required` bloquearía el click() del botón submit antes
  // de que handleSubmit corra y dispare el toast.error. Con fireEvent.submit
  // el evento submit se dispara directo y handleSubmit se ejecuta, permitiendo
  // testear la validación JS (orden estricto, .trim(), mensajes exactos).
  async function openModalAndGetForm() {
    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));
    await waitFor(() => {
      expect(screen.getByText(/nuevo registro de capacitación/i)).toBeInTheDocument();
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
    expect(mocks.mockCrearCapacitacion).not.toHaveBeenCalled();
  });

  it('submit con equipo pero sin tema muestra "Ingresa el tema"', async () => {
    await renderAndWait();

    const form = await openModalAndGetForm();
    // Llenamos sólo equipo.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Ingresa el tema de la capacitación');
    });
    expect(mocks.mockCrearCapacitacion).not.toHaveBeenCalled();
  });

  it('submit con tema pero sin personal_capacitado muestra "Indica el personal capacitado"', async () => {
    await renderAndWait();

    const form = await openModalAndGetForm();
    // Llenamos equipo + tema pero NO personal.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/uso seguro del ventilador/i), {
      target: { value: 'Manejo de desfibrilador' },
    });
    await act(async () => { await Promise.resolve(); });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Indica el personal capacitado');
    });
    expect(mocks.mockCrearCapacitacion).not.toHaveBeenCalled();
  });

  it('tema con sólo whitespace falla la validación por el .trim()', async () => {
    await renderAndWait();

    const form = await openModalAndGetForm();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/uso seguro del ventilador/i), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/lista o descripción del grupo/i), {
      target: { value: 'Equipo X' },
    });
    await act(async () => { await Promise.resolve(); });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Ingresa el tema de la capacitación');
    });
    expect(mocks.mockCrearCapacitacion).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Submit exitoso — crearCapacitacion con equipo_id como Number
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — submit exitoso', () => {
  // Helper: abre modal, llena todos los campos requeridos y devuelve el form.
  async function openModalAndFillValid() {
    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));
    await waitFor(() => {
      expect(screen.getByText(/nuevo registro de capacitación/i)).toBeInTheDocument();
    });
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/uso seguro del ventilador/i), {
      target: { value: 'Manejo de ventilador' },
    });
    fireEvent.change(screen.getByPlaceholderText(/nombre del instructor/i), {
      target: { value: 'Dr. Pérez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/lista o descripción del grupo/i), {
      target: { value: 'Enf. García, Enf. López' },
    });
    await act(async () => { await Promise.resolve(); });
    return document.querySelector('form');
  }

  it('submit válido llama crearCapacitacion con equipo_id convertido a Number', async () => {
    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockCrearCapacitacion).toHaveBeenCalledTimes(1);
    });

    // El equipo_id debe ser Number, no string.
    const callArgs = mocks.mockCrearCapacitacion.mock.calls[0][0];
    expect(callArgs.equipo_id).toBe(10);
    expect(typeof callArgs.equipo_id).toBe('number');
    expect(callArgs.tema).toBe('Manejo de ventilador');
    expect(callArgs.instructor).toBe('Dr. Pérez');
    expect(callArgs.personal_capacitado).toBe('Enf. García, Enf. López');
    // fecha_capacitacion es hoy (default, no se cambió).
    expect(callArgs.fecha_capacitacion).toBe(new Date().toISOString().split('T')[0]);
  });

  it('submit exitoso muestra toast.success "Capacitación registrada — cumplimiento NOM-016"', async () => {
    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalledWith(
        'Capacitación registrada — cumplimiento NOM-016',
      );
    });
  });

  it('después del éxito el modal se cierra y la lista se recarga', async () => {
    await renderAndWait();

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    // Modal se cierra.
    await waitFor(() => {
      expect(screen.queryByText(/nuevo registro de capacitación/i)).not.toBeInTheDocument();
    });

    // getCapacitaciones se llamó al menos 2 veces (mount + reload tras onSaved).
    await waitFor(() => {
      expect(mocks.mockGetCapacitaciones.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('el botón submit muestra "Registrando..." mientras saving=true', async () => {
    // Hacemos que crearCapacitacion tarde en resolver.
    mocks.mockCrearCapacitacion.mockReturnValue(new Promise(() => {}));

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
// 7. Submit con error — toast.error con detail del backend
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — submit con error', () => {
  async function openModalAndFillValid() {
    fireEvent.click(screen.getByRole('button', { name: /nuevo registro/i }));
    await waitFor(() => {
      expect(screen.getByText(/nuevo registro de capacitación/i)).toBeInTheDocument();
    });
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } });
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(screen.getByPlaceholderText(/uso seguro del ventilador/i), {
      target: { value: 'Tema X' },
    });
    fireEvent.change(screen.getByPlaceholderText(/lista o descripción del grupo/i), {
      target: { value: 'Personal X' },
    });
    await act(async () => { await Promise.resolve(); });
    return document.querySelector('form');
  }

  it('error 4xx del backend muestra toast.error con err.response.data.detail', async () => {
    await renderAndWait();

    // Simulamos 422 del backend con detail estructurado. Importante: el
    // mockResolvedValue por defecto del setupApi se SOBREESCRIBE aquí —
    // si lo pusiéramos antes de renderAndWait, setupApi lo resetearía.
    const err422 = {
      response: { data: { detail: 'Equipo no encontrado' } },
    };
    mocks.mockCrearCapacitacion.mockRejectedValue(err422);

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Equipo no encontrado');
    });
  });

  it('error de red puro muestra fallback "Error al registrar capacitación"', async () => {
    await renderAndWait();

    // Error sin response (e.g. timeout, CORS).
    const networkErr = new Error('Network Error');
    mocks.mockCrearCapacitacion.mockRejectedValue(networkErr);

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Error al registrar capacitación');
    });
  });

  it('después del error el modal sigue abierto (saving vuelve a false por .finally())', async () => {
    await renderAndWait();

    mocks.mockCrearCapacitacion.mockRejectedValue(new Error('boom'));

    const form = await openModalAndFillValid();
    fireEvent.submit(form);

    // El toast aparece.
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalled();
    });

    // El modal sigue abierto y el botón volvió a "Registrar Capacitación"
    // (no "Registrando..."), lo que prueba que saving=false tras error.
    const submitBtn = screen.getByRole('button', { name: /registrar capacitación/i });
    expect(submitBtn).not.toBeDisabled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Carga de la lista — error y tolerancia a shape
// ────────────────────────────────────────────────────────────────────────────
describe('Capacitaciones — carga inicial y tolerancia a shape', () => {
  it('error de carga muestra toast.error "Error al cargar capacitaciones"', async () => {
    mocks.mockGetCapacitaciones.mockRejectedValue(new Error('Network'));
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderC();
    await act(async () => { await Promise.resolve(); });

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Error al cargar capacitaciones');
    });
  });

  it('respuesta con {capacitaciones: []} muestra empty state', async () => {
    mocks.mockGetCapacitaciones.mockResolvedValue({ capacitaciones: [] });
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderC();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText(/no hay registros de capacitación aún/i)).toBeInTheDocument();
  });

  it('respuesta como array directo (sin wrap) se acepta via fallback', async () => {
    // Cubre `data.capacitaciones ?? data ?? []` — si el backend devuelve
    // un array crudo sin envolver, el operador todavía ve la lista.
    mocks.mockGetCapacitaciones.mockResolvedValue([CAP_BASIC]);
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderC();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByRole('heading', { name: /uso seguro del ventilador/i, level: 3 }))
      .toBeInTheDocument();
  });

  it('acepta respuesta `{}` (objeto vacío) sin crash → fallback a []', async () => {
    // Tras el fix del ciclo 34, pickList(data, 'capacitaciones') tolera `{}`.
    mocks.mockGetCapacitaciones.mockResolvedValue({});
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    renderC();
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText(/no hay registros de capacitación aún/i)).toBeInTheDocument();
  });

  it('getEquipos falla en el modal muestra toast.error "Error al cargar equipos"', async () => {
    mocks.mockGetEquipos.mockRejectedValue(new Error('Network'));
    mocks.mockGetCapacitaciones.mockResolvedValue({ capacitaciones: [] });

    renderC();
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole('button', { name: /\+ agregar primer registro/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar equipos');
    });
  });

  it('getEquipos devuelve array directo (sin {equipos}) via fallback', async () => {
    // Cubre `data.equipos ?? data ?? []` del modal.
    mocks.mockGetCapacitaciones.mockResolvedValue({ capacitaciones: [] });
    mocks.mockGetEquipos.mockResolvedValue([EQ_1, EQ_2]);

    renderC();
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole('button', { name: /\+ agregar primer registro/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    const select = screen.getByRole('combobox');
    expect(select).toHaveTextContent('Ventilador Mindray SV300');
    expect(select).toHaveTextContent('Monitor Philips MX450');
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // El catch del modal y el catch del cargar loggean a console.error en
  // errores esperados. Sin silenciarlo, stderr se inunda con "Network".
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});
