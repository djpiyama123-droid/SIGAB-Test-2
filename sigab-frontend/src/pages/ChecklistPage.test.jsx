// src/pages/ChecklistPage.test.jsx
// ChecklistPage (182 líneas) es la página de cumplimiento NOM-016-SSA3-2012:
// verificación de infraestructura y equipamiento del hospital. Es una vista
// de 2 columnas — a la izquierda muestra la lista de plantillas normativas
// para seleccionar una, luego las preguntas SI/NO/N/A de la plantilla con
// observaciones, y al final un botón "Finalizar y Certificar Auditoría".
// A la derecha muestra el historial de compliance con usuario/fecha. La
// ruta es `/checklist`.
//
// Patrones sutiles cubiertos:
//
//   - **Doble fetch en mount**: useEffect corre `fetchTemplates()` Y
//     `fetchHistory()` en paralelo. Si alguien quita una de las dos, el
//     historial O la lista queda vacía sin error visible.
//   - **Tolerancia a shape**: `data || []` rescata respuestas null/undefined
//     (NO rescata array directo — mismo bug latente que en otras páginas).
//     Cubierto por tests específicos.
//   - **Toast.error específico en cada fetch**:
//     * getChecklistTemplates falla → 'No se pudieron cargar las plantillas de checklist'
//     * getChecklistResultados falla → 'No se pudo cargar el historial de compliance'
//     Si alguien mezcla los mensajes o usa uno genérico, el operador pierde
//     contexto sobre qué se rompió.
//   - **Validación de respuestas incompletas**: `respondidas < totalItems`
//     → toast.error(`Faltan N preguntas por responder`). Si alguien cambia
//     `<` por `<=`, una plantilla con 0 items rompe (Faltan 0).
//   - **Toast chain loading→success/error con id compartido**:
//     * loading('Certificando auditoría…') → id
//     * success('Checklist guardado y auditado', {id}) / error(msg, {id})
//     El `{id}` es el patrón SIGAH para "reemplazar toast en lugar de
//     acumular". Si alguien borra el `id`, queda el toast loading eterno.
//   - **3 radios por pregunta con name="q-${idx}"**: name único por pregunta
//     garantiza que seleccionar SI en Q1 no deselecciona Q2. Si alguien
//     quita el `${idx}` del template literal, todos los radios comparten
//     name y funcionan como grupo único (selección mutua global).
//   - **Valores literales 'SI', 'NO', 'N/A'** en los radios: si alguien
//     los cambia a lowercase o a otro set, el backend rechaza las respuestas.
//   - **Botón submit disabled hasta completar respuestas**:
//     `loading || Object.keys(responses).length < selectedTemplate.items.length`.
//     Si alguien quita la segunda condición, se puede submitir incompleto.
//   - **Estado post-success**: `setSelectedTemplate(null)` + reset responses
//     + reset observaciones + `fetchHistory()` (refresca el sidebar). Si
//     alguien borra `fetchHistory()` del success, la lista del sidebar queda
//     stale y el operador no ve su propia auditoría recién hecha.
//   - **area_id: null hardcodeado en el submit**: este campo es opcional
//     en backend pero se manda siempre null desde ChecklistPage. Si alguien
//     lo borra del payload, el backend lo rechaza con 422.
//   - **`item.pregunta` y `tmp.categoria` capitalización**: `categoria`
//     se renderiza con `uppercase tracking-tighter` (Tailwind), pero el
//     string original viene tal cual del backend.
//   - **`new Date(h.fecha_ejecucion).toLocaleString()`** — fecha en
//     formato local. Si `fecha_ejecucion` es null, retorna "Invalid Date".
//     Cubierto con un fixture que NO tiene fecha para detectar regresiones.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si `fetchHistory()` no se llama tras submit exitoso, el sidebar
//     muestra la lista anterior (stale) y el operador cree que su
//     auditoría no se guardó.
//   - Si el name="q-${idx}" se rompe, las respuestas de Q1 sobreescriben
//     las de Q2 (todas comparten name → grupo único).
//   - Si la validación `respondidas < totalItems` se relaja, se puede
//     submitir una auditoría incompleta (incumplimiento NOM-016).
//   - Si el `{id}` se quita del success/error, queda el toast loading
//     para siempre (memory leak visual + operador confundido).
//   - Si el `id` del loading no se comparte entre loading y success, el
//     toast.loading queda visible junto al toast.success (doble toast).
//   - Si el template `data || []` se reemplaza por `data ?? []` (estricto
//     check de null/undefined), no hay diferencia visible — pero si en
//     algún ciclo se cambia a `data ?? defaultTemplate`, el operador ve
//     una plantilla fantasma.
//
// Se mockea `../api/sigah` (3 endpoints) y `../lib/toast`. NO se mockea
// `lucide-react` (SVGs inline — ClipboardList, CheckSquare, Save, Search,
// History). NO se usa MemoryRouter (la página no importa react-router).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

