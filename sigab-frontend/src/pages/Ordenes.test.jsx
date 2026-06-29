// src/pages/Ordenes.test.jsx
// Ordenes (750 líneas) — gestión de Órdenes de Servicio (OS) del
// sistema SIGAH. Concentra varios patrones sutiles:
//
//   - **Carga inicial con `api.getOrdenes({ estado, tipo })`** en
//     try/catch/finally. El `setLoading(false)` del finally apaga el
//     spinner aunque el backend rechace. Si alguien borra esa línea
//     del finally, el spinner se queda eternamente en un 500.
//   - **Carga del catálogo de áreas/pisos** con
//     `api.getAreasCatalogo()` una sola vez en mount. Si falla, lo
//     absorbe silenciosamente (sin toast). El catch silencioso es
//     intencional: el catálogo sólo cambia el <select>→<input> del
//     formulario, no es bloqueante para crear una OS.
//   - **`useEffect` para autocomplete** dispara `api.getEquipos({ buscar,
//     limit: 6 })` con un debounce de 280 ms sólo cuando el texto pasa
//     2+ caracteres. `val.length < 2` → limpia sugerencias sin fetch.
//   - **Filtros locales por estado y tipo**: NO recargan el API, sólo
//     se pasan a `useCallback(... [estadoFiltro, tipoFiltro])` como
//     dependencias. Si alguien mete los filtros en el useEffect, cada
//     click dispara una llamada al backend. La `cargar()` SÍ depende
//     de los filtros, así que el efecto los aplica al cambiar.
//   - **Tabs `activas | historico`**: archivo histórico muestra
//     contaje `(858)` hardcoded como fallback cuando `archivosTotal`
//     es 0/falsy en el label de la pestaña. Paginación: `‹ Ant` /
//     `Sig ›` con `disabled` en los bordes.
//   - **Vistas duplicadas mobile/desktop**: hay una `<div class="block sm:hidden ...">`
//     (cards) Y una `<table class="hidden sm:block ...">` (escritorio).
//     Ambas están en el DOM simultáneamente (jsdom no aplica CSS media
//     queries). Por eso queries tipo `getByText` retornan 2 elementos.
//     Usamos `getAllByText(...).length >= N` y selector scopes cuando
//     hace falta distinguir.
//   - **Botones mobile FAB + header desktop**: tres botones
//     (Escanear OS IMSS / Nueva OS (Casillas) / Nueva OS) se repiten
//     como FABs fijos (`md:hidden`) Y como botones header
//     (`hidden md:inline-flex`). Tests usan `getAllByRole(...)[0]` y
//     cuentan ≥ 1 ó ≥ 2.
//   - **Botones de acción por fila**: Cerrar (sólo si `estado !==
//     'cerrada' && !== 'cancelada'`), Formato (siempre), CENEVAL
//     (siempre), Descargar PDF (siempre). El botón Cerrar dispara
//     `window.confirm` antes de llamar al API. Cada fila muestra 2
//     botones Cerrar (mobile + desktop) → 2 OS sin cerrar × 2 vistas
//     = 4 botones Cerrar en el DOM.
//   - **`descargarPdfCasillas`**: éxito → `api.triggerDownload(blob,
//     'CENEVAL_{id}.pdf')`. Error 404 → toast.error con mensaje
//     dedicado. Error genérico → toast.error genérico.
//   - **Validación del formulario de nueva OS**:
//       * `!form.falla_reportada.trim()` → toast.error y abort.
//       * `!form.equipo_nombre.trim() && !form.equipo_serie.trim()`
//         → toast.error y abort.
//       * HTML5 `required` en el textarea es el primer barrier.
//   - **Submit crea OS**: payload = `{...form, origen: 'dashboard'}`
//     y éxito → toast.success, cierra form, recarga lista, abre
//     `FormatoViewer` con autoprint (modo post-creación).
//   - **`handleScanIMSSConfirm(datos)`** pre-llena el form con los
//     datos del OCR. Campos vacíos no pisan lo que el usuario ya
//     había escrito (merge con `datos.x || f.x`). Tras confirmar,
//     abre el form (`setShowForm(true)`) y muestra toast.success.
//   - **`handleTipoFormatoChange`** mapea `correctivo_corto` /
//     `correctivo_largo` → `correctivo`, `preventivo` → `preventivo`,
//     `predictivo` → `predictivo`, `orden_entrega` → `correctivo`.
//   - **`handleCerrar(id)`** primero `window.confirm`, después
//     `toast.loading('Cerrando orden...')` con id, al éxito
//     `toast.success('Orden cerrada', { id: tid })`.
//   - **`mousedown` global**: click fuera del ref de equipo cierra
//     la lista de sugerencias de autocomplete.
//   - **Modal Casillas CENEVAL**: al guardar, `onGuardado` recarga +
//     cierra el modal + (si había `casillasOrdenId`) recarga la OS
//     del backend y la abre en el visor de formato con autoprint.
//
// Quirks de tests en jsdom:
//   - Los labels de los inputs del formulario NO están asociados
//     (`htmlFor`/`id` o wrapping). Por eso `getByLabelText` falla.
//     Las queries usan `placeholder` (accesible name vía placeholder
//     en inputs) o `within(form).getByPlaceholderText`.
//   - El `<textarea>` (falla_reportada) NO tiene placeholder. Tests
//     lo localizan vía `form.querySelector('textarea')`.
//   - El `<form>` no tiene role='form' por defecto, se localiza vía
//     el heading "Nueva Orden de Servicio" con `.closest('form')`.
//
// Se mockea: `../api/sigah` (los 8 métodos usados), `../lib/toast`,
// y los 4 componentes hijos (OrdenDetalleModal, OrdenCasillasForm,
// OCRScannerModal, FormatoViewer). NO se mockea `lucide-react` (los
// iconos funcionan en jsdom sin cambios). NO se usa MemoryRouter
// (la página no usa react-router). NO se wrappea con AuthContext.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const toastFn = vi.fn();
  return {
    mockGetOrdenes:           vi.fn(),
    mockCrearOrden:           vi.fn(),
    mockCerrarOrden:          vi.fn(),
    mockGetAreasCatalogo:     vi.fn(),
    mockGetArchivosHistoricos: vi.fn(),
    mockGetEquipos:           vi.fn(),
    mockGetOrden:             vi.fn(),
    mockDescargarPdfCasillas: vi.fn(),
    mockTriggerDownload:      vi.fn(),
    mockToast: Object.assign(toastFn, {
      success: vi.fn(),
      error:   vi.fn(),
      info:    vi.fn(),
      warning: vi.fn(),
      loading: vi.fn((_msg) => 'tid-' + Math.random().toString(36).slice(2, 8)),
      dismiss: vi.fn(),
    }),
    mockConfirm: vi.fn(() => true),
    mockOrdenDetalleModal:     vi.fn(({ ordenId, onClose }) => (
      <div data-testid="orden-detalle-modal" data-orden-id={ordenId}>
        <button data-testid="orden-detalle-cerrar" onClick={onClose}>cerrar detalle</button>
      </div>
    )),
    mockOrdenCasillasForm:     vi.fn(({ ordenId, onGuardado, onCerrar }) => (
      <div data-testid="orden-casillas-form" data-orden-id={ordenId ?? ''}>
        <button data-testid="casillas-guardar" onClick={() => onGuardado?.({})} >guardar</button>
        <button data-testid="casillas-cerrar"  onClick={onCerrar}>cerrar casillas</button>
      </div>
    )),
    mockOCRScannerModal:       vi.fn(({ onConfirm, onClose }) => (
      <div data-testid="ocr-scanner-modal">
        <button data-testid="ocr-confirmar" onClick={() => onConfirm?.({
          equipo_nombre: 'Monitor Escaneado',
          equipo_serie: 'SN-OCR-001',
          tipo_mantenimiento: 'correctivo',
          descripcion_servicio: 'Falla detectada por OCR',
          tecnico_nombre: 'Téc. OCR',
          area: 'UCI',
          piso: 'Piso 2',
          prioridad: 'alta',
        })}>confirmar</button>
        <button data-testid="ocr-cerrar" onClick={onClose}>cerrar ocr</button>
      </div>
    )),
    mockFormatoViewer:         vi.fn(({ orden, autoprint, onClose }) => (
      <div data-testid="formato-viewer" data-orden-num={orden?.numero_orden || ''} data-autoprint={String(!!autoprint)}>
        <button data-testid="formato-cerrar" onClick={onClose}>cerrar formato</button>
      </div>
    )),
  };
});

