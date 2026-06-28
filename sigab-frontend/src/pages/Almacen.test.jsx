// src/pages/Almacen.test.jsx
// Almacén de Refacciones (392 líneas) — gestión de stock técnico con
// KPIs, búsqueda, filtros, tabla y dos modales (Nueva Refacción / Ajustar
// Stock). Concentra varios patrones sutiles:
//
//   - **Carga inicial con `api.getAlmacen(params)`** en try/catch/finally.
//     `params` se construye en cada llamada: `{ busqueda, stock_bajo }`.
//     Si alguien borra el `setLoading(false)` del finally, el spinner se
//     queda eternamente aunque el backend devuelva 500.
//   - **`useEffect` re-corre `cargar()` cuando cambia `filterStockBajo`**:
//     el toggle de "Stock Bajo" filtra server-side (`stock_bajo: 'true'`).
//     La búsqueda NO está en el effect — sólo se aplica al dar Enter o
//     click en "Buscar" (decisión de UX para no spamear el backend).
//   - **`data.refacciones || []`** con fallback. Tolera `{refacciones: [...]}`.
//     Si la respuesta es `null` o `{}`, fallback a `[]` (sin crash).
//   - **KPIs derivados**:
//       * "Items en Inventario" = `refacciones.length`.
//       * "Stock Crítico" = `filter(r => r.cantidad_disponible <= r.cantidad_minima).length`.
//       * "Valor Estimado Pool" = literal "Premium" (placeholder, no se calcula todavía).
//     Si alguien cambia el `<=` por `<`, items donde stock == mínimo
//     desaparecen del KPI crítico (semánticamente erróneo: stock == mínimo
//     ya es crítico).
//   - **Estado "CRÍTICO" vs "ÓPTIMO"** en cada fila: deriva del mismo
//     `isLow`. Si alguien cambia `<=` por `<`, items con stock == mínimo
//     muestran "ÓPTIMO" en la tabla pero cuentan en el KPI (inconsistencia).
//   - **Fila vacía**: "Sin proveedor" si `item.proveedor` es null/undefined,
//     "—" si `item.ubicacion_almacen` es null/undefined.
//   - **`ajustando` / `modalNueva` son estados separados** que renderizan
//     los modales condicionalmente. Si se renderiza `AjustarStockModal`
//     sin un `item`, el componente crashea en `item.cantidad_disponible`.
//   - **Validación de Nueva Refacción**:
//       * `nombre.trim() === ''` o `nombre.length < 3` → `toast.error`
//         "El nombre debe tener al menos 3 caracteres" (NO se llama al API).
//       * éxito → `toast.success('Refacción agregada al inventario')`
//         + `onSaved()` (cierra modal + recarga).
//   - **Validación de Ajustar Stock**:
//       * `cantidad < 1` → `toast.error('La cantidad debe ser al menos 1')`.
//       * `tipo === 'salida' && cantidad > item.cantidad_disponible` →
//         `toast.error('Stock insuficiente para la salida')` (NO se llama al API).
//       * éxito → toast con `+N` o `-N` según tipo + `onSaved()`.
//   - **Tipos de movimiento**: 'entrada' (suma) vs 'salida' (resta). El
//     toast message usa `tipo === 'entrada' ? '+' : '-'`. Si alguien
//     invierte la condición, el toast muestra el signo equivocado.
//   - **Botón "Smart Predicción"** → toast placeholder con icono 🧠
//     (declaración de feature pendiente — wired a SIGAH Copilot).
//   - **`onSaved` recarga**: `onSaved = () => { setModalNueva(false); cargar(); }`
//     para Nueva, `onSaved = () => { setAjustando(null); cargar(); }` para
//     Ajuste. Garantiza que la tabla refleja el cambio tras cerrar el modal.
//   - **Búsqueda case-sensitive NO**: el backend decide (no se transforma).
//     El frontend sólo pasa `busqueda` como query param literal.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si el `setLoading(false)` del finally se borra, loading infinito.
//   - Si el `<=` se cambia por `<`, "Stock Crítico" subcuenta (muestra N-1).
//   - Si el guard de stock insuficiente se quita, salidas de stock sin
//     inventario se procesan (la API puede aceptarlas o rechazar — UX
//     inconsistente).
//   - Si el `onSaved` no recarga, la tabla no refleja la nueva refacción
//     hasta el próximo refresh manual.
//   - Si el fallback `|| '—'` de ubicación se quita, ubicaciones null
//     se renderizan vacías (ok) pero `null` literal nunca aparece (también
//     ok — pero pierde el em-dash como placeholder visual).
//   - Si el toast del Smart Predicción se borra, el botón no hace nada
//     visible y el operador no sabe que está pendiente.
//
// Se mockea: `../api/sigah` (getAlmacen, crearRefaccion, ajustarStock),
// `../lib/toast` (sileo no es jsdom-safe). NO se mockea `lucide-react`
// (los iconos funcionan en jsdom sin cambios). NO se usa MemoryRouter (la
// página no usa react-router).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const toastFn = vi.fn();
  return {
    mockGetAlmacen:    vi.fn(),
    mockCrearRefaccion: vi.fn(),
    mockAjustarStock:   vi.fn(),
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
    getAlmacen:     (...a) => mocks.mockGetAlmacen(...a),
    crearRefaccion: (...a) => mocks.mockCrearRefaccion(...a),
    ajustarStock:   (...a) => mocks.mockAjustarStock(...a),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import Almacen from './Almacen';

// ── Fixtures ─────────────────────────────────────────────────────────────
const REF_OPTIMO = {
  id: 1,
  nombre: 'Filtro HEPA Draeger',
  codigo_interno: 'REF-001',
  proveedor: 'Draeger Medical',
  cantidad_disponible: 10,
  cantidad_minima: 2,
  compatible_con_modelo: 'Ventilador Oxylog 3000',
  ubicacion_almacen: 'Estante A-3',
};
const REF_CRITICO = {
  id: 2,
  nombre: 'Sensor de Flujo',
  codigo_interno: 'REF-002',
  proveedor: 'Mindray',
  cantidad_disponible: 1,
  cantidad_minima: 3,
  compatible_con_modelo: 'Bomba de infusión',
  ubicacion_almacen: 'Estante B-1',
};
const REF_UMBRAL = {
  // cantidad_disponible == cantidad_minima: es crítico por la regla <=
  id: 3,
  nombre: 'Batería de Respaldo',
  codigo_interno: 'REF-003',
  proveedor: 'Philips',
  cantidad_disponible: 2,
  cantidad_minima: 2,
  compatible_con_modelo: 'Monitor IntelliVue',
  ubicacion_almacen: 'Estante C-2',
};
const REF_SIN_PROVEEDOR = {
  id: 4,
  nombre: 'Cable de Paciente',
  codigo_interno: 'REF-004',
  proveedor: null,
  cantidad_disponible: 5,
  cantidad_minima: 1,
  compatible_con_modelo: 'Monitor Genérico',
  ubicacion_almacen: null, // → '—'
};

function setupApi({ refacciones = [REF_OPTIMO, REF_CRITICO, REF_UMBRAL, REF_SIN_PROVEEDOR] } = {}) {
  mocks.mockGetAlmacen.mockResolvedValue({ refacciones });
}

async function renderAndWait(opts = {}) {
  setupApi(opts);
  render(<Almacen />);
  // Espera a que el loading desaparezca: "Cargando almacén..." ya no
  // debería estar en el DOM.
  await waitFor(() => {
    expect(screen.queryByText(/cargando almacén/i)).not.toBeInTheDocument();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Loading state
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — loading state', () => {
  it('muestra "Cargando almacén..." mientras la promesa no resuelve', () => {
    mocks.mockGetAlmacen.mockReturnValue(new Promise(() => {})); // never resolves

    render(<Almacen />);

    expect(screen.getByText(/cargando almacén/i)).toBeInTheDocument();
  });

  it('oculta el loading tras resolución exitosa de getAlmacen', async () => {
    await renderAndWait();
    expect(screen.queryByText(/cargando almacén/i)).not.toBeInTheDocument();
  });

  it('oculta el loading incluso si getAlmacen rechaza (finally con setLoading(false))', async () => {
    mocks.mockGetAlmacen.mockRejectedValue(new Error('Network'));

    render(<Almacen />);

    await waitFor(() => {
      expect(screen.queryByText(/cargando almacén/i)).not.toBeInTheDocument();
    });
    // Y debe haber mostrado el toast.error
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar almacén');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Header
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — header', () => {
  it('renderiza el h1 "Almacén de Refacciones"', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /almacén de refacciones/i })).toBeInTheDocument();
  });

  it('muestra el subtítulo descriptivo', async () => {
    await renderAndWait();
    expect(screen.getByText(/gestión de stock técnico/i)).toBeInTheDocument();
  });

  it('renderiza el botón "Nueva Refacción"', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: /nueva refacción/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. KPIs
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — KPIs globales', () => {
  it('"Items en Inventario" muestra el length de refacciones', async () => {
    await renderAndWait();
    // El label aparece + el valor. Buscamos el bloque del KPI.
    const kpi = screen.getByText(/items en inventario/i).closest('div');
    expect(kpi).toHaveTextContent('4');
  });

  it('"Items en Inventario" muestra 0 cuando la lista está vacía', async () => {
    await renderAndWait({ refacciones: [] });
    const kpi = screen.getByText(/items en inventario/i).closest('div');
    expect(kpi).toHaveTextContent('0');
  });

  it('"Stock Crítico" cuenta items con cantidad_disponible <= cantidad_minima', async () => {
    // REF_CRITICO (1 <= 3) y REF_UMBRAL (2 <= 2) son críticos → 2.
    await renderAndWait();
    const kpi = screen.getByText(/stock crítico/i).closest('div');
    expect(kpi).toHaveTextContent('2');
  });

  it('"Stock Crítico" usa <= (no <): stock == mínimo ES crítico', async () => {
    // Si alguien cambia `<=` por `<`, REF_UMBRAL deja de contar → 1.
    await renderAndWait();
    const kpi = screen.getByText(/stock crítico/i).closest('div');
    // Verifica explícitamente que REF_UMBRAL (2 == 2) cuenta.
    expect(kpi).toHaveTextContent('2');
  });

  it('"Stock Crítico" muestra 0 cuando todos los items están sobre el mínimo', async () => {
    await renderAndWait({ refacciones: [REF_OPTIMO] });
    const kpi = screen.getByText(/stock crítico/i).closest('div');
    expect(kpi).toHaveTextContent('0');
  });

  it('"Valor Estimado Pool" muestra literal "Premium" (placeholder)', async () => {
    await renderAndWait();
    const kpi = screen.getByText(/valor estimado pool/i).closest('div');
    expect(kpi).toHaveTextContent(/premium/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Búsqueda
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — búsqueda', () => {
  it('renderiza input de búsqueda con placeholder correcto', async () => {
    await renderAndWait();
    expect(screen.getByPlaceholderText(/buscar por nombre, código o compatibilidad/i)).toBeInTheDocument();
  });

  it('búsqueda NO recarga el API mientras se tipea (sólo al Enter)', async () => {
    await renderAndWait();
    expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(1);

    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'filtro' } });

    // Tras cambiar el input, NO se ha llamado al API todavía.
    expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(1);

    // Al presionar Enter, SÍ recarga con `busqueda`.
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetAlmacen).toHaveBeenLastCalledWith({ busqueda: 'filtro' });
  });

  it('botón "Buscar" recarga el API con la búsqueda actual', async () => {
    await renderAndWait();
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'sensor' } });

    fireEvent.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetAlmacen).toHaveBeenLastCalledWith({ busqueda: 'sensor' });
  });

  it('botón "Buscar" sin búsqueda pasa `{}` (sin params)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^buscar$/i }));

    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetAlmacen).toHaveBeenLastCalledWith({});
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Filtro "Stock Bajo"
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — filtro Stock Bajo', () => {
  it('toggle "Stock Bajo" recarga el API con `stock_bajo: "true"`', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^stock bajo$/i }));

    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetAlmacen).toHaveBeenLastCalledWith({ stock_bajo: 'true' });
  });

  it('toggle "Stock Bajo" dos veces deja el filtro apagado', async () => {
    await renderAndWait();
    const btn = screen.getByRole('button', { name: /^stock bajo$/i });

    fireEvent.click(btn); // on
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(btn); // off
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(3);
    });
    expect(mocks.mockGetAlmacen).toHaveBeenLastCalledWith({});
  });

  it('búsqueda + filtro se combinan en params', async () => {
    await renderAndWait();
    // Activa stock_bajo.
    fireEvent.click(screen.getByRole('button', { name: /^stock bajo$/i }));
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });

    // Tipea búsqueda y presiona Enter.
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'sensor' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(3);
    });
    expect(mocks.mockGetAlmacen).toHaveBeenLastCalledWith({
      busqueda: 'sensor',
      stock_bajo: 'true',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Tabla de refacciones
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — tabla de refacciones', () => {
  it('muestra una fila por refacción con nombre + proveedor', async () => {
    await renderAndWait();
    expect(screen.getByText('Filtro HEPA Draeger')).toBeInTheDocument();
    expect(screen.getByText('Draeger Medical')).toBeInTheDocument();
    expect(screen.getByText('Sensor de Flujo')).toBeInTheDocument();
  });

  it('muestra "Sin proveedor" cuando `proveedor` es null', async () => {
    await renderAndWait();
    const fila = screen.getByText('Cable de Paciente').closest('tr');
    expect(fila).toHaveTextContent(/sin proveedor/i);
  });

  it('muestra "—" cuando `ubicacion_almacen` es null', async () => {
    await renderAndWait();
    const fila = screen.getByText('Cable de Paciente').closest('tr');
    expect(fila).toHaveTextContent('—');
  });

  it('muestra ubicación cuando existe', async () => {
    await renderAndWait();
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    expect(fila).toHaveTextContent('Estante A-3');
  });

  it('renderiza los 7 headers de columna', async () => {
    await renderAndWait();
    const headers = ['Refacción', 'Código', 'Compatible con', 'Stock', 'Ubicación', 'Estado', 'Acciones'];
    headers.forEach((h) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(`^${h}$`, 'i') })).toBeInTheDocument();
    });
  });

  it('muestra "CRÍTICO" para items con cantidad_disponible <= cantidad_minima', async () => {
    await renderAndWait();
    // REF_CRITICO y REF_UMBRAL → "CRÍTICO".
    const filaCritico = screen.getByText('Sensor de Flujo').closest('tr');
    expect(filaCritico).toHaveTextContent(/crítico/i);

    const filaUmbral = screen.getByText('Batería de Respaldo').closest('tr');
    expect(filaUmbral).toHaveTextContent(/crítico/i);
  });

  it('muestra "ÓPTIMO" para items sobre el mínimo', async () => {
    await renderAndWait();
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    expect(fila).toHaveTextContent(/óptimo/i);
  });

  it('muestra cantidad_disponible + "mín: {cantidad_minima}" en columna Stock', async () => {
    await renderAndWait();
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    // cantidad_disponible=10, cantidad_minima=2.
    expect(fila).toHaveTextContent('10');
    expect(fila).toHaveTextContent(/mín:\s*2/i);
  });

  it('botón "Ajustar" aparece en cada fila', async () => {
    await renderAndWait();
    const ajustarBtns = screen.getAllByRole('button', { name: /^ajustar$/i });
    expect(ajustarBtns).toHaveLength(4);
  });

  it('empty state: "No se encontraron refacciones." cuando la lista está vacía', async () => {
    await renderAndWait({ refacciones: [] });
    expect(screen.getByText(/no se encontraron refacciones/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Modal: Nueva Refacción
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — modal Nueva Refacción', () => {
  it('click en "Nueva Refacción" abre el modal', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));
    expect(screen.getByRole('heading', { name: /nueva refacción/i })).toBeInTheDocument();
  });

  it('modal muestra los 7 inputs (nombre, código, proveedor, stock inicial, stock mínimo, ubicación, compatible con)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));

    expect(screen.getByPlaceholderText(/filtro hepa draeger/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ref-001/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/proveedor s\.a\. de c\.v\./i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/estante a-3/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/modelo o familia de equipos/i)).toBeInTheDocument();
  });

  it('submit con nombre vacío (< 3 chars) → toast.error y NO llama al API', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));

    const nombreInput = screen.getByPlaceholderText(/filtro hepa draeger/i);
    fireEvent.change(nombreInput, { target: { value: 'ab' } });

    // Submit via Enter on form.
    fireEvent.submit(nombreInput.closest('form'));

    expect(mocks.mockToast.error).toHaveBeenCalledWith('El nombre debe tener al menos 3 caracteres');
    expect(mocks.mockCrearRefaccion).not.toHaveBeenCalled();
  });

  it('submit con nombre válido llama al API con shape correcto', async () => {
    mocks.mockCrearRefaccion.mockResolvedValue({ id: 99, nombre: 'Nueva pieza' });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));

    fireEvent.change(screen.getByPlaceholderText(/filtro hepa draeger/i), { target: { value: 'Válvula de presión' } });
    fireEvent.change(screen.getByPlaceholderText(/ref-001/i), { target: { value: 'REF-100' } });
    fireEvent.change(screen.getByPlaceholderText(/proveedor s\.a\. de c\.v\./i), { target: { value: 'Hamilton Medical' } });
    fireEvent.change(screen.getByPlaceholderText(/estante a-3/i), { target: { value: 'Estante D-4' } });
    fireEvent.change(screen.getByPlaceholderText(/modelo o familia de equipos/i), { target: { value: 'Ventilador C1' } });
    // Stock inicial y mínimo: number inputs, valores por defecto 0 y 1.
    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '5' } });
    fireEvent.change(numberInputs[1], { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /guardar refacción/i }));

    await waitFor(() => {
      expect(mocks.mockCrearRefaccion).toHaveBeenCalledTimes(1);
    });
    expect(mocks.mockCrearRefaccion).toHaveBeenCalledWith({
      nombre: 'Válvula de presión',
      codigo_interno: 'REF-100',
      compatible_con_modelo: 'Ventilador C1',
      cantidad_disponible: 5,
      cantidad_minima: 2,
      ubicacion_almacen: 'Estante D-4',
      proveedor: 'Hamilton Medical',
    });
    expect(mocks.mockToast.success).toHaveBeenCalledWith('Refacción agregada al inventario');
  });

  it('submit exitoso cierra el modal y recarga el API', async () => {
    mocks.mockCrearRefaccion.mockResolvedValue({ id: 99 });
    await renderAndWait();
    expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));
    fireEvent.change(screen.getByPlaceholderText(/filtro hepa draeger/i), { target: { value: 'Válvula de presión' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar refacción/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /nueva refacción/i })).not.toBeInTheDocument();
    });
    // Tras cerrar, se recarga el inventario.
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });
  });

  it('submit con error del API → toast.error con detail del backend', async () => {
    mocks.mockCrearRefaccion.mockRejectedValue({
      response: { data: { detail: 'Código interno duplicado' } },
    });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));
    fireEvent.change(screen.getByPlaceholderText(/filtro hepa draeger/i), { target: { value: 'Pieza Test' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar refacción/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Código interno duplicado');
    });
  });

  it('submit con error genérico → toast.error con mensaje por defecto', async () => {
    mocks.mockCrearRefaccion.mockRejectedValue(new Error('Network'));
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));
    fireEvent.change(screen.getByPlaceholderText(/filtro hepa draeger/i), { target: { value: 'Pieza Test' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar refacción/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al crear refacción');
    });
  });

  it('click en Cancelar cierra el modal sin llamar al API', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));
    expect(screen.getByRole('heading', { name: /nueva refacción/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(screen.queryByRole('heading', { name: /nueva refacción/i })).not.toBeInTheDocument();
    expect(mocks.mockCrearRefaccion).not.toHaveBeenCalled();
  });

  it('botón X (esquina superior derecha) cierra el modal', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));

    // El X es un botón sin texto, hermano del heading.
    const heading = screen.getByRole('heading', { name: /nueva refacción/i });
    const closeBtn = heading.parentElement.querySelector('button');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('heading', { name: /nueva refacción/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Modal: Ajustar Stock
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — modal Ajustar Stock', () => {
  it('click en "Ajustar" abre el modal con el item', async () => {
    await renderAndWait();
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    expect(screen.getByRole('heading', { name: /ajustar stock/i })).toBeInTheDocument();
    // El modal muestra el nombre + stock actual del item.
    const modal = screen.getByRole('heading', { name: /ajustar stock/i }).closest('div').parentElement;
    expect(modal).toHaveTextContent('Filtro HEPA Draeger');
    expect(modal).toHaveTextContent('10'); // cantidad_disponible
  });

  it('modal de ajuste tiene botones de "Entrada" y "Salida"', async () => {
    await renderAndWait();
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    expect(screen.getByRole('button', { name: /\+ entrada/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /- salida/i })).toBeInTheDocument();
  });

  it('entrada por defecto → toast muestra "+N unidades" tras éxito', async () => {
    mocks.mockAjustarStock.mockResolvedValue({});
    await renderAndWait();

    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mocks.mockAjustarStock).toHaveBeenCalledWith(1, { cantidad: 5, tipo: 'entrada' });
    });
    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalledWith('Stock ajustado: +5 unidades');
    });
  });

  it('click en "Salida" → toast muestra "-N unidades" tras éxito', async () => {
    mocks.mockAjustarStock.mockResolvedValue({});
    await renderAndWait();

    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    fireEvent.click(screen.getByRole('button', { name: /- salida/i }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mocks.mockAjustarStock).toHaveBeenCalledWith(1, { cantidad: 3, tipo: 'salida' });
    });
    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalledWith('Stock ajustado: -3 unidades');
    });
  });

  it('salida con cantidad > stock disponible → toast "Stock insuficiente" y NO llama al API', async () => {
    await renderAndWait();
    // REF_OPTIMO tiene cantidad_disponible=10.
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    fireEvent.click(screen.getByRole('button', { name: /- salida/i }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(mocks.mockToast.error).toHaveBeenCalledWith('Stock insuficiente para la salida');
    expect(mocks.mockAjustarStock).not.toHaveBeenCalled();
  });

  it('submit exitoso cierra el modal y recarga el API', async () => {
    mocks.mockAjustarStock.mockResolvedValue({});
    await renderAndWait();
    expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(1);

    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /ajustar stock/i })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });
  });

  it('error del API en ajuste → toast.error con detail', async () => {
    mocks.mockAjustarStock.mockRejectedValue({
      response: { data: { detail: 'Refacción no encontrada' } },
    });
    await renderAndWait();

    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Refacción no encontrada');
    });
  });

  it('Cancelar cierra el modal sin llamar al API', async () => {
    await renderAndWait();
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));

    expect(screen.getByRole('heading', { name: /ajustar stock/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByRole('heading', { name: /ajustar stock/i })).not.toBeInTheDocument();
    expect(mocks.mockAjustarStock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Smart Predicción (placeholder)
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — Smart Predicción (placeholder)', () => {
  it('botón Smart Predicción → toast placeholder con icono 🧠', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /smart predicción/i }));

    expect(mocks.mockToast).toHaveBeenCalledWith(
      'Predicción IA de consumo — próximamente conectada a SIGAH Copilot',
      { icon: '🧠' },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Manejo de errores y shape tolerance
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — manejo de errores y shape tolerance', () => {
  it('toast.error cuando getAlmacen rechaza', async () => {
    mocks.mockGetAlmacen.mockRejectedValue(new Error('Network'));

    render(<Almacen />);

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar almacén');
    });
  });

  it('acepta shape `{refacciones: [...]}`', async () => {
    mocks.mockGetAlmacen.mockResolvedValue({ refacciones: [REF_OPTIMO, REF_CRITICO] });

    render(<Almacen />);

    await waitFor(() => {
      expect(screen.getByText('Filtro HEPA Draeger')).toBeInTheDocument();
    });
    expect(screen.getByText('Sensor de Flujo')).toBeInTheDocument();
  });

  it('acepta respuesta `{refacciones: []}` (array vacío) sin crash', async () => {
    mocks.mockGetAlmacen.mockResolvedValue({ refacciones: [] });

    render(<Almacen />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron refacciones/i)).toBeInTheDocument();
    });
  });

  it('acepta respuesta `{}` (sin refacciones) sin crash → fallback a []', async () => {
    mocks.mockGetAlmacen.mockResolvedValue({});

    render(<Almacen />);

    await waitFor(() => {
      expect(screen.queryByText(/cargando almacén/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/no se encontraron refacciones/i)).toBeInTheDocument();
  });

  it('pasa `{}` como params en la carga inicial', async () => {
    await renderAndWait();
    expect(mocks.mockGetAlmacen).toHaveBeenCalledWith({});
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 11. Hygiene (no warnings)
// ─────────────────────────────────────────────────────────────────────────
describe('Almacén — hygiene', () => {
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

  it('no emite warnings durante el flujo de búsqueda + apertura de modales', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await renderAndWait();

    // Búsqueda.
    const search = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(search, { target: { value: 'filtro' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => {
      expect(mocks.mockGetAlmacen).toHaveBeenCalledTimes(2);
    });

    // Abrir modal Nueva.
    fireEvent.click(screen.getByRole('button', { name: /nueva refacción/i }));
    expect(screen.getByRole('heading', { name: /nueva refacción/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    // Abrir modal Ajustar.
    const fila = screen.getByText('Filtro HEPA Draeger').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: /^ajustar$/i }));
    expect(screen.getByRole('heading', { name: /ajustar stock/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

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
});

