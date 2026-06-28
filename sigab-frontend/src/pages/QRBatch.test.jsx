// src/pages/QRBatch.test.jsx
// QRBatch (419 líneas) es el módulo de generación masiva de etiquetas QR
// para impresión (carta o sticker Zebra). Concentra varios patrones sutiles:
//
//   - **Carga inicial con `api.getEquipos({ limit: 500 })`** en try/catch/
//     finally. Si el `setLoading(false)` del finally se borra, el spinner
//     se queda eternamente aunque el backend devuelva 500.
//   - **`res.equipos ?? []` con fallback**: si la respuesta es
//     `{equipos: null}` o `null`, el filtro `e.area` crashea con TypeError.
//     Si la respuesta es `{equipos: [...]}` o `[...]` directo, se acepta.
//   - **`useMemo` de `areas`**: deduplicado con `Set` + sort alfabético
//     sobre `equipo.area`. Si alguien quita `.filter(Boolean)`, áreas
//     `null/undefined` se acumulan como un solo bucket vacío.
//   - **Búsqueda case-insensitive** sobre nombre, serie Y marca (cualquier
//     match → included). Si alguien quita la rama `marca`, los equipos
//     buscados por marca desaparecen del grid.
//   - **Filtro por área** exacto (`===`). Si alguien cambia a `.includes()`
//     con prefijo, áreas con substring matchean entre sí.
//   - **Selección persistente**: `seleccionados` se mantiene aunque el
//     equipo desaparezca del filtro (ej. si cambias de área). El botón
//     "Limpiar todo" sólo aparece cuando hay selección.
//   - **Toggle selección individual**: añade si no está, quita si está.
//   - **`toggleSeleccionarTodos`**: si TODOS los visibles están ya
//     seleccionados → deselecciona sólo los visibles (los ocultos
//     permanecen). Si NO están todos → añade todos los visibles (dedup).
//   - **Vista Previa condicional**: sólo cuando `showPreview && seleccionados.length > 0`.
//     Slice a 4 cards + "+N más..." si hay más. Botón toggle "Vista/Ocultar"
//     sólo aparece cuando hay selección.
//   - **Print zones siempre renderizadas** (`.qr-print-carta` y
//     `.qr-print-zebra`) con todos los `equiposParaImprimir`. La visibilidad
//     se controla con CSS `@media print` (no con `display:none`). Si alguien
//     cambia esto por conditional rendering, los modos `print:hidden` rompen.
//   - **`modo === 'carta'`**: páginas = `Math.ceil(n / 12)` (3×4 grid).
//   - **`modo === 'zebra'`**: páginas = `n` (1 sticker por página).
//   - **Toggle modo**: classes purple (`from-purple-500 to-indigo-600`) para
//     carta, amber (`bg-amber-600`) para zebra. Si alguien homogeneiza las
//     clases, el operador pierde el feedback visual de modo activo.
//   - **`handlePrint`**:
//       * selección vacía → `toast.error('Selecciona al menos un equipo antes de imprimir')`.
//       * con selección → `toast.success` con count + páginas estimadas.
//       * siempre setea `data-print-mode` en `<html>` (luego lo limpia 500ms después).
//       * en zebra → inyecta `<style id="zebra-page-override">` con
//         `@page { size: 51mm 25mm; margin: 0; }` (luego lo remueve).
//       * llama `window.print()` 100ms después del click.
//   - **`window.location.origin`** se usa en el `value` del QRCodeSVG
//     (formato `${origin}/equipo/${qr_token || serie}`). Si alguien usa
//     `location.href` (path incluido), el QR apunta a URLs rotas.
//   - **Stats bar refleja estado**: "Seleccionados" = `seleccionados.length`,
//     "Páginas" = `paginasEstimadas || '—'`, "Formato" = texto según modo.
//   - **Empty state**: si `equiposFiltrados.length === 0`, "No se
//     encontraron equipos" + (opcional) ` para "${busqueda}"`.
//
// Riesgos silenciosos cubiertos:
//   - Si el `setLoading(false)` del finally se borra, loading infinito.
//   - Si el fallback `res.equipos ?? []` se quita, crash con `{equipos: null}`.
//   - Si `?? '—'` en `paginasEstimadas` se borra, "0" se muestra como 0
//     páginas en lugar de "—" (UX confuso cuando no hay selección).
//   - Si el guard `if (seleccionados.length === 0)` se quita del print
//     handler, se llama `window.print()` con etiquetas vacías.
//   - Si el cleanup del `data-print-mode` falla, el modo print queda
//     activo entre sesiones (CSS roto en pantalla).
//   - Si el orden `carta/zebra` se invierte en el cálculo de páginas,
//     Zebra muestra "12 páginas" para 12 etiquetas (debería ser 12 páginas
//     = 12 stickers = OK, pero si swap de fórmula: 1 página Zebra de 12
//     = mal).
//
// Se mockea: `../api/sigah` (getEquipos), `../lib/toast` (silencioso),
// `qrcode.react` (QRCodeSVG es render-SVG, jsdom no lo necesita). NO se
// mockea `lucide-react` (los iconos funcionan en jsdom). NO se usa
// MemoryRouter (la página no usa react-router).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  mockGetEquipos: vi.fn(),
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
    getEquipos: (...a) => mocks.mockGetEquipos(...a),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