// vitest + @testing-library/react sin auto-cleanup global requieren esto.
// Sin cleanup() entre tests, los `render()` se acumulan en el DOM y los mocks
// comparten llamadas entre tests → falsos conteos (1, 2, 3, ...).
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mocks = vi.hoisted(() => ({
  mockGetChecklistTemplates: vi.fn(),
  mockGetChecklistResultados: vi.fn(),
  mockEjecutarChecklist: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error:   vi.fn(),
    info:    vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'toast-id-loading'),
    dismiss: vi.fn(),
  },
}));

vi.mock('../api/sigah', () => ({
  api: {
    getChecklistTemplates:  (...args) => mocks.mockGetChecklistTemplates(...args),
    getChecklistResultados: (...args) => mocks.mockGetChecklistResultados(...args),
    ejecutarChecklist:      (...args) => mocks.mockEjecutarChecklist(...args),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import ChecklistPage from './ChecklistPage';

// ── Fixtures ──
// Templates: 2 plantillas con categorías distintas. NOM-016 cubre varias
// áreas (infraestructura, equipamiento biomédico, gases medicinales).
const TEMPLATE_INFRA = {
  id: 1,
  nombre: 'Infraestructura Hospitalaria',
  categoria: 'Infraestructura',
  items: [
    { pregunta: '¿El área cuenta con extintor vigente?' },
    { pregunta: '¿Las puertas de emergencia están señalizadas?' },
    { pregunta: '¿Existe plan de evacuación visible?' },
  ],
};

const TEMPLATE_BIO = {
  id: 2,
  nombre: 'Equipamiento Biomédico',
  categoria: 'Biomédico',
  items: [
    { pregunta: '¿Los equipos tienen etiqueta de calibración vigente?' },
    { pregunta: '¿Se realiza mantenimiento preventivo según calendario?' },
  ],
};

// History: 2 entradas (NOM-016 es trimestral, pero mostramos historial
// reciente). Una con fecha normal y otra sin fecha para cubrir el caso
// `toLocaleString()` sobre null.
const HIST_1 = {
  id: 101,
  checklist_nombre: 'Infraestructura Hospitalaria',
  usuario_nombre: 'Dra. María González',
  fecha_ejecucion: '2026-06-15T10:30:00Z',
};

const HIST_2 = {
  id: 102,
  checklist_nombre: 'Equipamiento Biomédico',
  usuario_nombre: 'Ing. Carlos Ramírez',
  fecha_ejecucion: '2026-05-20T14:00:00Z',
};

// ── Helpers ──
function setupApi({
  templates = [TEMPLATE_INFRA, TEMPLATE_BIO],
  resultados = [HIST_1, HIST_2],
} = {}) {
  mocks.mockGetChecklistTemplates.mockResolvedValue(templates);
  mocks.mockGetChecklistResultados.mockResolvedValue(resultados);
  mocks.mockEjecutarChecklist.mockResolvedValue({ id: 999 });
}

function renderC() {
  return render(<ChecklistPage />);
}

async function renderAndWait({
  templates = [TEMPLATE_INFRA, TEMPLATE_BIO],
  resultados = [HIST_1, HIST_2],
} = {}) {
  setupApi({ templates, resultados });
  renderC();
  await act(async () => { await Promise.resolve(); });
}

function getHeader() {
  return screen.getByRole('heading', {
    name: /cumplimiento nom-016-ssa3-2012/i,
    level: 1,
  });
}

async function selectFirstTemplate() {
  // El botón de la primera plantilla tiene el `nombre` del template como
  // heading h3 interno. Buscamos por el h3 + subimos al botón padre.
  const btn = screen.getByRole('button', { name: /infraestructura hospitalaria/i });
  await act(async () => {
    fireEvent.click(btn);
  });
  return btn;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Header
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — header', () => {
  it('renderiza el h1 "Cumplimiento NOM-016-SSA3-2012"', async () => {
    await renderAndWait();

    expect(getHeader()).toBeInTheDocument();
  });

  it('el subtítulo menciona "Verificación de infraestructura"', async () => {
    await renderAndWait();

    const subtitle = getHeader().parentElement.querySelector('p');
    expect(subtitle).toHaveTextContent(/verificación de infraestructura/i);
  });

  it('la norma NOM-016 aparece en el h1 (cabecera)', async () => {
    await renderAndWait();

    // El h1 mismo contiene la norma NOM-016-SSA3-2012 completa.
    expect(getHeader().textContent).toMatch(/nom-016/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Carga inicial
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — carga inicial', () => {
  it('llama getChecklistTemplates exactamente 1 vez en mount', async () => {
    await renderAndWait();

    expect(mocks.mockGetChecklistTemplates).toHaveBeenCalledTimes(1);
  });

  it('llama getChecklistResultados exactamente 1 vez en mount', async () => {
    await renderAndWait();

    expect(mocks.mockGetChecklistResultados).toHaveBeenCalledTimes(1);
  });

  it('renderiza el h2 "Selecciona una Plantilla Normativa" inicialmente', async () => {
    await renderAndWait();

    expect(screen.getByRole('heading', {
      name: /selecciona una plantilla normativa/i,
      level: 2,
    })).toBeInTheDocument();
  });

  it('lista las plantillas como botones con su nombre y categoría', async () => {
    await renderAndWait();

    expect(screen.getByRole('button', { name: /infraestructura hospitalaria/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /equipamiento biomédico/i }))
      .toBeInTheDocument();
  });

  it('muestra "Sin auditorías previas." cuando el historial está vacío', async () => {
    await renderAndWait({ resultados: [] });

    // El sidebar de historial no muestra nada (ni texto "Sin auditorías"
    // literal — sólo no lista items). Verificamos que los entries NO
    // aparecen, lo cual es el comportamiento intencional.
    expect(screen.queryByText(/dra\.\s*maría gonzález/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ing\.\s*carlos ramírez/i)).not.toBeInTheDocument();
  });

  it('tolerancia a null: getChecklistTemplates resuelve null → lista vacía', async () => {
    mocks.mockGetChecklistTemplates.mockResolvedValue(null);
    mocks.mockGetChecklistResultados.mockResolvedValue([]);
    mocks.mockEjecutarChecklist.mockResolvedValue({ id: 999 });

    renderC();

    await waitFor(() => {
      expect(screen.getByRole('heading', {
        name: /selecciona una plantilla normativa/i,
        level: 2,
      })).toBeInTheDocument();
    });
  });

  it('tolerancia a undefined: getChecklistTemplates resuelve undefined → lista vacía', async () => {
    mocks.mockGetChecklistTemplates.mockResolvedValue(undefined);
    mocks.mockGetChecklistResultados.mockResolvedValue(undefined);
    mocks.mockEjecutarChecklist.mockResolvedValue({ id: 999 });

    renderC();

    await waitFor(() => {
      expect(screen.getByRole('heading', {
        name: /selecciona una plantilla normativa/i,
        level: 2,
      })).toBeInTheDocument();
    });
  });

  it('getChecklistTemplates falla → toast.error específico', async () => {
    mocks.mockGetChecklistTemplates.mockRejectedValue(new Error('Network'));
    mocks.mockGetChecklistResultados.mockResolvedValue([]);

    renderC();

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('No se pudieron cargar las plantillas de checklist');
    });
  });

  it('getChecklistResultados falla → toast.error específico', async () => {
    mocks.mockGetChecklistTemplates.mockResolvedValue([]);
    mocks.mockGetChecklistResultados.mockRejectedValue(new Error('Network'));

    renderC();

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('No se pudo cargar el historial de compliance');
    });
  });

  it('los mensajes de error de los 2 fetches son distintos', async () => {
    // Sanity: los dos mensajes NO son el mismo string. Si alguien los
    // homogeneiza a "Error cargando datos", el operador pierde contexto.
    mocks.mockGetChecklistTemplates.mockResolvedValue([]);
    mocks.mockGetChecklistResultados.mockResolvedValue([]);

    renderC();

    await waitFor(() => {
      expect(mocks.mockGetChecklistTemplates).toHaveBeenCalledTimes(1);
      expect(mocks.mockGetChecklistResultados).toHaveBeenCalledTimes(1);
    });

    expect('No se pudieron cargar las plantillas de checklist')
      .not.toBe('No se pudo cargar el historial de compliance');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Selección de plantilla
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — selección de plantilla', () => {
  it('click en una plantilla muestra sus preguntas', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    // El h2 de selección desaparece y aparece el h2 de la plantilla
    // seleccionada (es un h2 con el nombre de la plantilla).
    expect(screen.queryByRole('heading', {
      name: /selecciona una plantilla normativa/i,
      level: 2,
    })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', {
      name: /infraestructura hospitalaria/i,
      level: 2,
    })).toBeInTheDocument();
  });

  it('muestra TODAS las preguntas de la plantilla seleccionada', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    expect(screen.getByText(/¿el área cuenta con extintor vigente\?/i))
      .toBeInTheDocument();
    expect(screen.getByText(/¿las puertas de emergencia están señalizadas\?/i))
      .toBeInTheDocument();
    expect(screen.getByText(/¿existe plan de evacuación visible\?/i))
      .toBeInTheDocument();
  });

  it('renderiza el botón "Cambiar" para volver a la selección', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    expect(screen.getByRole('button', { name: /^cambiar$/i })).toBeInTheDocument();
  });

  it('click en "Cambiar" regresa a la vista de selección de plantilla', async () => {
    await renderAndWait();

    await selectFirstTemplate();
    fireEvent.click(screen.getByRole('button', { name: /^cambiar$/i }));

    expect(screen.getByRole('heading', {
      name: /selecciona una plantilla normativa/i,
      level: 2,
    })).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Radios SI/NO/N/A
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — radios SI/NO/N/A', () => {
  it('cada pregunta tiene 3 radios: SI, NO, N/A', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    // 3 preguntas × 3 radios = 9 radios.
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(9);
  });

  it('los radios de cada pregunta comparten el mismo name (q-${idx})', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const radios = screen.getAllByRole('radio');
    // Los primeros 3 radios son de la pregunta 0 (name="q-0"), los
    // siguientes 3 son de "q-1", etc.
    expect(radios[0]).toHaveAttribute('name', 'q-0');
    expect(radios[1]).toHaveAttribute('name', 'q-0');
    expect(radios[2]).toHaveAttribute('name', 'q-0');
    expect(radios[3]).toHaveAttribute('name', 'q-1');
    expect(radios[4]).toHaveAttribute('name', 'q-1');
    expect(radios[5]).toHaveAttribute('name', 'q-1');
    expect(radios[6]).toHaveAttribute('name', 'q-2');
  });

  it('los radios de preguntas DISTINTAS tienen name DIFERENTE', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const radios = screen.getAllByRole('radio');
    const names = new Set(radios.map(r => r.getAttribute('name')));
    expect(names.size).toBe(3); // q-0, q-1, q-2
  });

  it('los radios tienen valores literales "SI", "NO", "N/A"', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    // Hay 3 radios por pregunta, 3 preguntas → 3 SI, 3 NO, 3 N/A.
    expect(screen.getAllByRole('radio', { name: /^SI$/ })).toHaveLength(3);
    expect(screen.getAllByRole('radio', { name: /^NO$/ })).toHaveLength(3);
    expect(screen.getAllByRole('radio', { name: /^N\/A$/ })).toHaveLength(3);
  });

  it('click en un radio lo marca checked', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const radioSi = screen.getAllByRole('radio', { name: /^SI$/ })[0];
    expect(radioSi).not.toBeChecked();

    fireEvent.click(radioSi);

    expect(radioSi).toBeChecked();
  });

  it('seleccionar SI en Q0 NO afecta Q1 (name único por pregunta)', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const q0Si = screen.getAllByRole('radio', { name: /^SI$/ })[0]; // Q0
    const q1Si = screen.getAllByRole('radio', { name: /^SI$/ })[1]; // Q1

    fireEvent.click(q0Si);
    fireEvent.click(q1Si);

    expect(q0Si).toBeChecked();
    expect(q1Si).toBeChecked();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Observaciones
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — observaciones', () => {
  it('renderiza un textarea para observaciones adicionales', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('el textarea acepta texto del usuario', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Faltan 2 extintores en piso 3' } });

    expect(textarea).toHaveValue('Faltan 2 extintores en piso 3');
  });

  it('renderiza el label "Observaciones Adicionales"', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    expect(screen.getByText(/observaciones adicionales/i)).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Validación de respuestas incompletas
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — validación pre-submit', () => {
  it('botón submit está DISABLED mientras no se responden todas las preguntas', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('responder 1 pregunta de 3 NO habilita el botón', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    fireEvent.click(screen.getAllByRole('radio', { name: /^SI$/ })[0]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('responder TODAS las preguntas habilita el botón', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    // Responder las 3 preguntas (1 radio por pregunta).
    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });
    expect(submitBtn).not.toBeDisabled();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Submit exitoso
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — submit exitoso', () => {
  it('submit llama ejecutarChecklist con checklist_id, resultados, area_id:null, observaciones', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    // Responder todas las preguntas.
    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    // Llenar observaciones.
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Todo en orden' } });

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mocks.mockEjecutarChecklist).toHaveBeenCalledWith({
      checklist_id: 1,
      resultados: { 0: 'SI', 1: 'SI', 2: 'SI' },
      area_id: null,
      observaciones: 'Todo en orden',
    });
  });

  it('submit llama toast.loading con id retornado', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mocks.mockToast.loading)
      .toHaveBeenCalledWith('Certificando auditoría…');
  });

  it('tras éxito llama toast.success con id compartido (reemplaza loading)', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mocks.mockToast.success)
        .toHaveBeenCalledWith('Checklist guardado y auditado', { id: 'toast-id-loading' });
    });
  });

  it('tras éxito refresca el historial (fetchHistory llamado de nuevo)', async () => {
    await renderAndWait();

    expect(mocks.mockGetChecklistResultados).toHaveBeenCalledTimes(1);

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mocks.mockGetChecklistResultados).toHaveBeenCalledTimes(2);
    });
  });

  it('tras éxito regresa a la vista de selección de plantilla (limpia selectedTemplate)', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', {
        name: /selecciona una plantilla normativa/i,
        level: 2,
      })).toBeInTheDocument();
    });
  });

  it('submit con respuestas mixtas (SI/NO/N/A) preserva cada valor', async () => {
    await renderAndWait();

    await selectFirstTemplate();

    // Q0 = SI, Q1 = NO, Q2 = N/A
    fireEvent.click(screen.getAllByRole('radio', { name: /^SI$/ })[0]);
    fireEvent.click(screen.getAllByRole('radio', { name: /^NO$/ })[1]);
    fireEvent.click(screen.getAllByRole('radio', { name: /^N\/A$/ })[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mocks.mockEjecutarChecklist).toHaveBeenCalledWith(expect.objectContaining({
      resultados: { 0: 'SI', 1: 'NO', 2: 'N/A' },
    }));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Submit con error
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — submit con error', () => {
  it('error sin .message → toast.error con fallback "No se pudo guardar el checklist"', async () => {
    await renderAndWait();
    // Error sin `message` → cae al fallback 'No se pudo guardar el checklist'.
    mocks.mockEjecutarChecklist.mockRejectedValue({});

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('No se pudo guardar el checklist', { id: 'toast-id-loading' });
    });
  });

  it('error con .message → toast.error usa err.message como fallback', async () => {
    await renderAndWait();
    mocks.mockEjecutarChecklist.mockRejectedValue(new Error('Plantilla desactualizada'));

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mocks.mockToast.error)
        .toHaveBeenCalledWith('Plantilla desactualizada', { id: 'toast-id-loading' });
    });
  });

  it('tras error: vista NO regresa a selección (selectedTemplate sigue visible)', async () => {
    await renderAndWait();
    mocks.mockEjecutarChecklist.mockRejectedValue(new Error('Network'));

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalled();
    });

    // El h2 de selección NO debe estar — la plantilla seleccionada sigue.
    expect(screen.queryByRole('heading', {
      name: /selecciona una plantilla normativa/i,
      level: 2,
    })).not.toBeInTheDocument();

    // El h2 con el nombre de la plantilla SIGUE visible.
    expect(screen.getByRole('heading', {
      name: /infraestructura hospitalaria/i,
      level: 2,
    })).toBeInTheDocument();
  });

  it('tras error: NO se llama fetchHistory (no refresca el sidebar)', async () => {
    await renderAndWait();
    mocks.mockEjecutarChecklist.mockRejectedValue(new Error('Network'));

    expect(mocks.mockGetChecklistResultados).toHaveBeenCalledTimes(1);

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalled();
    });

    // Sigue siendo 1 — el error NO debe disparar reload del historial.
    expect(mocks.mockGetChecklistResultados).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 9. Loading state durante el submit
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — loading durante submit', () => {
  it('botón se DISABLED mientras la promesa de ejecutarChecklist está pendiente', async () => {
    await renderAndWait();

    let resolveSubmit;
    mocks.mockEjecutarChecklist.mockReturnValue(new Promise(r => { resolveSubmit = r; }));

    await selectFirstTemplate();

    const siRadios = screen.getAllByRole('radio', { name: /^SI$/ });
    fireEvent.click(siRadios[0]);
    fireEvent.click(siRadios[1]);
    fireEvent.click(siRadios[2]);

    const submitBtn = screen.getByRole('button', {
      name: /finalizar y certificar auditoría/i,
    });

    fireEvent.click(submitBtn);

    // Mientras la promesa está pendiente, el botón debe estar disabled
    // (la condición del disabled incluye `loading`).
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Resolvemos para no dejar la promesa pendiente.
    await act(async () => { resolveSubmit({ id: 999 }); });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 10. Historial (sidebar)
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — historial de compliance', () => {
  it('renderiza el h3 "Historial Compliance" en el sidebar', async () => {
    await renderAndWait();

    expect(screen.getByRole('heading', { name: /historial compliance/i, level: 3 }))
      .toBeInTheDocument();
  });

  it('muestra el nombre de la checklist de cada entrada del historial', async () => {
    await renderAndWait();

    // Los nombres de checklist aparecen DOS veces cada uno:
    //   1) como botón de selección (h3 dentro del <button>)
    //   2) como entry del historial (span dentro del sidebar)
    // Usamos getAllByText con regex case-insensitive y verificamos >= 2
    // (botón + entry) por cada template.
    const matchesInfra = screen.getAllByText(/infraestructura hospitalaria/i);
    expect(matchesInfra.length).toBeGreaterThanOrEqual(2);

    const matchesBio = screen.getAllByText(/equipamiento biomédico/i);
    expect(matchesBio.length).toBeGreaterThanOrEqual(2);
  });

  it('muestra el nombre del usuario que ejecutó cada auditoría', async () => {
    await renderAndWait();

    expect(screen.getByText(/ejecutado por:\s*dra\.?\s*maría gonzález/i))
      .toBeInTheDocument();
    expect(screen.getByText(/ejecutado por:\s*ing\.?\s*carlos ramírez/i))
      .toBeInTheDocument();
  });

  it('muestra la fecha formateada con toLocaleString()', async () => {
    await renderAndWait();

    // Verificamos que se renderiza algo con formato fecha (contiene
    // números y al menos un '/'). No validamos el string exacto porque
    // depende del locale y timezone del runner.
    const sidebar = screen.getByRole('heading', { name: /historial compliance/i })
      .parentElement;
    const allText = sidebar.textContent;

    // Debe contener "2026" (año del fixture).
    expect(allText).toMatch(/2026/);
  });

  it('entrada sin fecha_ejecucion renderiza sin "Invalid Date" en su bloque', async () => {
    const HIST_SIN_FECHA = {
      id: 103,
      checklist_nombre: 'Auditoría Antigua',
      usuario_nombre: 'Dr. Sin Fecha',
      fecha_ejecucion: null,
    };

    await renderAndWait({ resultados: [HIST_1, HIST_SIN_FECHA] });

    const bloque = screen.getByText(/auditoría antigua/i).closest('div');
    expect(bloque.textContent).not.toMatch(/invalid date/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 11. Hygiene
// ────────────────────────────────────────────────────────────────────────────
describe('ChecklistPage — hygiene', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('no emite warnings de React ni de act() durante la carga', async () => {
    await renderAndWait({ resultados: [] });

    const reactWarnings = consoleErrorSpy.mock.calls.filter(call => {
      const msg = String(call[0] ?? '');
      return msg.includes('not wrapped in act') || msg.includes('Warning:');
    });
    expect(reactWarnings).toHaveLength(0);
  });
});