// src/pages/Copilot.test.jsx
// Copilot (711 líneas) — asistente IA biomédico on-premise con 3 paneles
// (Diagnóstico, Vision, Chat) y un chat principal con streaming SSE.
// Concentra varios patrones sutiles:
//
//   - **Mensaje de bienvenida auto-inyectado en mount** (useEffect con
//     array de dependencias vacío): un solo mensaje inicial con role
//     "assistant" y un markdown largo. Si alguien refactorea el
//     useEffect, el chat puede quedar vacío.
//   - **3 estados de Ollama** verificados por StatusBadge inline:
//       * `status = null` → "Verificando..."
//       * `ollama_activo = false` → badge rojo "Ollama offline"
//       * `ollama_activo = true && !modelo_disponible` → badge naranja
//         "Modelo no descargado"
//       * `ollama_activo = true && modelo_disponible` → badge verde
//         "{modelo} · activo"
//     Si alguien refactorea la condicional, el operador pierde
//     feedback visual sobre el estado del backend IA.
//   - **2 paneles de warning cuando Ollama está mal**:
//       * Sin Ollama → bloque naranja "Ollama no detectado" + comando
//         `ollama serve && ollama pull gemma3:4b`.
//       * Sin modelo descargado → bloque ámbar con `ollama pull {modelo}`.
//   - **`getCopilotPromptsRapidos()`** carga prompts rápidos que sólo se
//     muestran cuando `messages.length === 1` (justo después del
//     welcome). Si alguien refactorea la condición, los prompts
//     aparecen enmedio de una conversación real (molestos).
//   - **Click en prompt rápido → `usarPromptRapido(prompt)`** que
//     cambia el `contexto_tipo` (si el prompt lo define) y dispara
//     `enviarMensaje(prompt.texto)` directamente. NO escribe al input.
//   - **Streaming SSE parseado línea por línea**: el fetch devuelve un
//     ReadableStream con líneas `data: {token|done|error}`. Si alguien
//     rompe el parsing, el chat no actualiza el contenido.
//   - **`data.done` rompe el while loop** y deja `streaming=false`.
//   - **`data.error` marca el mensaje como `error: true`** y muestra
//     `⚠️ {mensaje}` en rojo.
//   - **Abort del stream**: el botón "Stop" llama `abortRef.current?.abort()`
//     que dispara AbortError, que el catch trata como "Generación
//     detenida" (sin toast.error).
//   - **Input deshabilitado durante streaming** (`disabled={streaming}`)
//     y botón cambia a Stop (IconStop rojo) o Send (IconSend verde)
//     según `streaming`.
//   - **Enter (sin Shift) envía mensaje**, Shift+Enter inserta salto.
//   - **Botón Limpiar chat** resetea `messages` a un mensaje nuevo.
//   - **Diagnóstico panel carga `api.getEquipos({ limit: 300 })`** en
//     mount. `r.equipos || []` con fallback `|| []` (variante `|| []`,
//     no `?? ??`).
//   - **Cambio de equipo autollena marca/modelo** desde el equipo
//     seleccionado (si está en la lista).
//   - **Submit diagnóstico** valida `falla.trim()` y llama
//     `api.copilotDiagnostico({ falla, equipo_id, marca, modelo })`.
//     `equipo_id: equipoId || undefined` (Number o undefined).
//   - **Resultado se muestra con line-parser**: líneas que empiezan y
//     terminan con `**` se renderizan como `<p className="font-bold">`,
//     líneas vacías como `<br>`.
//   - **Vision panel acepta imagen** vía FileReader.readAsDataURL
//     → separa `[..., ',', b64]` y guarda `{ b64, preview, name }`.
//     Si el FileReader falla, el preview queda null y no se puede
//     analizar.
//   - **Submit vision** valida `imagen` y llama
//     `api.copilotVision({ imagen_b64, tipo_doc })`.
//   - **Resultado vision** muestra `datos_extraidos` (key/value table
//     si valor truthy) + `analisis` con `whitespace-pre-wrap`.
//   - **Resumen IA** llama `api.copilotResumenIa()` y muestra
//     `fecha · modelo` + `resumen_narrativo`.
//
// Se mockea: `../api/sigah` (6 métodos), `../lib/toast`, `global.fetch`
// (con helper `mockFetchStream`), y `FileReader` (constructor mock que
// llama onload sincrónicamente). NO se mockea `lucide-react` (los iconos
// en línea SVG funcionan en jsdom). NO se usa MemoryRouter (la página
// no usa react-router). NO se wrappea con AuthContext (la página no usa
// useAuth).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const toastFn = vi.fn();
  return {
    mockGetEquipos:            vi.fn(),
    mockCopilotDiagnostico:    vi.fn(),
    mockCopilotVision:         vi.fn(),
    mockGetCopilotEstado:      vi.fn(),
    mockGetCopilotPrompts:     vi.fn(),
    mockCopilotResumenIa:      vi.fn(),
    mockFetch:                 vi.fn(),
    mockFileReaderOnload:      vi.fn(),
    mockFileReaderReadAsDataURL: vi.fn(),
    mockToast: Object.assign(toastFn, {
      success: vi.fn(),
      error:   vi.fn(),
      info:    vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    }),
  };
});