// QRCodeSVG renderiza SVG; en jsdom funciona nativamente, pero simplificamos
// a un <svg data-testid="qr-code-svg" data-value="..."> para verificar el
// valor pasado sin depender del output SVG interno.
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size, level }) => (
    <svg
      data-testid="qr-code-svg"
      data-value={value}
      data-size={size}
      data-level={level}
    />
  ),
}));

import QRBatch from './QRBatch';

// ── Fixtures ─────────────────────────────────────────────────────────────
const EQ_VENTILADOR = {
  id: 1,
  nombre: 'Ventilador Mindray SV300',
  serie: 'VNT-001',
  marca: 'Mindray',
  qr_token: 'abc12345',
  area: 'UCI Adultos',
  piso: 3,
};
const EQ_BOMBA = {
  id: 2,
  nombre: 'Bomba de infusión',
  serie: 'BMP-100',
  marca: 'Baxter',
  qr_token: 'def67890',
  area: 'UCI Adultos',
  piso: 3,
};
const EQ_RAYOS = {
  id: 3,
  nombre: 'Equipo Rayos X Portátil',
  serie: 'RX-200',
  marca: 'Siemens',
  qr_token: 'ghi11111',
  area: 'Imagenología',
  piso: 1,
};
const EQ_MONITOR = {
  id: 4,
  nombre: 'Monitor de Signos Vitales',
  serie: 'MON-300',
  marca: 'Philips',
  qr_token: 'jkl22222',
  area: 'UCI Pediátrica',
  piso: 4,
};
const EQ_SIN_AREA = {
  id: 5,
  nombre: 'Equipo sin área asignada',
  serie: 'SIN-001',
  marca: 'Genérica',
  qr_token: 'mno33333',
  area: null,
  piso: null,
};
const EQ_SIN_TOKEN = {
  id: 6,
  nombre: 'Equipo sin qr_token',
  serie: 'NOTOKEN-001',
  marca: 'Genérica',
  qr_token: null,
  area: 'UCI Adultos',
  piso: 3,
};

function setupApi({ equipos = [EQ_VENTILADOR, EQ_BOMBA, EQ_RAYOS, EQ_MONITOR, EQ_SIN_AREA, EQ_SIN_TOKEN] } = {}) {
  mocks.mockGetEquipos.mockResolvedValue({ equipos });
}

// Helper: stub de window.print + spy en documentElement.setAttribute
function stubPrint() {
  const original = window.print;
  const spy = vi.fn();
  window.print = spy;
  return { spy, restore: () => { window.print = original; } };
}