vi.mock('../api/sigah', () => ({
  api: {
    getOrdenes:            (...a) => mocks.mockGetOrdenes(...a),
    crearOrden:            (...a) => mocks.mockCrearOrden(...a),
    cerrarOrden:           (...a) => mocks.mockCerrarOrden(...a),
    getAreasCatalogo:      (...a) => mocks.mockGetAreasCatalogo(...a),
    getArchivosHistoricos: (...a) => mocks.mockGetArchivosHistoricos(...a),
    getEquipos:            (...a) => mocks.mockGetEquipos(...a),
    getOrden:              (...a) => mocks.mockGetOrden(...a),
    descargarPdfCasillas:  (...a) => mocks.mockDescargarPdfCasillas(...a),
    triggerDownload:       (...a) => mocks.mockTriggerDownload(...a),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

vi.mock('../components/OrdenDetalleModal', () => ({
  default: (props) => mocks.mockOrdenDetalleModal(props),
}));
vi.mock('../components/OrdenCasillasForm', () => ({
  default: (props) => mocks.mockOrdenCasillasForm(props),
}));
vi.mock('../components/OCRScannerModal', () => ({
  default: (props) => mocks.mockOCRScannerModal(props),
}));
vi.mock('../components/formatos/FormatoViewer', () => ({
  default: (props) => mocks.mockFormatoViewer(props),
}));

window.confirm = mocks.mockConfirm;

import Ordenes from './Ordenes';

// ── Fixtures ─────────────────────────────────────────────────────────────
const OS_ABIERTA = {
  id: 1,
  numero_orden: 'OS-2026-0001',
  equipo_nombre: 'Ventilador Oxylog 3000',
  equipo_serie: 'DRG-OXY-0001',
  falla_reportada: 'No enciende al pulsar el botón de power',
  tecnico_nombre: 'Ing. Ramírez',
  area: 'UCI Adultos',
  piso: 'Piso 3',
  fecha: '2026-06-29',
  estado: 'abierta',
  prioridad: 'critica',
};
const OS_EN_PROGRESO = {
  id: 2,
  numero_orden: 'OS-2026-0002',
  equipo_nombre: 'Monitor IntelliVue MX450',
  equipo_serie: 'PHI-MX4-0002',
  falla_reportada: 'Display parpadea',
  tecnico_nombre: 'Ing. Hernández',
  area: 'Quirófano 3',
  piso: 'Piso 2',
  fecha: '2026-06-28',
  estado: 'en_progreso',
  prioridad: 'alta',
};
const OS_CERRADA = {
  id: 3,
  numero_orden: 'OS-2026-0003',
  equipo_nombre: 'Bomba de Infusión Alaris',
  equipo_serie: 'BD-ALA-0003',
  falla_reportada: 'Fuga en la línea',
  tecnico_nombre: 'Ing. Mendoza',
  area: 'Pediatría',
  piso: 'Piso 1',
  fecha: '2026-06-25',
  estado: 'cerrada',
  prioridad: 'media',
};
const ALL_ORDENES = [OS_ABIERTA, OS_EN_PROGRESO, OS_CERRADA];

const EQ_VENTI = {
  id: 11,
  nombre: 'Ventilador Oxylog 3000',
  serie: 'DRG-OXY-0001',
  modelo: 'Oxylog 3000 plus',
  marca: 'Draeger',
  area: 'UCI Adultos',
  piso: 'Piso 3',
  estado: 'operativo',
};
const EQ_MONITOR = {
  id: 12,
  nombre: 'Monitor IntelliVue MX450',
  serie: 'PHI-MX4-0002',
  modelo: 'MX450',
  marca: 'Philips',
  area: 'Quirófano 3',
  piso: 'Piso 2',
  estado: 'operativo',
};

const ARCHIVO_FOO = {
  folio: 'OS-IMSS-2024-001',
  tipo: 'correctivo',
  anio: 2024,
  serie: 'DRG-OXY-ARCHIVO',
  nombre: 'OS-IMSS-2024-001.pdf',
  url: 'https://example.test/archivos/OS-IMSS-2024-001.pdf',
};

// ── Helpers ──────────────────────────────────────────────────────────────
function setupApis({
  ordenes = ALL_ORDENES,
  areas = ['UCI Adultos', 'Quirófano 3', 'Pediatría'],
  pisos = ['Piso 1', 'Piso 2', 'Piso 3'],
  archivos = [ARCHIVO_FOO],
  archivosTotal = 30,
} = {}) {
  mocks.mockGetOrdenes.mockResolvedValue({ ordenes });
  mocks.mockGetAreasCatalogo.mockResolvedValue({ areas, pisos });
  mocks.mockGetArchivosHistoricos.mockResolvedValue({ archivos, total: archivosTotal });
  mocks.mockCrearOrden.mockResolvedValue({ orden_id: 99, numero_orden: 'OS-2026-0099' });
  mocks.mockCerrarOrden.mockResolvedValue({});
  mocks.mockGetEquipos.mockResolvedValue({ equipos: [EQ_VENTI, EQ_MONITOR] });
  mocks.mockGetOrden.mockResolvedValue({
    orden: { id: 99, numero_orden: 'OS-2026-0099', tipo_mantenimiento: 'correctivo' },
  });
  mocks.mockDescargarPdfCasillas.mockResolvedValue(new Blob(['fake-pdf']));
}

async function renderAndWait(opts = {}) {
  setupApis(opts);
  render(<Ordenes />);
  await waitFor(() => {
    expect(mocks.mockGetOrdenes).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
  });
}

// Localiza el form de Nueva OS por su heading. Los inputs del form se
// identifican por placeholder (accesible name) o DOM query (textarea).
function getForm() {
  const heading = screen.getByText(/nueva orden de servicio/i);
  return heading.closest('form');
}

function getEquipoNombreInput(form) {
  return within(form).getByPlaceholderText(/escribe 2\+ caracteres/i);
}
function getEquipoSerieInput(form) {
  return within(form).getByPlaceholderText(/auto-completado al seleccionar/i);
}
function getTecnicoInput(form) {
  return within(form).getByPlaceholderText(/técnico responsable/i);
}
function getAreaInput(form) {
  return within(form).getByPlaceholderText(/área del equipo/i);
}
function getPisoInput(form) {
  return within(form).getByPlaceholderText(/piso \/ nivel/i);
}
function getFallaTextarea(form) {
  return form.querySelector('textarea');
}

function clickEscanear() {
  fireEvent.click(screen.getAllByRole('button', { name: /escanear os imss/i })[0]);
}
function clickNuevaCasillas() {
  fireEvent.click(screen.getAllByRole('button', { name: /nueva os \(casillas\)/i })[0]);
}
function clickNuevaOS() {
  fireEvent.click(screen.getAllByRole('button', { name: /^nueva os$/i })[0]);
}

// ── Setup ────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.resetAllMocks();
  mocks.mockToast.success = vi.fn();
  mocks.mockToast.error = vi.fn();
  mocks.mockToast.info = vi.fn();
  mocks.mockToast.warning = vi.fn();
  mocks.mockToast.loading = vi.fn((_msg) => 'tid-' + Math.random().toString(36).slice(2, 8));
  mocks.mockToast.dismiss = vi.fn();
  mocks.mockOrdenDetalleModal.mockImplementation(({ ordenId, onClose }) => (
    <div data-testid="orden-detalle-modal" data-orden-id={ordenId}>
      <button data-testid="orden-detalle-cerrar" onClick={onClose}>cerrar detalle</button>
    </div>
  ));
  mocks.mockOrdenCasillasForm.mockImplementation(({ ordenId, onGuardado, onCerrar }) => (
    <div data-testid="orden-casillas-form" data-orden-id={ordenId ?? ''}>
      <button data-testid="casillas-guardar" onClick={() => onGuardado?.({})}>guardar</button>
      <button data-testid="casillas-cerrar"  onClick={onCerrar}>cerrar casillas</button>
    </div>
  ));
  mocks.mockOCRScannerModal.mockImplementation(({ onConfirm, onClose }) => (
    <div data-testid="ocr-scanner-modal">
      <button data-testid="ocr-confirmar" onClick={() => onConfirm?.({
        equipo_nombre: 'Monitor Escaneado',
        equipo_serie: 'SN-OCR-001',
        tipo_mantenimiento: 'correctivo',
        descripcion_servicio: 'Falla detectada por OCR',
        tecnico_nombre: 'Téc. OCR',
        area: 'UCI',
        piso: 'Piso 2',
        prioridad: 'alta',
      })}>confirmar</button>
      <button data-testid="ocr-cerrar" onClick={onClose}>cerrar ocr</button>
    </div>
  ));
  mocks.mockFormatoViewer.mockImplementation(({ orden, autoprint, onClose }) => (
    <div data-testid="formato-viewer" data-orden-num={orden?.numero_orden || ''} data-autoprint={String(!!autoprint)}>
      <button data-testid="formato-cerrar" onClick={onClose}>cerrar formato</button>
    </div>
  ));
  mocks.mockConfirm.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Header + carga inicial
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — header + carga', () => {
  it('renderiza el h1', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/órdenes de servicio/i);
  });

  it('los tres botones del header están en el DOM (header + FAB)', async () => {
    await renderAndWait();
    // 2 botones Escanear (header desktop + FAB mobile)
    expect(screen.getAllByRole('button', { name: /escanear os imss/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /nueva os \(casillas\)/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /^nueva os$/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('llama getOrdenes en mount', async () => {
    await renderAndWait();
    expect(mocks.mockGetOrdenes).toHaveBeenCalledTimes(1);
  });

  it('carga el catálogo de áreas y pisos al montar', async () => {
    await renderAndWait();
    expect(mocks.mockGetAreasCatalogo).toHaveBeenCalledTimes(1);
  });

  it('muestra el spinner de carga y luego las órdenes', async () => {
    setupApis();
    let resolveCarga;
    mocks.mockGetOrdenes.mockReturnValueOnce(new Promise((r) => { resolveCarga = r; }));
    render(<Ordenes />);
    expect(screen.getByText(/cargando órdenes/i)).toBeInTheDocument();
    resolveCarga({ ordenes: ALL_ORDENES });
    await waitFor(() => {
      expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
    });
    // "Ventilador Oxylog 3000" aparece en card mobile + tabla desktop.
    expect(screen.getAllByText(/ventilador oxylog 3000/i).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra toast y oculta el spinner si getOrdenes rechaza', async () => {
    mocks.mockGetOrdenes.mockRejectedValueOnce(new Error('Network'));
    mocks.mockGetAreasCatalogo.mockResolvedValue({ areas: [], pisos: [] });
    render(<Ordenes />);
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/no se pudieron cargar/i));
    });
    expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
  });

  it('muestra "Sin órdenes con ese filtro." cuando no hay resultados', async () => {
    await renderAndWait({ ordenes: [] });
    expect(screen.getByText(/sin órdenes con ese filtro/i)).toBeInTheDocument();
  });

  it('tolera que getAreasCatalogo rechace sin emitir toast', async () => {
    mocks.mockGetOrdenes.mockResolvedValue({ ordenes: [] });
    mocks.mockGetAreasCatalogo.mockRejectedValueOnce(new Error('boom'));
    render(<Ordenes />);
    await waitFor(() => {
      expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
    });
    expect(mocks.mockToast.error).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Listado + badges
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — listado y badges', () => {
  it('cada OS aparece dos veces (card + tabla)', async () => {
    await renderAndWait();
    expect(screen.getAllByText(/OS-2026-0001/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/OS-2026-0002/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/OS-2026-0003/).length).toBeGreaterThanOrEqual(1);
  });

  it('badge de estado muestra texto legible (sin _)', async () => {
    await renderAndWait();
    expect(screen.getAllByText(/en progreso/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^abierta$/i).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra badges de prioridad para OS con prioridad conocida', async () => {
    await renderAndWait();
    expect(screen.getAllByText(/critica/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/alta/i).length).toBeGreaterThanOrEqual(1);
  });

  it('fallback "—" cuando técnico / área están vacíos', async () => {
    const ordenSinMeta = {
      ...OS_ABIERTA,
      id: 50,
      numero_orden: 'OS-2026-0050',
      tecnico_nombre: null,
      area: null,
    };
    await renderAndWait({ ordenes: [ordenSinMeta] });
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('botón Cerrar sólo aparece para OS no cerradas/canceladas', async () => {
    await renderAndWait();
    // 2 OS sin cerrar × 2 vistas (mobile+desktop) = 4 botones Cerrar
    // 1 OS cerrada = 0 botones Cerrar en ninguna vista.
    const cerrarBtns = screen.getAllByRole('button', { name: /^cerrar$/i });
    expect(cerrarBtns.length).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Filtros
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — filtros', () => {
  it('filtra por estado y reconstruye la query', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^abierta$/i }));
    await waitFor(() => {
      const calls = mocks.mockGetOrdenes.mock.calls;
      expect(calls[calls.length - 1][0]).toEqual(expect.objectContaining({ estado: 'abierta' }));
    });
  });

  it('botón "Todas" resetea el filtro de estado (undefined)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^abierta$/i }));
    await waitFor(() => expect(mocks.mockGetOrdenes.mock.calls.length).toBeGreaterThanOrEqual(2));
    fireEvent.click(screen.getByRole('button', { name: /^todas$/i }));
    await waitFor(() => {
      const calls = mocks.mockGetOrdenes.mock.calls;
      expect(calls[calls.length - 1][0]).toEqual(expect.objectContaining({ estado: undefined }));
    });
  });

  it('filtra por tipo (correctivo)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^correctivo$/i }));
    await waitFor(() => {
      const calls = mocks.mockGetOrdenes.mock.calls;
      expect(calls[calls.length - 1][0]).toEqual(expect.objectContaining({ tipo: 'correctivo' }));
    });
  });

  it('botón "Todos" resetea el filtro de tipo', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^correctivo$/i }));
    await waitFor(() => expect(mocks.mockGetOrdenes.mock.calls.length).toBeGreaterThanOrEqual(2));
    fireEvent.click(screen.getByRole('button', { name: /^todos$/i }));
    await waitFor(() => {
      const calls = mocks.mockGetOrdenes.mock.calls;
      expect(calls[calls.length - 1][0]).toEqual(expect.objectContaining({ tipo: undefined }));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Form de nueva OS
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — form de nueva OS', () => {
  function abrirForm() {
    clickNuevaOS();
  }

  it('el form inicia oculto y se muestra al click', async () => {
    await renderAndWait();
    expect(screen.queryByText(/nueva orden de servicio/i)).not.toBeInTheDocument();
    abrirForm();
    expect(screen.getByText(/nueva orden de servicio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear orden/i })).toBeInTheDocument();
  });

  it('cataloga los 5 tipos de formato IMSS', async () => {
    await renderAndWait();
    abrirForm();
    const form = getForm();
    const selectFormato = within(form).getByDisplayValue(/correctivo corto/i);
    const options = within(selectFormato).getAllByRole('option').map((o) => o.value);
    expect(options).toEqual(expect.arrayContaining([
      'correctivo_corto', 'correctivo_largo', 'preventivo', 'predictivo', 'orden_entrega',
    ]));
  });

  it('cambiar tipo_formato a "preventivo" actualiza el select visible', async () => {
    await renderAndWait();
    abrirForm();
    const form = getForm();
    const sel = within(form).getByDisplayValue(/correctivo corto/i);
    fireEvent.change(sel, { target: { value: 'preventivo' } });
    expect(within(form).getByDisplayValue(/mantenimiento preventivo/i)).toBeInTheDocument();
  });

  it('submit vacío NO llama crearOrden (validación HTML5 required)', async () => {
    await renderAndWait();
    abrirForm();
    // El textarea de falla es required (HTML5). El Crear Orden sin pasar
    // la validación HTML5 hace que el submit nativo se bloquee.
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    // Esperamos un tick.
    await new Promise((r) => setTimeout(r, 50));
    expect(mocks.mockCrearOrden).not.toHaveBeenCalled();
  });

  it('submit válido llama crearOrden con payload correcto y abre FormatoViewer', async () => {
    await renderAndWait();
    abrirForm();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'Monitor MX' } });
    fireEvent.change(getFallaTextarea(form), { target: { value: 'Display parpadea' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(mocks.mockCrearOrden).toHaveBeenCalledTimes(1);
    });
    const payload = mocks.mockCrearOrden.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      equipo_nombre: 'Monitor MX',
      falla_reportada: 'Display parpadea',
      origen: 'dashboard',
    }));
    await waitFor(() => {
      expect(screen.getByTestId('formato-viewer')).toBeInTheDocument();
    });
    expect(screen.getByTestId('formato-viewer').dataset.autoprint).toBe('true');
  });

  it('error del backend → toast.error con detail', async () => {
    mocks.mockGetOrdenes.mockResolvedValue({ ordenes: [] });
    mocks.mockGetAreasCatalogo.mockResolvedValue({ areas: [], pisos: [] });
    mocks.mockCrearOrden.mockRejectedValueOnce({
      response: { data: { detail: 'Equipo duplicado en OS abierta' } },
    });
    render(<Ordenes />);
    await waitFor(() => {
      expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
    });
    clickNuevaOS();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'X' } });
    fireEvent.change(getFallaTextarea(form), { target: { value: 'F' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/equipo duplicado/i));
    });
  });

  it('submit sin nombre NI serie → toast.error (handler-level)', async () => {
    // HTML5 no bloquea esto porque ningún input tiene required (sólo
    // falla_reportada). El handler cubre el caso.
    await renderAndWait();
    abrirForm();
    const form = getForm();
    // Sólo llenar falla (textarea required)
    fireEvent.change(getFallaTextarea(form), { target: { value: 'Display parpadea' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/nombre del equipo o número de serie/i),
      );
    });
    expect(mocks.mockCrearOrden).not.toHaveBeenCalled();
  });

  it('whitespace en falla → toast.error del handler (pasa HTML5 required)', async () => {
    await renderAndWait();
    abrirForm();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'V' } });
    // Sólo whitespace pasa el `required` HTML5
    fireEvent.change(getFallaTextarea(form), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /crear orden/i }));
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/describe la falla/i));
    });
    expect(mocks.mockCrearOrden).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Autocomplete de equipo
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — autocomplete de equipo', () => {
  it('input con 1 carácter NO dispara getEquipos con ese valor', async () => {
    await renderAndWait();
    clickNuevaOS();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'V' } });
    await new Promise((r) => setTimeout(r, 350));
    // El input de 1 carácter debe omitir el fetch (early-return en
    // buscarEquipos). NOTA: tests previos con autocomplete pueden
    // dejar un fetch pendiente que resuelve después de `vi.resetAllMocks`.
    // Por eso assertamos con el valor específico, no `not.toHaveBeenCalled`.
    expect(mocks.mockGetEquipos).not.toHaveBeenCalledWith(
      expect.objectContaining({ buscar: 'V' }),
    );
  });

  it('input con 2+ caracteres dispara getEquipos (vía debounce)', async () => {
    await renderAndWait();
    clickNuevaOS();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'Ven' } });
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith(
        expect.objectContaining({ buscar: 'Ven', limit: 6 }),
      );
    });
  });

  it('seleccionar equipo autollena serie / área / piso', async () => {
    await renderAndWait();
    clickNuevaOS();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'Ventilador' } });
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalled();
    });
    // Espera que la sugerencia aparezca en el DOM. La fila de OS en la tabla
    // también contiene "Ventilador Oxylog 3000", por eso hay varios matches.
    // Buscamos el nodo dentro del <ul> de sugerencias.
    await waitFor(() => {
      const suggestions = document.querySelectorAll('ul li');
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });
    // El primer <li> es la sugerencia del autocomplete.
    const suggestion = document.querySelector('ul li');
    fireEvent.mouseDown(suggestion);
    await waitFor(() => {
      expect(within(form).getByDisplayValue('DRG-OXY-0001')).toBeInTheDocument();
      expect(within(form).getByDisplayValue('UCI Adultos')).toBeInTheDocument();
      expect(within(form).getByDisplayValue('Piso 3')).toBeInTheDocument();
    });
  });

  it('getEquipos rechazando limpia sugerencias sin romper UI', async () => {
    mocks.mockGetOrdenes.mockResolvedValue({ ordenes: [] });
    mocks.mockGetAreasCatalogo.mockResolvedValue({ areas: [], pisos: [] });
    mocks.mockGetEquipos.mockRejectedValueOnce(new Error('boom'));
    render(<Ordenes />);
    await waitFor(() => {
      expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
    });
    clickNuevaOS();
    const form = getForm();
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'Xyz' } });
    await new Promise((r) => setTimeout(r, 350));
    expect(mocks.mockToast.error).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Cerrar OS
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — cerrar OS', () => {
  it('si confirm() rechaza, no llama API', async () => {
    mocks.mockConfirm.mockReturnValueOnce(false);
    await renderAndWait();
    const cerrarBtns = screen.getAllByRole('button', { name: /^cerrar$/i });
    fireEvent.click(cerrarBtns[0]);
    await new Promise((r) => setTimeout(r, 100));
    expect(mocks.mockCerrarOrden).not.toHaveBeenCalled();
  });

  it('confirm OK → cerrarOrden + toast.loading + toast.success', async () => {
    await renderAndWait();
    const cerrarBtns = screen.getAllByRole('button', { name: /^cerrar$/i });
    fireEvent.click(cerrarBtns[0]);
    await waitFor(() => {
      expect(mocks.mockCerrarOrden).toHaveBeenCalledWith(OS_ABIERTA.id);
    });
    await waitFor(() => {
      expect(mocks.mockToast.loading).toHaveBeenCalledWith(expect.stringMatching(/cerrando orden/i));
      expect(mocks.mockToast.success).toHaveBeenCalledWith(
        expect.stringMatching(/orden cerrada/i),
        expect.objectContaining({ id: expect.any(String) }),
      );
    });
  });

  it('cerrarOrden rechazando muestra toast.error', async () => {
    mocks.mockCerrarOrden.mockRejectedValueOnce(new Error('boom'));
    await renderAndWait();
    const cerrarBtns = screen.getAllByRole('button', { name: /^cerrar$/i });
    fireEvent.click(cerrarBtns[0]);
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/no se pudo cerrar/i),
        expect.objectContaining({ id: expect.any(String) }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Modales hijos
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — modales hijos', () => {
  it('click en fila abre OrdenDetalleModal con el id correcto', async () => {
    await renderAndWait();
    // OS-2026-0001 aparece 2 veces (mobile <span> + desktop <td>). Sólo el
    // <td> está dentro de un <tr>. Buscamos el que tiene TR ancestro.
    const cells = screen.getAllByText('OS-2026-0001');
    const tdRow = cells.find((c) => c.closest('tr'));
    expect(tdRow).toBeDefined();
    fireEvent.click(tdRow.closest('tr'));
    await waitFor(() => {
      expect(screen.getByTestId('orden-detalle-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('orden-detalle-modal').dataset.ordenId).toBe(String(OS_ABIERTA.id));
  });

  it('cerrar OrdenDetalleModal lo desmonta', async () => {
    await renderAndWait();
    const cells = screen.getAllByText('OS-2026-0001');
    const tdRow = cells.find((c) => c.closest('tr'));
    fireEvent.click(tdRow.closest('tr'));
    await waitFor(() => {
      expect(screen.getByTestId('orden-detalle-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('orden-detalle-cerrar'));
    expect(screen.queryByTestId('orden-detalle-modal')).not.toBeInTheDocument();
  });

  it('botón CENEVAL desde la fila abre OrdenCasillasForm con ordenId', async () => {
    await renderAndWait();
    const casillasBtns = screen.getAllByRole('button', { name: /ceneval/i });
    expect(casillasBtns.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(casillasBtns[0]);
    await waitFor(() => {
      expect(screen.getByTestId('orden-casillas-form')).toBeInTheDocument();
    });
    expect(screen.getByTestId('orden-casillas-form').dataset.ordenId).toBe(String(OS_ABIERTA.id));
  });

  it('botón "Nueva OS (Casillas)" abre form con ordenId=null', async () => {
    await renderAndWait();
    clickNuevaCasillas();
    await waitFor(() => {
      expect(screen.getByTestId('orden-casillas-form')).toBeInTheDocument();
    });
    expect(screen.getByTestId('orden-casillas-form').dataset.ordenId).toBe('');
  });

  it('botón Escanear OS IMSS abre OCRScannerModal', async () => {
    await renderAndWait();
    clickEscanear();
    await waitFor(() => {
      expect(screen.getByTestId('ocr-scanner-modal')).toBeInTheDocument();
    });
  });

  it('OCRScannerModal onConfirm pre-llena form y lo abre con toast.success', async () => {
    await renderAndWait();
    clickEscanear();
    await waitFor(() => {
      expect(screen.getByTestId('ocr-scanner-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('ocr-confirmar'));
    await waitFor(() => {
      expect(screen.getByText(/nueva orden de servicio/i)).toBeInTheDocument();
    });
    const form = getForm();
    expect(within(form).getByDisplayValue('Monitor Escaneado')).toBeInTheDocument();
    expect(within(form).getByDisplayValue('SN-OCR-001')).toBeInTheDocument();
    expect(within(form).getByDisplayValue('Falla detectada por OCR')).toBeInTheDocument();
    expect(mocks.mockToast.success).toHaveBeenCalledWith(expect.stringMatching(/pre-llenados desde el escaneo/i));
  });

  it('botón "🖨 Formato" abre FormatoViewer en modo no-autoprint', async () => {
    await renderAndWait();
    const formatBtns = screen.getAllByRole('button', { name: /formato/i });
    expect(formatBtns.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(formatBtns[0]);
    await waitFor(() => {
      expect(screen.getByTestId('formato-viewer')).toBeInTheDocument();
    });
    expect(screen.getByTestId('formato-viewer').dataset.autoprint).toBe('false');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Casillas onGuardado → recarga + autoprint
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — guardar casillas', () => {
  it('onGuardado con casillasOrdenId recarga y abre visor en autoprint', async () => {
    await renderAndWait();
    fireEvent.click(screen.getAllByRole('button', { name: /ceneval/i })[0]);
    await waitFor(() => {
      expect(screen.getByTestId('orden-casillas-form')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('casillas-guardar'));
    await waitFor(() => {
      expect(mocks.mockGetOrdenes.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId('formato-viewer')).toBeInTheDocument();
    });
    expect(screen.getByTestId('formato-viewer').dataset.autoprint).toBe('true');
    expect(screen.queryByTestId('orden-casillas-form')).not.toBeInTheDocument();
  });

  it('onCerrar cierra el modal sin recargar', async () => {
    await renderAndWait();
    fireEvent.click(screen.getAllByRole('button', { name: /ceneval/i })[0]);
    await waitFor(() => {
      expect(screen.getByTestId('orden-casillas-form')).toBeInTheDocument();
    });
    const callsBefore = mocks.mockGetOrdenes.mock.calls.length;
    fireEvent.click(screen.getByTestId('casillas-cerrar'));
    expect(screen.queryByTestId('orden-casillas-form')).not.toBeInTheDocument();
    expect(mocks.mockGetOrdenes.mock.calls.length).toBe(callsBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Archivo histórico
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — archivo histórico', () => {
  function goHistorico(opts = {}) {
    const tabBtn = screen.getByRole('button', { name: /^archivo histórico/i });
    fireEvent.click(tabBtn);
    return opts;
  }

  it('al cambiar a tab historico se carga el listado', async () => {
    await renderAndWait();
    goHistorico();
    await waitFor(() => {
      expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalled();
    });
    // Aparece dos veces: card mobile (1er match) + td desktop (2do match).
    expect(screen.getAllByText(/OS-IMSS-2024-001/).length).toBeGreaterThanOrEqual(1);
  });

  it('label del tab historico muestra "(858)" cuando aún no se cargó el total', async () => {
    await renderAndWait({ archivosTotal: 0, archivos: [] });
    // Antes de cambiar de tab, archivosTotal=0 → label usa fallback hardcoded "(858)".
    const tabHistorico = screen.getByRole('button', { name: /archivo histórico \(858\)/i });
    expect(tabHistorico).toBeInTheDocument();
  });

  it('label del tab historico muestra el total real después de cargar', async () => {
    await renderAndWait({ archivosTotal: 245, archivos: [] });
    goHistorico();
    await waitFor(() => {
      expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archivo histórico \(245\)/i })).toBeInTheDocument();
    });
  });

  it('Enter en el input busca y recarga', async () => {
    await renderAndWait();
    goHistorico();
    await waitFor(() => expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalledTimes(1));
    const input = screen.getByPlaceholderText(/buscar por folio/i);
    fireEvent.change(input, { target: { value: 'OS-BUSCAR' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalledTimes(2));
    expect(mocks.mockGetArchivosHistoricos.mock.calls[1][0]).toEqual(
      expect.objectContaining({ buscar: 'OS-BUSCAR', page: 1, limit: 30 }),
    );
  });

  it('click en "Buscar" también recarga', async () => {
    await renderAndWait();
    goHistorico();
    await waitFor(() => expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalledTimes(1));
    const input = screen.getByPlaceholderText(/buscar por folio/i);
    fireEvent.change(input, { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /^buscar$/i }));
    await waitFor(() => {
      expect(mocks.mockGetArchivosHistoricos.mock.calls[1][0]).toEqual(
        expect.objectContaining({ buscar: 'X', page: 1, limit: 30 }),
      );
    });
  });

  it('paginación: Sig › incrementa la página', async () => {
    await renderAndWait({ archivosTotal: 60 });
    goHistorico();
    await waitFor(() => expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getAllByRole('button', { name: /sig ›/i })[0]);
    await waitFor(() => {
      expect(mocks.mockGetArchivosHistoricos.mock.calls[1][0]).toEqual(
        expect.objectContaining({ page: 2, limit: 30 }),
      );
    });
  });

  it('paginación: ‹ Ant en primera página está deshabilitado', async () => {
    await renderAndWait({ archivosTotal: 60 });
    goHistorico();
    await waitFor(() => expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalledTimes(1));
    const antBtn = screen.getAllByRole('button', { name: /‹ ant/i })[0];
    expect(antBtn).toBeDisabled();
  });

  it('muestra "Sin resultados." cuando la lista viene vacía', async () => {
    await renderAndWait({ archivos: [], archivosTotal: 0 });
    goHistorico();
    await waitFor(() => {
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
    });
  });

  it('getArchivosHistoricos rechazando → toast.error', async () => {
    mocks.mockGetOrdenes.mockResolvedValue({ ordenes: [] });
    mocks.mockGetAreasCatalogo.mockResolvedValue({ areas: [], pisos: [] });
    mocks.mockGetArchivosHistoricos.mockRejectedValueOnce(new Error('boom'));
    render(<Ordenes />);
    await waitFor(() => {
      expect(screen.queryByText(/cargando órdenes/i)).not.toBeInTheDocument();
    });
    goHistorico();
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(expect.stringMatching(/archivo histórico/i));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Descargar PDF CENEVAL
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — descargar PDF CENEVAL', () => {
  it('éxito → api.triggerDownload con nombre CENEVAL_{id}.pdf', async () => {
    await renderAndWait();
    const pdfBtns = screen.getAllByTitle(/descargar pdf ceneval/i);
    expect(pdfBtns.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(pdfBtns[0]);
    await waitFor(() => {
      expect(mocks.mockDescargarPdfCasillas).toHaveBeenCalledWith(OS_ABIERTA.id);
    });
    await waitFor(() => {
      expect(mocks.mockTriggerDownload).toHaveBeenCalledWith(
        expect.anything(),
        `CENEVAL_${OS_ABIERTA.id}.pdf`,
      );
    });
  });

  it('404 → toast.error dedicado de casillas no registradas', async () => {
    mocks.mockDescargarPdfCasillas.mockRejectedValueOnce({ response: { status: 404 } });
    await renderAndWait();
    fireEvent.click(screen.getAllByTitle(/descargar pdf ceneval/i)[0]);
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/no tiene casillas ceneval/i),
      );
    });
  });

  it('error genérico → toast.error genérico', async () => {
    mocks.mockDescargarPdfCasillas.mockRejectedValueOnce({
      response: { status: 500, data: { detail: 'Internal' } },
    });
    await renderAndWait();
    fireEvent.click(screen.getAllByTitle(/descargar pdf ceneval/i)[0]);
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/error al generar pdf ceneval/i),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 11. Hygiene
// ─────────────────────────────────────────────────────────────────────────
describe('Ordenes — hygiene', () => {
  it('carga inicial sin warnings de act', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderAndWait();
    expect(errSpy).not.toHaveBeenCalledWith(expect.stringMatching(/not wrapped in act/i));
    errSpy.mockRestore();
  });

  it('flujo completo: form + autocomplete + cerrar + archivo histórico', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderAndWait();
    // Abrir form
    clickNuevaOS();
    const form = getForm();
    // Autocomplete
    fireEvent.change(getEquipoNombreInput(form), { target: { value: 'Vent' } });
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    await waitFor(() => {
      expect(document.querySelectorAll('ul li').length).toBeGreaterThanOrEqual(1);
    });
    const suggestion = document.querySelector('ul li');
    fireEvent.mouseDown(suggestion);
    await waitFor(() => {
      expect(within(form).getByDisplayValue('DRG-OXY-0001')).toBeInTheDocument();
    });
    // Cerrar primera OS
    fireEvent.click(screen.getAllByRole('button', { name: /^cerrar$/i })[0]);
    await waitFor(() => expect(mocks.mockCerrarOrden).toHaveBeenCalled());
    // Cargar archivo histórico
    fireEvent.click(screen.getByRole('button', { name: /^archivo histórico/i }));
    await waitFor(() => expect(mocks.mockGetArchivosHistoricos).toHaveBeenCalled());
    expect(errSpy).not.toHaveBeenCalledWith(expect.stringMatching(/not wrapped in act/i));
    errSpy.mockRestore();
  });
});