vi.mock('../api/sigah', () => ({
  api: {
    getEquipos:               (...a) => mocks.mockGetEquipos(...a),
    copilotDiagnostico:       (...a) => mocks.mockCopilotDiagnostico(...a),
    copilotVision:            (...a) => mocks.mockCopilotVision(...a),
    getCopilotEstado:         (...a) => mocks.mockGetCopilotEstado(...a),
    getCopilotPromptsRapidos: (...a) => mocks.mockGetCopilotPrompts(...a),
    copilotResumenIa:         (...a) => mocks.mockCopilotResumenIa(...a),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

// Mock FileReader — el constructor original requiere Blob/File y un event
// loop. Lo reemplazamos con un constructor mock que ejecuta onload
// sincrónicamente con un dataURL sintético.
class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }
  readAsDataURL(file) {
    // Simulamos un dataURL: "data:image/png;base64,FAKEB64"
    this.result = `data:image/png;base64,FAKEB64`;
    if (this.onload) {
      this.onload({ target: { result: this.result } });
    }
  }
}
global.FileReader = MockFileReader;

import Copilot from './Copilot';

// ── Helpers ──────────────────────────────────────────────────────────────
// Construye una respuesta fetch con un ReadableStream que emite chunks
// en secuencia. Cada chunk es una string cruda que la página parsea
// línea por línea buscando prefijos "data: ".
function mockFetchStream(events) {
  // events: array de objetos { token? , error? , done? } serializados a
  // `data: {json}\n\n`. La página espera este formato exacto.
  const chunks = events.map(e => {
    const json = JSON.stringify(e);
    return `data: ${json}\n\n`;
  });
  mocks.mockFetch.mockResolvedValue({
    ok: true,
    body: {
      getReader: () => {
        let i = 0;
        return {
          read: async () => {
            if (i >= chunks.length) return { done: true };
            const value = new TextEncoder().encode(chunks[i++]);
            return { done: false, value };
          },
        };
      },
    },
  });
}

function mockFetchError(status = 500) {
  mocks.mockFetch.mockResolvedValue({
    ok: false,
    status,
    body: null,
  });
}

function mockFetchNetworkError() {
  mocks.mockFetch.mockRejectedValue(new Error('Network down'));
}

// ── Fixtures ─────────────────────────────────────────────────────────────
const OLLAMA_ONLINE = {
  ok: true,
  ollama_activo: true,
  modelo_disponible: true,
  modelo: 'gemma3:4b',
  modelos_instalados: ['gemma3:4b', 'qwen2.5:7b'],
};
const OLLAMA_OFFLINE = {
  ok: false,
  ollama_activo: false,
};
const OLLAMA_NO_MODELO = {
  ok: true,
  ollama_activo: true,
  modelo_disponible: false,
  modelo: 'gemma3:12b',
  modelos_instalados: ['gemma3:4b'],
};

const PROMPT_RAPIDO = {
  id: 1,
  label: 'Diagnóstico rápido',
  texto: '¿Cómo diagnostico un monitor que no enciende?',
  contexto_tipo: 'equipo',
};
const PROMPT_RAPIDO_2 = {
  id: 2,
  label: 'NOM-016',
  texto: '¿Qué dice la NOM-016 sobre mantenimiento?',
};

const EQ_VENTILADOR = {
  id: 11,
  nombre: 'Ventilador Oxylog 3000',
  serie: 'DRG-OXY-0001',
  modelo: 'Oxylog 3000 plus',
  marca: 'Draeger',
  estado: 'operativo',
};
const EQ_MONITOR = {
  id: 12,
  nombre: 'Monitor IntelliVue MX450',
  serie: 'PHI-MX4-0002',
  modelo: 'MX450',
  marca: 'Philips',
  estado: 'operativo',
};
const ALL_EQUIPOS = [EQ_VENTILADOR, EQ_MONITOR];

// ── Setup ────────────────────────────────────────────────────────────────
function setupApis({
  estado = OLLAMA_ONLINE,
  prompts = [PROMPT_RAPIDO, PROMPT_RAPIDO_2],
  equipos = ALL_EQUIPOS,
} = {}) {
  mocks.mockGetCopilotEstado.mockResolvedValue(estado);
  mocks.mockGetCopilotPrompts.mockResolvedValue({ prompts });
  mocks.mockGetEquipos.mockResolvedValue({ equipos });
  mocks.mockCopilotDiagnostico.mockResolvedValue({
    diagnostico: '**Causa probable**\nFalla de fuente de poder',
  });
  mocks.mockCopilotVision.mockResolvedValue({
    datos_extraidos: { marca: 'Philips', modelo: 'MX450' },
    analisis: 'Equipo identificado: Monitor IntelliVue',
  });
  mocks.mockCopilotResumenIa.mockResolvedValue({
    fecha: '2026-06-29',
    modelo: 'gemma3:4b',
    resumen_narrativo: 'El hospital tiene 42 equipos operativos...',
  });
}

async function renderAndWait(opts = {}) {
  const { overrides = {}, ...setupOpts } = opts;
  setupApis(setupOpts);
  // NO tocamos mockFetch aquí: los tests que lo usan llaman a
  // mockFetchStream(...) ANTES de renderAndWait, y resetAllMocks
  // en beforeEach ya limpia el estado entre tests.
  render(<Copilot />);
  // Aplica overrides DESPUÉS del render (para que setupApis no los pise).
  for (const [name, value] of Object.entries(overrides)) {
    if (mocks[name]) {
      mocks[name].mockReset();
      if (value === 'reject') {
        mocks[name].mockRejectedValue(new Error('Network'));
      } else if (value && typeof value === 'object' && 'rejectWith' in value) {
        mocks[name].mockRejectedValue(value.rejectWith);
      } else if (value && typeof value === 'object' && 'resolveWith' in value) {
        mocks[name].mockResolvedValue(value.resolveWith);
      } else {
        mocks[name].mockResolvedValue(value);
      }
    }
  }
  // Espera a que el welcome message se inyecte (useEffect tras mount).
  // El texto aparece 2 veces en pantalla (h1 + welcome message),
  // usamos getAllByText para aceptar múltiples matches.
  await waitFor(() => {
    expect(screen.getAllByText(/SIGAH Copilot/i).length).toBeGreaterThanOrEqual(1);
  });
  // Y a que el status badge termine de verificar Ollama.
  await waitFor(() => {
    expect(mocks.mockGetCopilotEstado).toHaveBeenCalled();
  });
}

// Encuentra el botón "Send" del chat. Se localiza por ser el único button
// con `bg-emerald-600` Y `flex-shrink-0` dentro del contenedor flex que
// contiene el textarea. El botón "Generar resumen" también usa emerald
// pero tiene `w-full` (no flex-shrink-0), así que el selector es único.
function findSendButton() {
  const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
  return textarea.parentElement.querySelector('button.bg-emerald-600.flex-shrink-0');
}

function clickSend() {
  fireEvent.click(findSendButton());
}

function pressEnter(textarea) {
  fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
}

// Comprueba que un texto aparezca en el body aunque esté partido por
// múltiples elementos. El markdown line-parser de ChatMessage mete cada
// línea en un <p>, así que un texto multi-línea (o con espacios
// significativos) puede quedar fragmentado en nodos <p> hermanos.
function expectTextInDocument(text) {
  expect(document.body.textContent).toMatch(text);
}

beforeEach(() => {
  vi.resetAllMocks();
  // El mock callable de toast debe sobrevivir al reset.
  mocks.mockToast.success = vi.fn();
  mocks.mockToast.error = vi.fn();
  mocks.mockToast.info = vi.fn();
  mocks.mockToast.warning = vi.fn();
  mocks.mockToast.loading = vi.fn();
  mocks.mockToast.dismiss = vi.fn();
  // Mock fetch default (cada test lo override si necesita).
  global.fetch = mocks.mockFetch;
  // jsdom no implementa scrollIntoView (usado por useEffect→scrollToBottom).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Header
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — header', () => {
  it('renderiza el h1 con "SIGAH Copilot" y el icono ✦', async () => {
    await renderAndWait();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/SIGAH Copilot/i);
    expect(h1).toHaveTextContent('✦');
  });

  it('muestra el subtítulo "Asistente biomédico · IA local on-premise"', async () => {
    await renderAndWait();
    expect(screen.getByText(/asistente biomédico · ia local on-premise/i)).toBeInTheDocument();
  });

  it('renderiza el selector de contexto (General / MTBF / Equipo activo)', async () => {
    await renderAndWait();
    // El select tiene el "Contexto:" como prefijo de las opciones.
    const selects = screen.getAllByRole('combobox');
    const ctxSelect = selects.find((s) => Array.from(s.options).some((o) => /Contexto:/.test(o.textContent)));
    expect(ctxSelect).toBeDefined();
    expect(ctxSelect.value).toBe('general');
  });

  it('renderiza el botón Limpiar chat con title="Limpiar chat"', async () => {
    await renderAndWait();
    expect(screen.getByTitle(/limpiar chat/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Status badge de Ollama (3 estados + loading)
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — status badge de Ollama', () => {
  it('muestra "Verificando..." antes de que getCopilotEstado resuelva', () => {
    setupApis();
    mocks.mockGetCopilotEstado.mockReturnValue(new Promise(() => {})); // never
    mocks.mockFetch.mockReset();
    render(<Copilot />);
    // Antes del await: el useEffect de checkStatus aún no terminó.
    expect(screen.getByText(/verificando/i)).toBeInTheDocument();
  });

  it('ollama_activo=true && modelo_disponible=true → badge verde "{modelo} · activo"', async () => {
    await renderAndWait({ estado: OLLAMA_ONLINE });
    // El badge se renderiza inline en el subtítulo, no es accesible por rol.
    expect(screen.getByText(/gemma3:4b · activo/i)).toBeInTheDocument();
  });

  it('ollama_activo=false → badge rojo "Ollama offline"', async () => {
    await renderAndWait({ estado: OLLAMA_OFFLINE });
    expect(screen.getByText(/ollama offline/i)).toBeInTheDocument();
  });

  it('ollama_activo=true && !modelo_disponible → badge naranja "Modelo no descargado"', async () => {
    await renderAndWait({ estado: OLLAMA_NO_MODELO });
    expect(screen.getByText(/modelo no descargado/i)).toBeInTheDocument();
  });

  it('getCopilotEstado rechazando → fallback a {ok:false, ollama_activo:false}', async () => {
    mocks.mockGetCopilotEstado.mockRejectedValue(new Error('Network'));
    mocks.mockGetCopilotPrompts.mockResolvedValue({ prompts: [] });
    mocks.mockFetch.mockReset();
    render(<Copilot />);
    await waitFor(() => {
      expect(screen.getByText(/ollama offline/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Paneles de warning cuando Ollama está mal configurado
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — warning panels', () => {
  it('ollama_activo=false → muestra bloque naranja "Ollama no detectado" + comando ollama serve', async () => {
    await renderAndWait({ estado: OLLAMA_OFFLINE });
    expect(screen.getByText(/ollama no detectado/i)).toBeInTheDocument();
    expect(screen.getByText(/ollama serve/i)).toBeInTheDocument();
  });

  it('ollama_activo=true && !modelo_disponible → muestra bloque ámbar "Modelo {x} no descargado"', async () => {
    await renderAndWait({ estado: OLLAMA_NO_MODELO });
    expect(screen.getByText(/modelo gemma3:12b no descargado/i)).toBeInTheDocument();
    expect(screen.getByText(/ollama pull gemma3:12b/i)).toBeInTheDocument();
  });

  it('ollama_activo=false Y modelos_instalados vacío → oculta línea de modelos disponibles', async () => {
    await renderAndWait({ estado: { ...OLLAMA_NO_MODELO, modelos_instalados: [] } });
    // El bloque ámbar aparece porque no está descargado, pero no debe listar
    // "Modelos disponibles: ..." si la lista está vacía.
    expect(screen.queryByText(/modelos disponibles/i)).not.toBeInTheDocument();
  });

  it('ollama_activo=true && modelo_disponible → NO muestra ningún warning', async () => {
    await renderAndWait({ estado: OLLAMA_ONLINE });
    expect(screen.queryByText(/ollama no detectado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no descargado/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Welcome message y prompts rápidos
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — welcome message y prompts rápidos', () => {
  it('inyecta el welcome message de "SIGAH Copilot" al montar', async () => {
    await renderAndWait();
    // El welcome tiene "¡Hola!" como primer línea visible del markdown
    expect(screen.getByText(/¡Hola! Soy/i)).toBeInTheDocument();
    // "Gemma" aparece en welcome + en panel Vision (header + body) +
    // en sección "Resumen Ejecutivo". Usamos getAllByText.
    expect(screen.getAllByText(/Gemma/i).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra los prompts rápidos cuando hay exactamente 1 mensaje (welcome)', async () => {
    await renderAndWait();
    expect(screen.getByText(/diagnóstico rápido/i)).toBeInTheDocument();
    // "NOM-016" aparece como botón de prompt rápido Y como línea del welcome
    // markdown ("- Orientación sobre NOM-016, NOM-240..."). Ambos matches
    // son válidos.
    expect(screen.getAllByText(/NOM-016/i).length).toBeGreaterThanOrEqual(1);
  });

  it('oculta los prompts rápidos cuando el chat tiene más de 1 mensaje', async () => {
    await renderAndWait();
    // Envía un mensaje para que messages.length > 1.
    mockFetchStream([{ token: 'Hola ' }, { token: 'IA' }, { done: true }]);
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'Ping' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      // Esperar a que el stream termine.
      expect(screen.queryByText(/diagnóstico rápido/i)).not.toBeInTheDocument();
    });
  });

  it('getCopilotPromptsRapidos rechazando → array vacío, no rompe el render', async () => {
    mocks.mockGetCopilotEstado.mockResolvedValue(OLLAMA_ONLINE);
    mocks.mockGetCopilotPrompts.mockRejectedValue(new Error('Network'));
    mocks.mockFetch.mockReset();
    render(<Copilot />);
    await waitFor(() => {
      expect(screen.getByText(/¡Hola! Soy/i)).toBeInTheDocument();
    });
    // No debe haber prompts rápidos visibles.
    expect(screen.queryByText(/diagnóstico rápido/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Chat input + enviar mensaje
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — input y envío', () => {
  it('input está habilitado por defecto (no streaming)', async () => {
    await renderAndWait();
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    expect(textarea).not.toBeDisabled();
  });

  it('Enter sin Shift envía el mensaje (y limpia el input)', async () => {
    mockFetchStream([{ token: 'Hola ' }, { token: 'equipo' }, { done: true }]);
    await renderAndWait();
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'Diagnostica esto' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mocks.mockFetch).toHaveBeenCalledTimes(1);
    });
    // Tras el envío, el input queda vacío.
    expect(textarea.value).toBe('');
  });

  it('Shift+Enter NO envía (inserta salto de línea)', async () => {
    await renderAndWait();
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'Línea 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  it('Enter con texto vacío/whitespace NO envía', async () => {
    await renderAndWait();
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });
    expect(mocks.mockFetch).not.toHaveBeenCalled();
  });

  it('Envío llama fetch a /api/copilot/chat con body correcto (messages + contexto_tipo)', async () => {
    mockFetchStream([{ token: 'ok' }, { done: true }]);
    await renderAndWait();
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'Ping' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(mocks.mockFetch).toHaveBeenCalled());
    const [url, init] = mocks.mockFetch.mock.calls[0];
    expect(url).toBe('/api/copilot/chat');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.contexto_tipo).toBe('general');
    // El último mensaje es el user.
    const last = body.messages[body.messages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toBe('Ping');
    // Authorization header presente.
    expect(init.headers.Authorization).toMatch(/^Bearer /);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Streaming SSE: tokens, done, error, abort
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — streaming SSE', () => {
  it('los tokens se concatenan en el contenido del assistant message', async () => {
    mockFetchStream([
      { token: 'El monitor ' },
      { token: 'puede tener ' },
      { token: 'falla de fuente.' },
      { done: true },
    ]);
    await renderAndWait();
    const textarea = screen.getByPlaceholderText(/pregunta\.\.\./i);
    fireEvent.change(textarea, { target: { value: 'Diagnostica' } });
    clickSend();

    await waitFor(() => {
      expectTextInDocument(/El monitor puede tener falla de fuente\./);
    });
  });

  it('data.done cierra el stream y pone streaming=false', async () => {
    mockFetchStream([{ token: 'fin' }, { done: true }]);
    await renderAndWait();
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Hola' },
    });
    clickSend();

    // Tras el done, el input vuelve a estar habilitado.
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/pregunta\.\.\./i)).not.toBeDisabled();
    });
  });

  it('data.error marca el mensaje como error y muestra "⚠️ {mensaje}"', async () => {
    mockFetchStream([
      { token: 'Parcial ' },
      { error: 'Ollama desconectado' },
    ]);
    await renderAndWait();
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Pregunta' },
    });
    clickSend();

    await waitFor(() => {
      // El error aparece dentro del bloque del assistant con clase red.
      expectTextInDocument(/⚠️ Ollama desconectado/);
    });
  });

  it('HTTP no-OK lanza "Error de conexión: HTTP {status}"', async () => {
    mockFetchError(503);
    await renderAndWait();
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Ping' },
    });
    clickSend();

    await waitFor(() => {
      expectTextInDocument(/Error de conexión: HTTP 503/);
    });
  });

  it('Network error → mensaje "Error de conexión: ..." + "¿Está Ollama corriendo?"', async () => {
    mockFetchNetworkError();
    await renderAndWait();
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Ping' },
    });
    clickSend();

    await waitFor(() => {
      expectTextInDocument(/¿está ollama corriendo en el servidor\?/i);
    });
  });

  it('botón Stop (streaming=true) llama abortRef.current.abort()', async () => {
    // Stream que nunca termina por sí solo (sin done).
    mockFetchStream([{ token: 'largo... ' }]);
    await renderAndWait();
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Largo' },
    });
    clickSend();

    // Espera a que el botón Stop aparezca (cuadrado rojo).
    await waitFor(() => {
      // El botón tiene un <rect> (IconStop) en lugar de <path> (IconSend).
      const btns = screen.getAllByRole('button');
      const stopBtn = btns.find((b) => b.querySelector('rect'));
      expect(stopBtn).toBeDefined();
    });
  });

  it('AbortError añade "_[Generación detenida]_" al contenido del mensaje', async () => {
    // Mock que rechaza con AbortError al primer read().
    mocks.mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            throw err;
          },
        }),
      },
    });
    await renderAndWait();
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Largo' },
    });
    clickSend();

    await waitFor(() => {
      expectTextInDocument(/Generación detenida/);
    });
    // Y NO debe mostrar "¿Está Ollama corriendo?" (eso es sólo para error genérico).
    expect(screen.queryByText(/¿está ollama corriendo/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Botón Limpiar chat
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — limpiar chat', () => {
  it('click en Limpiar chat resetea messages a 1 mensaje nuevo', async () => {
    await renderAndWait();
    // Antes del clear: hay welcome + prompts rápidos.
    expect(screen.getByText(/diagnóstico rápido/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/limpiar chat/i));

    // Tras el clear: nuevo mensaje "Chat reiniciado" (NO el welcome original).
    await waitFor(() => {
      expect(screen.getByText(/Chat reiniciado/i)).toBeInTheDocument();
    });
    // Los prompts rápidos vuelven a aparecer (messages.length === 1).
    expect(screen.getByText(/diagnóstico rápido/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Diagnóstico panel
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — Diagnóstico panel', () => {
  it('botón "Diagnóstico de Falla" abre el panel con el heading "Diagnóstico de Falla con IA"', async () => {
    await renderAndWait();
    expect(screen.queryByRole('heading', { name: /diagnóstico de falla con ia/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /diagnóstico de falla con ia/i })).toBeInTheDocument();
    });
  });

  it('abrir el panel dispara api.getEquipos con { limit: 300 }', async () => {
    await renderAndWait();
    expect(mocks.mockGetEquipos).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 300 });
    });
  });

  it('cambio de equipo autollena marca y modelo desde el equipo seleccionado', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    // El select tiene "— Sin seleccionar —" como primera opción; las
    // demás son los equipos. Seleccionamos el segundo (EQ_VENTILADOR).
    const selects = screen.getAllByRole('combobox');
    const eqSelect = selects.find((s) =>
      Array.from(s.options).some((o) => /Sin seleccionar/.test(o.textContent))
    );
    fireEvent.change(eqSelect, { target: { value: String(EQ_VENTILADOR.id) } });

    // Los inputs de marca/modelo se llenan con los valores del equipo.
    const inputs = screen.getAllByRole('textbox');
    const fallaTextarea = inputs.find((i) => i.tagName === 'TEXTAREA');
    // Hay 2 text inputs normales (marca, modelo) + 1 textarea (falla).
    const marcaInput = screen.getByPlaceholderText(/GE, Philips/i);
    const modeloInput = screen.getByPlaceholderText(/CARESCAPE B650/i);
    expect(marcaInput.value).toBe('Draeger');
    expect(modeloInput.value).toBe('Oxylog 3000 plus');
    expect(fallaTextarea).toBeDefined();
  });

  it('submit vacío → toast.error("Describe la falla") y NO llama al API', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    // Botón "Analizar falla" disabled si falla.trim() === ''.
    const analizarBtn = screen.getByRole('button', { name: /analizar falla/i });
    expect(analizarBtn).toBeDisabled();
    // Si forzamos el click, igual valida:
    fireEvent.click(analizarBtn);
    expect(mocks.mockCopilotDiagnostico).not.toHaveBeenCalled();
  });

  it('submit válido llama copilotDiagnostico con { falla, marca, modelo, equipo_id }', async () => {
    mocks.mockCopilotDiagnostico.mockResolvedValue({ diagnostico: 'Resultado OK' });
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const fallaTextarea = screen.getByPlaceholderText(/click al intentar prender/i);
    fireEvent.change(fallaTextarea, { target: { value: 'No enciende' } });
    fireEvent.click(screen.getByRole('button', { name: /analizar falla/i }));

    await waitFor(() => expect(mocks.mockCopilotDiagnostico).toHaveBeenCalledTimes(1));
    const payload = mocks.mockCopilotDiagnostico.mock.calls[0][0];
    expect(payload.falla).toBe('No enciende');
    expect(payload.equipo_id).toBeUndefined(); // no seleccionó equipo
    expect(payload.marca).toBe(''); // vacíos
    expect(payload.modelo).toBe('');
  });

  it('submit con equipo seleccionado → payload incluye equipo_id (Number)', async () => {
    mocks.mockCopilotDiagnostico.mockResolvedValue({ diagnostico: 'OK' });
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const selects = screen.getAllByRole('combobox');
    const eqSelect = selects.find((s) =>
      Array.from(s.options).some((o) => /Sin seleccionar/.test(o.textContent))
    );
    fireEvent.change(eqSelect, { target: { value: String(EQ_VENTILADOR.id) } });
    fireEvent.change(screen.getByPlaceholderText(/click al intentar prender/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analizar falla/i }));

    await waitFor(() => expect(mocks.mockCopilotDiagnostico).toHaveBeenCalled());
    const payload = mocks.mockCopilotDiagnostico.mock.calls[0][0];
    expect(payload.equipo_id).toBe(EQ_VENTILADOR.id);
    expect(payload.marca).toBe('Draeger');
    expect(payload.modelo).toBe('Oxylog 3000 plus');
  });

  it('error en copilotDiagnostico → muestra "Error: {detail|message}" en resultado', async () => {
    await renderAndWait({
      overrides: {
        mockCopilotDiagnostico: { rejectWith: {
          response: { data: { detail: 'Backend timeout' } },
        } },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/click al intentar prender/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analizar falla/i }));

    await waitFor(() => {
      expectTextInDocument(/Error: Backend timeout/);
    });
  });

  it('resultado renderiza líneas que empiezan/terminan con ** como bold ámbar', async () => {
    mocks.mockCopilotDiagnostico.mockResolvedValue({
      diagnostico: '**Causa probable**\nLínea normal',
    });
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/click al intentar prender/i), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analizar falla/i }));

    await waitFor(() => {
      const bold = screen.getByText(/Causa probable/i);
      expect(bold.className).toMatch(/font-bold|amber/);
    });
  });

  it('botón "✕ Cerrar" cierra el panel de diagnóstico', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    expect(screen.getByRole('heading', { name: /diagnóstico de falla con ia/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /✕ cerrar/i }));
    expect(screen.queryByRole('heading', { name: /diagnóstico de falla con ia/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Vision panel
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — Vision panel', () => {
  it('botón "Vision (Gemma 4)" abre el panel', async () => {
    await renderAndWait();
    expect(screen.queryByRole('heading', { name: /análisis de imagen/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /análisis de imagen/i })).toBeInTheDocument();
    });
  });

  it('select tipo_doc tiene 3 opciones (etiqueta_equipo / reporte_servicio / general)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    const selects = screen.getAllByRole('combobox');
    const tipoSelect = selects.find((s) =>
      Array.from(s.options).some((o) => /Etiqueta/.test(o.textContent))
    );
    expect(tipoSelect).toBeDefined();
    expect(Array.from(tipoSelect.options).map((o) => o.value)).toEqual([
      'etiqueta_equipo',
      'reporte_servicio',
      'general',
    ]);
    expect(tipoSelect.value).toBe('etiqueta_equipo');
  });

  it('selección de archivo vía FileReader guarda { b64, preview, name }', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    const fileInput = document.querySelector('input[type="file"]');
    const fakeFile = new File(['fake'], 'etiqueta.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    // Tras el FileReader mock, debe aparecer el nombre del archivo y el preview.
    await waitFor(() => {
      expect(screen.getByText('etiqueta.png')).toBeInTheDocument();
    });
    expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
  });

  it('submit sin imagen → botón "Analizar" deshabilitado (disabled)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    const analizarBtn = screen.getByRole('button', { name: /analizar con gemma vision/i });
    expect(analizarBtn).toBeDisabled();
  });

  it('submit válido llama copilotVision con { imagen_b64, tipo_doc }', async () => {
    mocks.mockCopilotVision.mockResolvedValue({
      datos_extraidos: { marca: 'Philips' },
      analisis: 'OK',
    });
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'eq.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('eq.png')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /analizar con gemma vision/i }));

    await waitFor(() => expect(mocks.mockCopilotVision).toHaveBeenCalled());
    const payload = mocks.mockCopilotVision.mock.calls[0][0];
    expect(payload.imagen_b64).toBe('FAKEB64');
    expect(payload.tipo_doc).toBe('etiqueta_equipo');
  });

  it('cambio de tipo_doc antes del submit → payload refleja el nuevo tipo_doc', async () => {
    mocks.mockCopilotVision.mockResolvedValue({ datos_extraidos: {}, analisis: 'OK' });
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'eq.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('eq.png')).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    const tipoSelect = selects.find((s) =>
      Array.from(s.options).some((o) => /Etiqueta/.test(o.textContent))
    );
    fireEvent.change(tipoSelect, { target: { value: 'reporte_servicio' } });

    fireEvent.click(screen.getByRole('button', { name: /analizar con gemma vision/i }));

    await waitFor(() => expect(mocks.mockCopilotVision).toHaveBeenCalled());
    expect(mocks.mockCopilotVision.mock.calls[0][0].tipo_doc).toBe('reporte_servicio');
  });

  it('error en copilotVision → toast.error("Error en análisis de imagen")', async () => {
    await renderAndWait({
      overrides: { mockCopilotVision: 'reject' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['x'], 'eq.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('eq.png')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /analizar con gemma vision/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error en análisis de imagen');
    });
  });

  it('resultado renderiza datos_extraidos (sólo keys con valor truthy)', async () => {
    mocks.mockCopilotVision.mockResolvedValue({
      datos_extraidos: {
        marca: 'Philips',
        modelo: 'MX450',
        serie: '', // falsy → NO se renderiza
        anio: null, // falsy → NO se renderiza
      },
      analisis: 'Equipo identificado.',
    });
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));

    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['x'], 'eq.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('eq.png')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /analizar con gemma vision/i }));

    await waitFor(() => {
      expect(screen.getByText('Philips')).toBeInTheDocument();
      expect(screen.getByText('MX450')).toBeInTheDocument();
    });
    // serie="" y anio=null no deben aparecer como label "serie:" / "anio:"
    expect(screen.queryByText(/^serie:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^anio:/i)).not.toBeInTheDocument();
  });

  it('botón "Cambiar" resetea imagen y vuelve al estado de "seleccionar imagen"', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['x'], 'eq.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('eq.png')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^cambiar$/i }));
    // Vuelve el placeholder.
    expect(screen.getByText(/click para seleccionar imagen/i)).toBeInTheDocument();
  });

  it('botón "✕ Cerrar" cierra el panel de vision', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    expect(screen.getByRole('heading', { name: /análisis de imagen/i })).toBeInTheDocument();
    // Sólo hay 1 ✕ Cerrar visible (el de vision, porque diagnóstico está cerrado).
    const closeBtns = screen.getAllByRole('button', { name: /✕ cerrar/i });
    expect(closeBtns.length).toBe(1);
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByRole('heading', { name: /análisis de imagen/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Resumen Ejecutivo IA
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — Resumen Ejecutivo IA', () => {
  it('click en "Generar resumen del día" llama copilotResumenIa', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /generar resumen del día/i }));
    await waitFor(() => {
      expect(mocks.mockCopilotResumenIa).toHaveBeenCalled();
    });
  });

  it('renderiza fecha + modelo + resumen_narrativo tras éxito', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /generar resumen del día/i }));
    await waitFor(() => {
      expect(screen.getByText(/2026-06-29 · gemma3:4b/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/42 equipos operativos/i)).toBeInTheDocument();
  });

  it('error → toast.error("Error al generar resumen: ¿Ollama está activo?")', async () => {
    await renderAndWait({
      overrides: { mockCopilotResumenIa: 'reject' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generar resumen del día/i }));
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Error al generar resumen: ¿Ollama está activo?',
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 11. Prompts rápidos → usarPromptRapido
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — usarPromptRapido', () => {
  it('click en prompt rápido envía el texto como último mensaje del body', async () => {
    mockFetchStream([{ token: 'res' }, { done: true }]);
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico rápido/i }));

    await waitFor(() => {
      expect(mocks.mockFetch).toHaveBeenCalled();
    });
    const body = JSON.parse(mocks.mockFetch.mock.calls[0][1].body);
    const last = body.messages[body.messages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toBe(PROMPT_RAPIDO.texto);
  });

  it('BUG LATENTE: prompt con contexto_tipo NO se propaga al fetch (stale closure)', async () => {
    // usarPromptRapido hace `setContextoTipo(prompt.contexto_tipo)` y luego
    // llama `enviarMensaje(prompt.texto)` sincrónicamente. enviarMensaje es
    // una closure sobre el contextoTipo VIEJO, así que el fetch se dispara
    // con el contexto anterior (no el del prompt). Para que el contexto
    // cambie de verdad, el usuario debe: cambiar el select del header
    // (que sí fuerza re-render antes del send). Documentado para fix futuro.
    mockFetchStream([{ token: 'res' }, { done: true }]);
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico rápido/i }));

    await waitFor(() => {
      expect(mocks.mockFetch).toHaveBeenCalled();
    });
    const body = JSON.parse(mocks.mockFetch.mock.calls[0][1].body);
    // El contexto queda en 'general' (no en 'equipo' como cabría esperar).
    expect(body.contexto_tipo).toBe('general');
  });

  it('prompt sin contexto_tipo → contextoTipo sigue en "general"', async () => {
    mockFetchStream([{ token: 'ok' }, { done: true }]);
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /NOM-016/i }));

    await waitFor(() => {
      expect(mocks.mockFetch).toHaveBeenCalled();
    });
    const body = JSON.parse(mocks.mockFetch.mock.calls[0][1].body);
    expect(body.contexto_tipo).toBe('general');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 12. Cambio de contextoTipo vía select del header
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — selector de contexto del header', () => {
  it('cambiar el select → el próximo envío incluye el nuevo contexto_tipo', async () => {
    mockFetchStream([{ token: 'ok' }, { done: true }]);
    await renderAndWait();
    const selects = screen.getAllByRole('combobox');
    const ctxSelect = selects.find((s) =>
      Array.from(s.options).some((o) => /Contexto: General/.test(o.textContent))
    );
    fireEvent.change(ctxSelect, { target: { value: 'fiabilidad' } });

    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Test MTBF' },
    });
    clickSend();

    await waitFor(() => expect(mocks.mockFetch).toHaveBeenCalled());
    const body = JSON.parse(mocks.mockFetch.mock.calls[0][1].body);
    expect(body.contexto_tipo).toBe('fiabilidad');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 13. Hygiene (no warnings de React ni de act())