async function renderAndWait(opts = {}) {
  setupApi(opts);
  render(<QRBatch />);
  // Espera a que el loading desaparezca: el spinner tiene clase animate-spin
  // y se reemplaza por el grid. Usamos queryByText del empty state o del
  // header como señal estable.
  await waitFor(() => {
    expect(mocks.mockGetEquipos).toHaveBeenCalled();
  });
  await waitFor(() => {
    // El spinner de loading ya no debería estar presente.
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Asegurar que el atributo data-print-mode no persiste entre tests
  document.documentElement.removeAttribute('data-print-mode');
  // Limpiar cualquier style zebra override residual
  document.getElementById('zebra-page-override')?.remove();
});

afterEach(() => {
  cleanup();
  // CRÍTICO: restaurar timers reales después de tests que usaron fake.
  // Sin esto, vi.useFakeTimers() deja el global setTimeout congelado y
  // waitFor() (que usa setTimeout para reintentos) se cuelga en tests
  // posteriores.
  vi.useRealTimers();
  document.documentElement.removeAttribute('data-print-mode');
  document.getElementById('zebra-page-override')?.remove();
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Loading state
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — loading state', () => {
  it('muestra spinner de carga mientras la promesa no resuelve', () => {
    mocks.mockGetEquipos.mockReturnValue(new Promise(() => {})); // never resolves

    render(<QRBatch />);

    // El spinner tiene clase animate-spin (border-t-transparent).
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    // El grid NO debería estar presente todavía.
    expect(document.querySelector('.grid-cols-2')).not.toBeInTheDocument();
  });

  it('oculta el spinner tras resolución exitosa de getEquipos', async () => {
    await renderAndWait();
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('oculta el spinner incluso si getEquipos rechaza (finally con setLoading(false))', async () => {
    mocks.mockGetEquipos.mockRejectedValue(new Error('Network'));

    render(<QRBatch />);

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    // Y debe haber mostrado el toast.error
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar equipos');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Header
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — header', () => {
  it('renderiza el h1 "Etiquetado Masivo QR"', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /etiquetado masivo qr/i })).toBeInTheDocument();
  });

  it('muestra el subtítulo descriptivo', async () => {
    await renderAndWait();
    expect(screen.getByText(/genera etiquetas qr profesionales con identidad imss/i)).toBeInTheDocument();
  });

  it('renderiza los botones de modo "Carta" y "Zebra"', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: /^carta$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^zebra$/i })).toBeInTheDocument();
  });

  it('modo por defecto es "Carta" (botón con clases purple)', async () => {
    await renderAndWait();
    const cartaBtn = screen.getByRole('button', { name: /^carta$/i });
    expect(cartaBtn.className).toContain('bg-purple-600');
    const zebraBtn = screen.getByRole('button', { name: /^zebra$/i });
    expect(zebraBtn.className).not.toContain('bg-amber-600');
  });

  it('click en "Zebra" cambia el modo activo (clases amber en Zebra)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));

    const zebraBtn = screen.getByRole('button', { name: /^zebra$/i });
    expect(zebraBtn.className).toContain('bg-amber-600');
    const cartaBtn = screen.getByRole('button', { name: /^carta$/i });
    expect(cartaBtn.className).not.toContain('bg-purple-600');
  });

  it('botón Imprimir inicia disabled cuando no hay selección', async () => {
    await renderAndWait();
    const btn = screen.getByRole('button', { name: /imprimir \d+ qr/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/imprimir 0 qr/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Stats bar
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — stats bar', () => {
  it('muestra "Seleccionados: 0" inicialmente', async () => {
    await renderAndWait();
    expect(screen.getByText(/seleccionados/i)).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('muestra "Páginas estimadas: —" cuando no hay selección', async () => {
    await renderAndWait();
    // El label es "Páginas estimadas:" y el valor es "—" cuando no hay selección.
    expect(screen.getByText(/páginas estimadas/i)).toBeInTheDocument();
    // Hay varios "—" en el DOM (también en el formato si longitud==0).
    // Verificamos que al menos uno aparece en el bloque del stats bar.
    const dashEls = screen.getAllByText('—');
    expect(dashEls.length).toBeGreaterThan(0);
  });

  it('muestra el formato Carta por defecto: 8.5" × 11" (3×4)', async () => {
    await renderAndWait();
    expect(screen.getByText(/8\.5.*11.*3×4/i)).toBeInTheDocument();
  });

  it('cambia el formato a Zebra: 2" × 1" (Sticker) tras click', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    expect(screen.getByText(/2.*1.*sticker/i)).toBeInTheDocument();
  });

  it('botón "Vista Previa" NO se muestra sin selección', async () => {
    await renderAndWait();
    expect(screen.queryByRole('button', { name: /vista previa/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Áreas y filtros
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — áreas y filtros', () => {
  it('dropdown de áreas lista las áreas únicas ordenadas alfabéticamente', async () => {
    await renderAndWait();
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    // Filtra la opción "Todas las áreas" y las áreas reales.
    const areaOptions = options
      .map(o => o.value)
      .filter(v => v !== '' && v !== 'Todas las áreas');
    // Áreas únicas esperadas: UCI Adultos, Imagenología, UCI Pediátrica
    // (EQ_SIN_AREA tiene area=null → filter(Boolean) la excluye).
    expect(areaOptions).toEqual(['Imagenología', 'UCI Adultos', 'UCI Pediátrica']);
  });

  it('filtra el grid por área seleccionada', async () => {
    await renderAndWait();
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Imagenología' } });

    // Sólo EQ_RAYOS está en Imagenología.
    expect(screen.getByText('Equipo Rayos X Portátil')).toBeInTheDocument();
    expect(screen.queryByText('Ventilador Mindray SV300')).not.toBeInTheDocument();
    expect(screen.queryByText('Bomba de infusión')).not.toBeInTheDocument();
  });

  it('búsqueda por nombre (case-insensitive)', async () => {
    await renderAndWait();
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'ventilador' } });

    expect(screen.getByText('Ventilador Mindray SV300')).toBeInTheDocument();
    expect(screen.queryByText('Bomba de infusión')).not.toBeInTheDocument();
  });

  it('búsqueda por serie (case-insensitive)', async () => {
    await renderAndWait();
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'rx-200' } });

    expect(screen.getByText('Equipo Rayos X Portátil')).toBeInTheDocument();
    expect(screen.queryByText('Ventilador Mindray SV300')).not.toBeInTheDocument();
  });

  it('búsqueda por marca (case-insensitive)', async () => {
    await renderAndWait();
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'philips' } });

    expect(screen.getByText('Monitor de Signos Vitales')).toBeInTheDocument();
    expect(screen.queryByText('Ventilador Mindray SV300')).not.toBeInTheDocument();
  });

  it('botón X (clear search) sólo aparece cuando hay texto', async () => {
    await renderAndWait();
    // Sin búsqueda: no hay X button. El selector `.absolute.right-3 button`
    // busca un button DENTRO de un .absolute.right-3 — el X button tiene
    // .absolute.right-3 directamente, así que usamos `.absolute.right-3`
    // y filtramos por BUTTON tag. (ChevronDown también tiene .absolute.right-3
    // pero es SVG, no button.)
    const findXButton = () =>
      Array.from(document.querySelectorAll('.absolute.right-3'))
        .find((el) => el.tagName === 'BUTTON');

    expect(findXButton()).toBeUndefined();

    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'test' } });

    // Con búsqueda: aparece X.
    expect(findXButton()).toBeTruthy();

    // Click en X limpia la búsqueda.
    fireEvent.click(findXButton());
    expect(search.value).toBe('');
  });

  it('empty state cuando no hay matches', async () => {
    await renderAndWait();
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'xyz-no-existe' } });

    expect(screen.getByText(/no se encontraron equipos/i)).toBeInTheDocument();
    expect(screen.getByText(/para "xyz-no-existe"/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Selección de equipos
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — selección de equipos', () => {
  it('click en un equipo lo selecciona (clase purple ring)', async () => {
    await renderAndWait();
    // El equipo se renderiza como un div clickeable dentro del grid.
    const card = screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]');
    fireEvent.click(card);

    // Tras seleccionar: ring-1 ring-purple-500/20 en el card.
    expect(card.className).toContain('ring-purple-500');
  });

  it('segundo click en el mismo equipo lo deselecciona', async () => {
    await renderAndWait();
    const card = screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]');

    fireEvent.click(card);
    expect(card.className).toContain('ring-purple-500');

    fireEvent.click(card);
    expect(card.className).not.toContain('ring-purple-500');
  });

  it('botón Imprimir muestra el conteo actualizado tras seleccionar', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Bomba de infusión').closest('div[class*="cursor-pointer"]'));

    const btn = screen.getByRole('button', { name: /imprimir \d+ qr/i });
    expect(btn).toHaveTextContent(/imprimir 2 qr/i);
    expect(btn).not.toBeDisabled();
  });

  it('Stats bar refleja el conteo tras seleccionar 3 equipos', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Bomba de infusión').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Equipo Rayos X Portátil').closest('div[class*="cursor-pointer"]'));

    // "3" aparece en el stats bar (también podría aparecer en otras
    // partes, pero el stats bar es el contexto principal).
    const statsBar = screen.getByText(/seleccionados/i).closest('div').parentElement;
    expect(statsBar).toHaveTextContent('3');
  });

  it('selección persiste al cambiar el filtro de área', async () => {
    await renderAndWait();
    // Selecciona EQ_VENTILADOR (UCI Adultos).
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    // Cambia a Imagenología.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Imagenología' } });

    // EQ_VENTILADOR ya no es visible EN EL GRID de selección, pero la
    // selección persiste (count=1). Ojo: el equipo sigue renderizado en
    // las zonas print-only (qr-print-carta y qr-print-zebra), que sólo se
    // muestran al imprimir — hay que buscar específicamente en el grid.
    const gridContainer = document.querySelector('.grid-cols-2');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer.textContent).not.toContain('Ventilador Mindray SV300');

    const statsBar = screen.getByText(/seleccionados/i).closest('div').parentElement;
    expect(statsBar).toHaveTextContent('1');

    // Volvemos a "Todas las áreas" y EQ_VENTILADOR sigue seleccionado.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    // El equipo aparece en el grid + print zones. Buscamos en el grid
    // específicamente (el único con cursor-pointer).
    const matches = screen.getAllByText('Ventilador Mindray SV300');
    const card = matches.find((el) => el.closest('div[class*="cursor-pointer"]'));
    expect(card).toBeTruthy();
    expect(card.closest('div[class*="cursor-pointer"]').className).toContain('ring-purple-500');
  });

  it('botón "Limpiar todo" aparece sólo cuando hay selección', async () => {
    await renderAndWait();
    expect(screen.queryByRole('button', { name: /limpiar todo/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    expect(screen.getByRole('button', { name: /limpiar todo/i })).toBeInTheDocument();
  });

  it('click en "Limpiar todo" vacía la selección', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Bomba de infusión').closest('div[class*="cursor-pointer"]'));

    fireEvent.click(screen.getByRole('button', { name: /limpiar todo/i }));

    const btn = screen.getByRole('button', { name: /imprimir \d+ qr/i });
    expect(btn).toHaveTextContent(/imprimir 0 qr/i);
    expect(btn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Selección masiva (toggle / seleccionar visibles)
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — selección masiva', () => {
  it('"Seleccionar visibles (N)" selecciona todos los visibles', async () => {
    await renderAndWait();
    // Por defecto hay 6 equipos (descontando EQ_SIN_AREA que tiene area=null
    // pero igual entra al filtro). Verificamos que el botón existe.
    const btn = screen.getByRole('button', { name: /seleccionar visibles/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    // Imprimir debe mostrar 6.
    expect(screen.getByRole('button', { name: /imprimir \d+ qr/i })).toHaveTextContent(/imprimir 6 qr/i);
  });

  it('tras seleccionar todos, el botón cambia a "Deseleccionar visibles"', async () => {
    await renderAndWait();
    // Antes: el botón dice "Seleccionar visibles".
    const btnBefore = screen.getByRole('button', { name: /seleccionar visibles/i });
    expect(btnBefore).toBeInTheDocument();

    fireEvent.click(btnBefore);

    // El MISMO botón ahora dice "Deseleccionar visibles" (no se elimina,
    // sólo cambia el label + icono).
    expect(screen.getByRole('button', { name: /deseleccionar visibles/i })).toBeInTheDocument();
  });

  it('"Deseleccionar visibles" sólo quita los visibles (los ocultos permanecen)', async () => {
    await renderAndWait();
    // Selecciona todos los visibles (los 6).
    fireEvent.click(screen.getByRole('button', { name: /seleccionar visibles/i }));

    // Cambia el filtro a Imagenología: sólo EQ_RAYOS es visible.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Imagenología' } });

    // Click "Deseleccionar visibles" → sólo quita EQ_RAYOS.
    fireEvent.click(screen.getByRole('button', { name: /deseleccionar visibles/i }));

    // Volvemos a "Todas las áreas".
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    // Quedan 5 seleccionados (los de UCI Adultos + UCI Pediátrica).
    expect(screen.getByRole('button', { name: /imprimir \d+ qr/i })).toHaveTextContent(/imprimir 5 qr/i);
  });

  it('selección masiva + filtro: toggle funciona correctamente', async () => {
    await renderAndWait();
    // Filtra por UCI Adultos (3 equipos: VENTILADOR, BOMBA, EQ_SIN_TOKEN).
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'UCI Adultos' } });

    // Selecciona visibles.
    fireEvent.click(screen.getByRole('button', { name: /seleccionar visibles/i }));
    expect(screen.getByRole('button', { name: /imprimir \d+ qr/i })).toHaveTextContent(/imprimir 3 qr/i);

    // Toggle otra vez → deselecciona los visibles.
    fireEvent.click(screen.getByRole('button', { name: /deseleccionar visibles/i }));
    expect(screen.getByRole('button', { name: /imprimir \d+ qr/i })).toHaveTextContent(/imprimir 0 qr/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Páginas estimadas (carta vs zebra)
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — páginas estimadas', () => {
  it('modo carta: ceil(n/12)', async () => {
    await renderAndWait();
    // Selecciona 6 equipos (todos los visibles por defecto) → ceil(6/12) = 1.
    fireEvent.click(screen.getByRole('button', { name: /seleccionar visibles/i }));

    const paginas = screen.getByText(/páginas estimadas/i).closest('div');
    expect(paginas).toHaveTextContent('1');
  });

  it('modo zebra: n (1 sticker por página)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    fireEvent.click(screen.getByRole('button', { name: /seleccionar visibles/i }));

    const paginas = screen.getByText(/páginas estimadas/i).closest('div');
    expect(paginas).toHaveTextContent('6');
  });

  it('modo carta: ceil(13/12) = 2 (boundary)', async () => {
    // Crea 13 equipos para verificar el ceil.
    const equipos13 = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1, nombre: `EQ ${i + 1}`, serie: `S-${i + 1}`, marca: 'M',
      qr_token: `t${i + 1}`, area: 'X', piso: 1,
    }));
    await renderAndWait({ equipos: equipos13 });
    fireEvent.click(screen.getByRole('button', { name: /seleccionar visibles/i }));

    const paginas = screen.getByText(/páginas estimadas/i).closest('div');
    expect(paginas).toHaveTextContent('2');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Vista Previa
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — vista previa', () => {
  it('botón "Vista Previa" aparece tras seleccionar', async () => {
    await renderAndWait();
    expect(screen.queryByRole('button', { name: /vista previa/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    expect(screen.getByRole('button', { name: /vista previa/i })).toBeInTheDocument();
  });

  it('click en "Vista Previa" muestra el bloque de preview', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByRole('button', { name: /vista previa/i }));

    // El heading "Vista Previa de Etiqueta" aparece dentro del bloque.
    expect(screen.getByText(/vista previa de etiqueta/i)).toBeInTheDocument();
  });

  it('preview slice a 4 cards + "+N más..." cuando hay más de 4', async () => {
    // Crea 6 equipos y selecciona todos.
    const equipos6 = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1, nombre: `EQ ${i + 1}`, serie: `S-${i + 1}`, marca: 'M',
      qr_token: `t${i + 1}`, area: 'X', piso: 1,
    }));
    await renderAndWait({ equipos: equipos6 });
    fireEvent.click(screen.getByRole('button', { name: /seleccionar visibles/i }));
    fireEvent.click(screen.getByRole('button', { name: /vista previa/i }));

    // "+2 más..." (6 - 4 = 2).
    expect(screen.getByText(/\+2 más/i)).toBeInTheDocument();
  });

  it('click en "Ocultar" esconde el preview', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByRole('button', { name: /vista previa/i }));
    expect(screen.getByText(/vista previa de etiqueta/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ocultar/i }));
    expect(screen.queryByText(/vista previa de etiqueta/i)).not.toBeInTheDocument();
  });

  it('preview muestra labels QR según el modo activo (Carta vs Zebra)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByRole('button', { name: /vista previa/i }));

    // En modo carta: qr-label-carta.
    expect(document.querySelector('.qr-label-carta')).toBeInTheDocument();

    // Cambia a Zebra.
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    expect(document.querySelector('.qr-label-zebra')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Print logic
//
// NOTA sobre timing: `handlePrint` programa `window.print()` con setTimeout
// 100ms y cleanup con setTimeout 500ms. NO usamos vi.useFakeTimers() en estos
// tests porque waitFor() (usado en renderAndWait) reintenta vía setTimeout —
// con timers fakes congelados, waitFor se cuelga. Como los side effects que
// importan son SÍNCRONOS (toast.success, data-print-mode, zebra style), los
// verificamos inmediatamente después del click, antes de que el primer
// setTimeout se dispare.
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — handlePrint', () => {
  it('botón Imprimir está disabled cuando no hay selección (no se puede clickear)', async () => {
    await renderAndWait();
    const btn = screen.getByRole('button', { name: /imprimir 0 qr/i });
    expect(btn).toBeDisabled();
    // Sin selección nunca debe haberse llamado el toast.
    expect(mocks.mockToast.success).not.toHaveBeenCalled();
    expect(mocks.mockToast.error).not.toHaveBeenCalled();
  });

  it('click en Imprimir con selección → toast.success con count + páginas (carta)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Bomba de infusión').closest('div[class*="cursor-pointer"]'));

    const { spy, restore } = stubPrint();
    fireEvent.click(screen.getByRole('button', { name: /imprimir 2 qr/i }));

    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/preparando 2 etiquetas.*1 página/i),
    );
    // El setTimeout(100ms) llama window.print; con timers reales se ejecuta
    // antes de que termine el test, así que el spy ya fue llamado.
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    restore();
  });

  it('setea data-print-mode="carta" en <html> al imprimir en carta', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    const { restore } = stubPrint();
    fireEvent.click(screen.getByRole('button', { name: /imprimir 1 qr/i }));

    // Síncrono: el atributo se setea antes del setTimeout(100ms).
    expect(document.documentElement.getAttribute('data-print-mode')).toBe('carta');
    // Tras 100+500ms, el cleanup lo remueve.
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-print-mode')).toBeNull();
    });
    restore();
  });

  it('inyecta <style id="zebra-page-override"> en zebra mode y lo limpia tras print', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    const { restore } = stubPrint();
    fireEvent.click(screen.getByRole('button', { name: /imprimir 1 qr/i }));

    // Síncrono: data-print-mode y <style> inyectado.
    expect(document.documentElement.getAttribute('data-print-mode')).toBe('zebra');
    const styleEl = document.getElementById('zebra-page-override');
    expect(styleEl).toBeTruthy();
    expect(styleEl.textContent).toMatch(/@page\s*\{\s*size:\s*51mm\s+25mm/);

    // Tras cleanup (100+500ms), el style se remueve.
    await waitFor(() => {
      expect(document.getElementById('zebra-page-override')).toBeNull();
    });
    restore();
  });

  it('en carta NO inyecta el style zebra-page-override', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    const { restore } = stubPrint();
    fireEvent.click(screen.getByRole('button', { name: /imprimir 1 qr/i }));

    // En carta NO se inyecta el style zebra-page-override.
    expect(document.getElementById('zebra-page-override')).toBeNull();
    // data-print-mode sigue siendo 'carta'.
    expect(document.documentElement.getAttribute('data-print-mode')).toBe('carta');
    restore();
  });

  it('toast.success incluye páginas estimadas en zebra (count = pages)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Bomba de infusión').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Equipo Rayos X Portátil').closest('div[class*="cursor-pointer"]'));

    const { restore } = stubPrint();
    fireEvent.click(screen.getByRole('button', { name: /imprimir 3 qr/i }));

    // Zebra: 1 sticker por página → 3 etiquetas = 3 páginas.
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      expect.stringMatching(/preparando 3 etiquetas.*3 página/i),
    );
    restore();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Print-only zones (QRs renderizados)
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — print zones', () => {
  it('zona print-carta contiene un QRCodeSVG por cada equipo seleccionado', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Bomba de infusión').closest('div[class*="cursor-pointer"]'));

    const cartaZone = document.querySelector('.qr-print-carta');
    expect(cartaZone).toBeInTheDocument();
    // Las 2 etiquetas deben estar dentro de la zona carta.
    const qrsInCarta = cartaZone.querySelectorAll('[data-testid="qr-code-svg"]');
    expect(qrsInCarta).toHaveLength(2);
  });

  it('zona print-zebra contiene un QRCodeSVG por cada equipo seleccionado', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    const zebraZone = document.querySelector('.qr-print-zebra');
    expect(zebraZone).toBeInTheDocument();
    const qrsInZebra = zebraZone.querySelectorAll('[data-testid="qr-code-svg"]');
    expect(qrsInZebra).toHaveLength(1);
  });

  it('QR value usa qr_token cuando existe', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    const qr = document.querySelector('[data-testid="qr-code-svg"]');
    // Esperado: ${origin}/equipo/abc12345
    expect(qr.getAttribute('data-value')).toBe(`${window.location.origin}/equipo/abc12345`);
  });

  it('QR value cae a `serie` si qr_token es null', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Equipo sin qr_token').closest('div[class*="cursor-pointer"]'));

    const qr = document.querySelector('[data-testid="qr-code-svg"]');
    // EQ_SIN_TOKEN tiene qr_token=null → usa serie 'NOTOKEN-001'.
    expect(qr.getAttribute('data-value')).toBe(`${window.location.origin}/equipo/NOTOKEN-001`);
  });

  it('QR size es 110 en carta, 62 en zebra', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));

    // Modo carta por defecto.
    let qr = document.querySelector('.qr-print-carta [data-testid="qr-code-svg"]');
    expect(qr.getAttribute('data-size')).toBe('110');

    // Cambia a zebra.
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));
    qr = document.querySelector('.qr-print-zebra [data-testid="qr-code-svg"]');
    expect(qr.getAttribute('data-size')).toBe('62');
  });

  it('print zones se renderizan aunque no haya selección (vacías)', async () => {
    await renderAndWait();
    expect(document.querySelector('.qr-print-carta')).toBeInTheDocument();
    expect(document.querySelector('.qr-print-zebra')).toBeInTheDocument();
    // Sin selección → 0 QRs en cada zona.
    expect(document.querySelectorAll('.qr-print-carta [data-testid="qr-code-svg"]')).toHaveLength(0);
    expect(document.querySelectorAll('.qr-print-zebra [data-testid="qr-code-svg"]')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 11. Manejo de errores / shape tolerance
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — manejo de errores y shape tolerance', () => {
  it('toast.error cuando getEquipos rechaza', async () => {
    mocks.mockGetEquipos.mockRejectedValue(new Error('Network'));

    render(<QRBatch />);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar equipos');
    });
  });

  it('acepta shape `{equipos: [...]}` (objeto envuelto en array)', async () => {
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [EQ_VENTILADOR, EQ_BOMBA] });

    render(<QRBatch />);

    await waitFor(() => {
      expect(screen.getByText('Ventilador Mindray SV300')).toBeInTheDocument();
    });
    expect(screen.getByText('Bomba de infusión')).toBeInTheDocument();
  });

  it('shape `[...]` directo (array sin envolver): cae al fallback [] silenciosamente', async () => {
    // QRBatch hace `res.equipos || []` — un array directo no tiene propiedad
    // `.equipos`, así que se trata como lista vacía (sin crash). El componente
    // espera SIEMPRE shape `{equipos: [...]}` del backend.
    mocks.mockGetEquipos.mockResolvedValue([EQ_VENTILADOR]);

    render(<QRBatch />);

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    // Empty state, NO se renderiza el equipo.
    expect(screen.getByText(/no se encontraron equipos/i)).toBeInTheDocument();
    expect(screen.queryByText('Ventilador Mindray SV300')).not.toBeInTheDocument();
  });

  it('acepta respuesta `{equipos: []}` (array vacío)', async () => {
    mocks.mockGetEquipos.mockResolvedValue({ equipos: [] });

    render(<QRBatch />);

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
    // Empty state: "No se encontraron equipos" (sin sufijo de búsqueda).
    expect(screen.getByText(/no se encontraron equipos/i)).toBeInTheDocument();
  });

  it('pasa `{ limit: 500 }` como params al API', async () => {
    await renderAndWait();
    expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 500 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 12. Hygiene (no warnings)
// ─────────────────────────────────────────────────────────────────────────
describe('QRBatch — hygiene', () => {
  it('no emite warnings de React ni de act() durante la carga exitosa', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await renderAndWait();

    const realWarnings = warnSpy.mock.calls.filter(
      (args) =>
        !args.some(
          (a) => typeof a === 'string' && /v7_startTransition|v7_relativeSplatPath/.test(a),
        ),
    );
    expect(realWarnings).toEqual([]);
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('no emite warnings durante el flujo de selección + print', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await renderAndWait();
    fireEvent.click(screen.getByText('Ventilador Mindray SV300').closest('div[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByRole('button', { name: /^zebra$/i }));

    const { restore } = stubPrint();
    fireEvent.click(screen.getByRole('button', { name: /imprimir \d+ qr/i }));
    // Espera al cleanup real (~700ms) para capturar warnings durante el ciclo
    // completo. Sin fake timers para no contaminar tests siguientes.
    await waitFor(() => {
      expect(document.getElementById('zebra-page-override')).toBeNull();
    });

    const realWarnings = warnSpy.mock.calls.filter(
      (args) =>
        !args.some(
          (a) => typeof a === 'string' && /v7_startTransition|v7_relativeSplatPath/.test(a),
        ),
    );
    expect(realWarnings).toEqual([]);
    errSpy.mockRestore();
    warnSpy.mockRestore();
    restore();
  });
});