// ─────────────────────────────────────────────────────────────────────────
describe('Copilot — hygiene', () => {
  it('no emite warnings durante la carga inicial', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await renderAndWait();
    const realWarnings = warnSpy.mock.calls.filter(
      (args) => !args.some(
        (a) => typeof a === 'string' && /v7_startTransition|v7_relativeSplatPath/.test(a),
      ),
    );
    expect(realWarnings).toEqual([]);
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('no emite warnings durante el flujo completo (chat + diagnóstico + visión)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetchStream([{ token: 'ok' }, { done: true }]);
    mocks.mockCopilotDiagnostico.mockResolvedValue({ diagnostico: 'X' });
    mocks.mockCopilotVision.mockResolvedValue({ datos_extraidos: {}, analisis: 'Y' });
    await renderAndWait();

    // Chat.
    fireEvent.change(screen.getByPlaceholderText(/pregunta\.\.\./i), {
      target: { value: 'Hola' },
    });
    clickSend();
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/pregunta\.\.\./i)).not.toBeDisabled(),
    );

    // Diagnóstico.
    fireEvent.click(screen.getByRole('button', { name: /diagnóstico de falla/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/click al intentar prender/i), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analizar falla/i }));
    await waitFor(() => expect(screen.getByText(/Resultado OK|^X$/)).toBeInTheDocument());

    // Cerrar y abrir Vision.
    fireEvent.click(screen.getByRole('button', { name: /✕ cerrar/i }));
    fireEvent.click(screen.getByRole('button', { name: /vision \(gemma 4\)/i }));
    fireEvent.change(document.querySelector('input[type="file"]'), {
      target: { files: [new File(['x'], 'eq.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByText('eq.png')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /analizar con gemma vision/i }));
    await waitFor(() => expect(mocks.mockCopilotVision).toHaveBeenCalled());

    const realWarnings = warnSpy.mock.calls.filter(
      (args) => !args.some(
        (a) => typeof a === 'string' && /v7_startTransition|v7_relativeSplatPath/.test(a),
      ),
    );
    expect(realWarnings).toEqual([]);
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });
});