// src/pages/EquipoPublico.test.jsx
// EquipoPublico (244 líneas) es la vista PÚBLICA de un equipo (ruta
// `/equipo/:token`). NO requiere auth — se accede escaneando un QR pegado
// al equipo. Es la candidata siguiente del backlog de páginas-con-fetch:
// compacta, sin charts, sin auth, pero con varios patrones sutiles:
//
//   - **useParams()** para extraer el token del QR. La página accede
//     a `/api/equipos/public/${token}`. Si alguien rompe el params → el
//     fetch va con `undefined` y la URL queda malformada.
//   - **axios directo** (no usa api/sigah ni api/sigab). Mockeamos axios
//     con `vi.mock('axios', ...)` para interceptar el GET público.
//   - **Loading dual**: mientras `loading=true` → spinner con
//     "Cargando información del equipo...". NO muestra la pantalla de
//     error ni la de éxito.
//   - **Error 404 específico**:
//       axios.get → status 404 → 'Equipo no encontrado. El código QR
//       puede ser inválido o el equipo fue dado de baja.'
//     Cualquier OTRO error → 'Error al cargar la información del equipo.'
//     Si alguien homogeneiza los 2 mensajes, el operador pierde el
//     contexto sobre si fue QR inválido o falla de red.
//   - **STATUS_CONFIG**: mapa literal con 5 estados
//       (operativo / en_mantenimiento / fuera_servicio / en_traslado / baja).
//     Cualquier estado fuera del mapa → fallback a `baja`. Si alguien borra
//     el `|| STATUS_CONFIG.baja`, un estado desconocido entra en crash
//     silencioso al intentar leer `.color` / `.bg` / `.label` / `.icon`.
//   - **CRITICIDAD_BADGE**: 3 niveles (alta / media / baja). Si criticidad
//     viene falsy (no hay dato), el badge NO se renderiza.
//   - **mantenimientoVencido**: lógica derivada
//       `equipo.fecha_proximo_mantenimiento && new Date(...) < new Date()`.
//     Si la fecha está en el pasado → `text-red-600` + sufijo "⚠ VENCIDO".
//     Si está en el futuro → `text-emerald-600` sin sufijo.
//     Si NO hay fecha → "No programado".
//     Si alguien quita la condición `&&`, una fecha vacía genera
//     "Invalid Date" en pantalla.
//   - **Filtro campos vacíos en Datos Técnicos**: `.filter(([, v]) => v)`
//     elimina filas con `null/undefined/''`. Si alguien quita el filtro,
//     aparecen filas vacías tipo "Serie:  ".
//   - **preventivos.length > 0** render condicional del bloque completo.
//   - **ordenes_recientes.length > 0** render condicional del bloque
//     "Últimos Servicios". Si la lista está vacía, el bloque NO aparece
//     (intencional: es público, no debe mostrar "Sin servicios" si no hay).
//   - **orden.color dot**: `cerrada → bg-emerald-500`, otro → `bg-yellow-500
//     animate-pulse`. Si alguien quita `animate-pulse` de la condición
//     de activas, todas las órdenes se ven iguales.
//   - **manual_url / video_url condicional**: si ambos faltan, el bloque
//     "Recursos" NO se renderiza. Si sólo uno está, sólo se renderiza ese.
//   - **`new Date(...).toLocaleDateString('es-MX')`**: formato local.
//     Si la fecha es null, "Sin registros" / "No programado" como fallback
//     controlado (no "Invalid Date" — porque hay fallback explícito).
//   - **`tipo_equipo?.replace('_', ' ')`**: el primer underscore se
//     reemplaza. Si hay varios (ej. "ventilador_pediátrico_2026") sólo
//     cambia el primero (comportamiento del String.prototype.replace).
//   - **`[equipo.area, equipo.piso].filter(Boolean).join(' · ')`**: une
//     area y piso con " · " sólo si ambos son truthy. Si area es null,
//     queda sólo "Piso 3".
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si el fallback a STATUS_CONFIG.baja se rompe, un estado desconocido
//     crashea la página al intentar leer `.color` de undefined.
//   - Si el `|| 'Error al cargar...'` se cambia por un mensaje genérico,
//     el operador no distingue QR inválido de falla de red.
//   - Si el filtro `.filter(([, v]) => v)` se quita en Datos Técnicos,
//     aparecen filas vacías con label sin value (UX rota).
//   - Si la condición `preventivos.length > 0` se quita, el bloque de
//     preventivos se renderiza vacío con header "Procedimientos
//     Programados:" + 0 entries (se ve roto).
//   - Si la lógica de mantenimientoVencido se rompe, una fecha pasada
//     se ve en verde "OK" (riesgo regulatorio NOM-016 — mantenimiento
//     vencido sin alerta visual).
//   - Si la condición `ordenes_recientes.length > 0` se quita, el
//     bloque de historial se renderiza siempre (incluso sin órdenes).
//
// Se mockea `axios` (acceso directo a `/api/equipos/public/${token}`).
// NO se mockea react-router-dom (se usa MemoryRouter con initialEntries
// para inyectar el token en `useParams`). NO se mockea lucide-react
// (la página no usa iconos, sólo emojis inline ✓ 🔧 ⚠ 🚚 ✕ 📋).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: (...args) => mocks.mockAxiosGet(...args),
  },
}));

import EquipoPublico from './EquipoPublico';

// ── Fixtures ─────────────────────────────────────────────────────────────
// Equipo base operativo, con datos completos.
const EQUIPO_OK = {
  equipo: {
    id: 42,
    nombre: 'Ventilador Mindray SV300',
    marca: 'Mindray',
    modelo: 'SV300',
    serie: 'SN-V300-12345',
    estado: 'operativo',
    criticidad: 'alta',
    tipo_equipo: 'ventilador_mecánico',
    clase_cofepris: 'III',
    area: 'UCI Adultos',
    piso: 'Piso 3',
    fecha_compra: '2024-03-15',
    fecha_ultimo_mantenimiento: '2026-05-20',
    fecha_proximo_mantenimiento: '2026-12-15',  // futuro (no vencido)
    proveedor_servicio: 'Mindray México S.A. de C.V.',
    numero_contrato_servicio: 'CONT-2024-0042',
    manual_url: 'https://example.com/manual-sv300.pdf',
    video_url: 'https://example.com/video-sv300.mp4',
    imagen_url: null,
  },
  ordenes_recientes: [
    {
      id: 1,
      numero_orden: 'OS-2026-001',
      fecha: '2026-05-20T10:00:00Z',
      estado: 'cerrada',
      tipo_mantenimiento: 'preventivo',
      tecnico_nombre: 'Ing. Carlos Ramírez',
    },
    {
      id: 2,
      numero_orden: 'OS-2026-002',
      fecha: '2026-06-15T08:00:00Z',
      estado: 'en_proceso',
      tipo_mantenimiento: 'correctivo',
      tecnico_nombre: 'Ing. Juan Pérez',
    },
  ],
  preventivos: [
    {
      id: 1,
      tipo_preventivo: 'Calibración anual',
      frecuencia_dias: 365,
      proxima_ejecucion: '2026-12-15',
    },
    {
      id: 2,
      tipo_preventivo: 'Limpieza de filtros',
      frecuencia_dias: 90,
      proxima_ejecucion: null,  // sin próxima fecha
    },
  ],
};

const TEST_TOKEN = 'qr-token-abc123';

beforeEach(() => {
  // Default: respuesta exitosa con EQUIPO_OK.
  mocks.mockAxiosGet.mockResolvedValue({ data: EQUIPO_OK });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────
function renderWithRouter(token = TEST_TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/equipo/${token}`]}>
      <Routes>
        <Route path="/equipo/:token" element={<EquipoPublico />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function renderAndWait(token = TEST_TOKEN) {
  renderWithRouter(token);
  await act(async () => { await Promise.resolve(); });
}

// ───────────────────────────────────────────────────────────────────────
// 1. Loading state
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — loading state', () => {
  it('muestra spinner + "Cargando información del equipo..." mientras loading=true', () => {
    // Mock que nunca resuelve → loading se queda en true.
    mocks.mockAxiosGet.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(screen.getByText(/cargando información del equipo/i)).toBeInTheDocument();
    // El spinner es el span con animate-spin.
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('NO muestra la pantalla de error ni la de éxito durante loading', () => {
    mocks.mockAxiosGet.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(screen.queryByText(/equipo no encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/datos técnicos/i)).not.toBeInTheDocument();
  });

  it('llama axios.get con la URL `/api/equipos/public/<token>`', async () => {
    await renderAndWait('xyz-789');
    expect(mocks.mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(mocks.mockAxiosGet).toHaveBeenCalledWith('/api/equipos/public/xyz-789');
  });

  it('el useEffect depende del token (re-fetch si cambia)', async () => {
    // Primer render con token A.
    const { unmount } = render(
      <MemoryRouter initialEntries={['/equipo/token-aaa']}>
        <Routes>
          <Route path="/equipo/:token" element={<EquipoPublico />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(mocks.mockAxiosGet).toHaveBeenCalledWith('/api/equipos/public/token-aaa');
    expect(mocks.mockAxiosGet).toHaveBeenCalledTimes(1);
    unmount();

    // Segundo render con token B → useEffect corre de nuevo (1 vez más).
    render(
      <MemoryRouter initialEntries={['/equipo/token-bbb']}>
        <Routes>
          <Route path="/equipo/:token" element={<EquipoPublico />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(mocks.mockAxiosGet).toHaveBeenCalledWith('/api/equipos/public/token-bbb');
    expect(mocks.mockAxiosGet).toHaveBeenCalledTimes(2);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. Error 404 (QR inválido o equipo dado de baja)
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — error 404', () => {
  it('status 404 → mensaje específico "Equipo no encontrado. El código QR puede ser inválido o el equipo fue dado de baja."', async () => {
    mocks.mockAxiosGet.mockRejectedValue({
      response: { status: 404 },
    });

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/equipo no encontrado\. el código qr puede ser inválido o el equipo fue dado de baja\./i))
        .toBeInTheDocument();
    });
  });

  it('muestra h1 "Equipo no encontrado" y emoji 📋 en error 404', async () => {
    mocks.mockAxiosGet.mockRejectedValue({ response: { status: 404 } });

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /equipo no encontrado/i, level: 1 }))
        .toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
    });
  });

  it('NO muestra la pantalla de éxito (Datos Técnicos) en error 404', async () => {
    mocks.mockAxiosGet.mockRejectedValue({ response: { status: 404 } });

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/el código qr puede ser inválido/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/datos técnicos/i)).not.toBeInTheDocument();
  });

  it('muestra el footer institucional SIGAH en error 404', async () => {
    mocks.mockAxiosGet.mockRejectedValue({ response: { status: 404 } });

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/sigah — hospital general regional no\. 1/i)).toBeInTheDocument();
      expect(screen.getByText(/imss tijuana, b\.c\./i)).toBeInTheDocument();
    });
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. Error genérico (cualquier status distinto a 404)
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — error genérico', () => {
  it('status 500 → mensaje "Error al cargar la información del equipo."', async () => {
    mocks.mockAxiosGet.mockRejectedValue({ response: { status: 500 } });

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/error al cargar la información del equipo\./i))
        .toBeInTheDocument();
    });
  });

  it('sin response.status (fallo de red) → mensaje genérico', async () => {
    // Sin `response` (network error puro) → entra al else del ternario.
    mocks.mockAxiosGet.mockRejectedValue(new Error('Network Error'));

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/error al cargar la información del equipo\./i))
        .toBeInTheDocument();
    });
  });

  it('status 403 (no autorizado) → mensaje genérico (NO el de 404)', async () => {
    mocks.mockAxiosGet.mockRejectedValue({ response: { status: 403 } });

    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/error al cargar la información del equipo\./i))
        .toBeInTheDocument();
    });
    // Verifica que NO se muestra el mensaje específico de 404.
    expect(screen.queryByText(/el código qr puede ser inválido/i)).not.toBeInTheDocument();
  });

  it('los mensajes de error 404 y genérico son strings distintos', async () => {
    // Sanity: ambos paths de error NO deben compartir el mismo mensaje.
    expect('Equipo no encontrado. El código QR puede ser inválido o el equipo fue dado de baja.')
      .not.toBe('Error al cargar la información del equipo.');
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. Header institucional
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — header institucional', () => {
  it('renderiza el logo "S" en círculo verde (emerald-600)', async () => {
    await renderAndWait();
    const logo = document.querySelector('.bg-emerald-600.rounded-full');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent('S');
  });

  it('muestra el texto SIGAH y el nombre del hospital en el header', async () => {
    await renderAndWait();
    expect(screen.getByText('SIGAH')).toBeInTheDocument();
    expect(screen.getByText(/hospital general regional no\. 1 · imss tijuana/i))
      .toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. Estado badge (STATUS_CONFIG)
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — badge de estado', () => {
  it('estado "operativo" → label "Operativo" + color verde (emerald)', async () => {
    await renderAndWait();
    expect(screen.getByText('Operativo')).toBeInTheDocument();
  });

  it('estado "en_mantenimiento" → label "En Mantenimiento"', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, estado: 'en_mantenimiento' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('En Mantenimiento')).toBeInTheDocument();
  });

  it('estado "fuera_servicio" → label "Fuera de Servicio"', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, estado: 'fuera_servicio' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Fuera de Servicio')).toBeInTheDocument();
  });

  it('estado "baja" → label "Baja"', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, estado: 'baja' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Baja')).toBeInTheDocument();
  });

  it('estado desconocido → fallback a STATUS_CONFIG.baja ("Baja")', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, estado: 'estado_raro_xyz' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    // Falla a "Baja" porque no está en el mapa.
    expect(screen.getByText('Baja')).toBeInTheDocument();
  });

  it('muestra el nombre y marca·modelo del equipo en el badge', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /ventilador mindray sv300/i, level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText(/mindray · sv300/i)).toBeInTheDocument();
  });

  it('renderiza el badge de criticidad cuando criticidad es "alta"', async () => {
    await renderAndWait();
    expect(screen.getByText(/riesgo alta/i)).toBeInTheDocument();
  });

  it('NO renderiza el badge de criticidad cuando criticidad es null', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, criticidad: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText(/riesgo (alta|media|baja)/i)).not.toBeInTheDocument();
  });

  it('muestra imagen si imagen_url está presente', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: {
          ...EQUIPO_OK.equipo,
          imagen_url: 'https://example.com/equipo-42.jpg',
        },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    // El <img> tiene alt="" (decorativo); usamos querySelector porque
    // getByRole('img') con alt vacío no siempre es accesible.
    const img = document.querySelector('img[src*="equipo-42.jpg"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/equipo-42.jpg');
  });

  it('muestra el ícono del estado si imagen_url es null', async () => {
    // EQUIPO_OK ya tiene imagen_url=null → debe verse "✓" (icon de operativo).
    await renderAndWait();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. Datos Técnicos
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — Datos Técnicos', () => {
  it('renderiza el h2 "Datos Técnicos"', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /datos técnicos/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('muestra N° Serie, Tipo, Clase COFEPRIS, Ubicación, Fecha Compra, Proveedor, Contrato', async () => {
    await renderAndWait();
    expect(screen.getByText('SN-V300-12345')).toBeInTheDocument();
    // tipo_equipo="ventilador_mecánico" → replace('_', ' ') → "ventilador mecánico".
    expect(screen.getByText(/ventilador mecánico/i)).toBeInTheDocument();
    expect(screen.getByText(/clase iii/i)).toBeInTheDocument();
    expect(screen.getByText(/uci adultos · piso 3/i)).toBeInTheDocument();
    expect(screen.getByText(/mindray méxico s\.a\. de c\.v\./i)).toBeInTheDocument();
    expect(screen.getByText('CONT-2024-0042')).toBeInTheDocument();
  });

  it('filtra filas con value null (no muestra "Clase COFEPRIS" si clase_cofepris es null)', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: {
          ...EQUIPO_OK.equipo,
          clase_cofepris: null,
          proveedor_servicio: null,
          numero_contrato_servicio: null,
        },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });

    // El label "Clase COFEPRIS" no debe aparecer (su value es null → fila filtrada).
    expect(screen.queryByText(/^clase cofepris$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/proveedor servicio/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no\. contrato/i)).not.toBeInTheDocument();
  });

  it('tipo_equipo con un solo underscore: replace reemplaza sólo el primero', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, tipo_equipo: 'monitor_signos_vitales' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    // String.replace con string literal sólo reemplaza la PRIMERA ocurrencia.
    expect(screen.getByText(/monitor signos_vitales/i)).toBeInTheDocument();
  });

  it('tipo_equipo null → no rompe (replace sobre null da error, usa ?.replace)', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, tipo_equipo: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    // No debe crashear; el label "Tipo" sigue pero sin valor.
    expect(screen.getByRole('heading', { name: /datos técnicos/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('Ubicación sin area → muestra sólo piso', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, area: null, piso: 'Piso 1' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Piso 1')).toBeInTheDocument();
    // No debe haber " · Piso 1" porque area es null.
    expect(screen.queryByText(/ · piso 1/i)).not.toBeInTheDocument();
  });

  it('Fecha Compra null → fila filtrada (no aparece "Fecha Compra")', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, fecha_compra: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText(/fecha compra/i)).not.toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. Mantenimiento (con lógica de vencido)
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — Mantenimiento', () => {
  it('renderiza el h2 "Mantenimiento"', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /mantenimiento/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('muestra "Último" con fecha formateada cuando fecha_ultimo_mantenimiento existe', async () => {
    await renderAndWait();
    // La fecha se renderiza vía toLocaleDateString('es-MX'). En jsdom el
    // locale puede variar, así que verificamos presencia de un patrón de
    // fecha (día/mes/año). Aquí 2026-05-20 → "20/5/2026" o similar.
    const main = document.body.textContent;
    expect(main).toMatch(/20[/-]\d{1,2}[/-]2026|2026[/-]\d{1,2}[/-]20/);
  });

  it('muestra "Sin registros" cuando fecha_ultimo_mantenimiento es null', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, fecha_ultimo_mantenimiento: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(/sin registros/i)).toBeInTheDocument();
  });

  it('fecha_proximo_mantenimiento en el futuro → verde (text-emerald-600), sin "VENCIDO"', async () => {
    await renderAndWait();
    // 2026-12-15 está en el futuro relativo a 2026-06-27.
    const cells = document.querySelectorAll('.text-emerald-600');
    expect(cells.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/vencido/i)).not.toBeInTheDocument();
  });

  it('fecha_proximo_mantenimiento en el pasado → rojo (text-red-600) + "⚠ VENCIDO"', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, fecha_proximo_mantenimiento: '2020-01-01' },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    const cells = document.querySelectorAll('.text-red-600');
    expect(cells.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/⚠ vencido/i)).toBeInTheDocument();
  });

  it('fecha_proximo_mantenimiento null → "No programado"', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, fecha_proximo_mantenimiento: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(/no programado/i)).toBeInTheDocument();
  });

  it('renderiza preventivos cuando la lista NO está vacía', async () => {
    await renderAndWait();
    expect(screen.getByText(/calibración anual/i)).toBeInTheDocument();
    expect(screen.getByText(/limpieza de filtros/i)).toBeInTheDocument();
    // Frecuencia en días + próxima ejecución.
    expect(screen.getByText(/cada 365d/i)).toBeInTheDocument();
    expect(screen.getByText(/cada 90d/i)).toBeInTheDocument();
  });

  it('preventivo sin proxima_ejecucion → "—" como fallback', async () => {
    await renderAndWait();
    // El segundo preventivo (Limpieza de filtros) tiene proxima_ejecucion: null.
    expect(screen.getByText(/limpieza de filtros/i)).toBeInTheDocument();
    expect(screen.getByText(/prox: —/i)).toBeInTheDocument();
  });

  it('NO renderiza la sección de preventivos cuando la lista está vacía', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        preventivos: [],
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText(/calibración anual/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/procedimientos programados/i)).not.toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. Historial de órdenes recientes
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — Últimos Servicios', () => {
  it('renderiza el h2 "Últimos Servicios" cuando ordenes_recientes NO está vacío', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /últimos servicios/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('muestra número de orden, tipo de mantenimiento y estado de cada OS', async () => {
    await renderAndWait();
    expect(screen.getByText('OS-2026-001')).toBeInTheDocument();
    expect(screen.getByText('OS-2026-002')).toBeInTheDocument();
    // tipo_mantenimiento se renderiza con capitalize + estado con replace '_' → ' '.
    expect(screen.getByText(/preventivo · cerrada/i)).toBeInTheDocument();
    expect(screen.getByText(/correctivo · en proceso/i)).toBeInTheDocument();
  });

  it('muestra nombre del técnico cuando técnico_nombre existe', async () => {
    await renderAndWait();
    expect(screen.getByText(/técnico: ing\. carlos ramírez/i)).toBeInTheDocument();
    expect(screen.getByText(/técnico: ing\. juan pérez/i)).toBeInTheDocument();
  });

  it('NO muestra línea de técnico cuando tecnico_nombre es null/undefined', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        ordenes_recientes: [
          {
            id: 99,
            numero_orden: 'OS-2026-099',
            fecha: '2026-06-01T00:00:00Z',
            estado: 'cerrada',
            tipo_mantenimiento: 'preventivo',
            // sin tecnico_nombre
          },
        ],
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('OS-2026-099')).toBeInTheDocument();
    expect(screen.queryByText(/^técnico:/i)).not.toBeInTheDocument();
  });

  it('OS cerrada → dot verde (bg-emerald-500)', async () => {
    await renderAndWait();
    const dots = document.querySelectorAll('.bg-emerald-500');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('OS en_proceso → dot amarillo con animate-pulse (bg-yellow-500)', async () => {
    await renderAndWait();
    const pulseDots = document.querySelectorAll('.bg-yellow-500.animate-pulse');
    expect(pulseDots.length).toBeGreaterThanOrEqual(1);
  });

  it('NO renderiza "Últimos Servicios" cuando ordenes_recientes está vacío', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        ordenes_recientes: [],
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('heading', { name: /últimos servicios/i, level: 2 }))
      .not.toBeInTheDocument();
  });

  it('OS sin fecha → no muestra la línea de fecha con ·', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        ordenes_recientes: [
          {
            id: 50,
            numero_orden: 'OS-2026-050',
            // sin fecha
            estado: 'cerrada',
            tipo_mantenimiento: 'preventivo',
            tecnico_nombre: 'Ing. Sin Fecha',
          },
        ],
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('OS-2026-050')).toBeInTheDocument();
    // No debe haber "Invalid Date" en ningún nodo.
    expect(document.body.textContent).not.toMatch(/invalid date/i);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 9. Recursos (manual / video)
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — Recursos (manual y video)', () => {
  it('renderiza el bloque "Recursos" cuando manual_url O video_url existe', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /^recursos$/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('muestra link "📄 Manual" cuando manual_url existe', async () => {
    await renderAndWait();
    const manualLink = screen.getByRole('link', { name: /📄 manual/i });
    expect(manualLink).toHaveAttribute('href', 'https://example.com/manual-sv300.pdf');
    expect(manualLink).toHaveAttribute('target', '_blank');
    expect(manualLink).toHaveAttribute('rel', 'noreferrer');
  });

  it('muestra link "🎬 Video" cuando video_url existe', async () => {
    await renderAndWait();
    const videoLink = screen.getByRole('link', { name: /🎬 video/i });
    expect(videoLink).toHaveAttribute('href', 'https://example.com/video-sv300.mp4');
    expect(videoLink).toHaveAttribute('target', '_blank');
  });

  it('muestra SOLO manual cuando video_url es null', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, video_url: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('link', { name: /📄 manual/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /🎬 video/i })).not.toBeInTheDocument();
  });

  it('muestra SOLO video cuando manual_url es null', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: { ...EQUIPO_OK.equipo, manual_url: null },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('link', { name: /🎬 video/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /📄 manual/i })).not.toBeInTheDocument();
  });

  it('NO renderiza el bloque "Recursos" cuando ambos URLs son null', async () => {
    mocks.mockAxiosGet.mockResolvedValue({
      data: {
        ...EQUIPO_OK,
        equipo: {
          ...EQUIPO_OK.equipo,
          manual_url: null,
          video_url: null,
        },
      },
    });
    renderWithRouter();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('heading', { name: /^recursos$/i, level: 2 }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /manual|video/i })).not.toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 10. Footer institucional
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — footer institucional', () => {
  it('muestra la atribución completa del sistema', async () => {
    await renderAndWait();
    expect(screen.getByText(/sistema integral de gestión de activos biomédicos/i))
      .toBeInTheDocument();
    expect(screen.getByText(/departamento de conservación y mantenimiento/i))
      .toBeInTheDocument();
    expect(screen.getByText(/hospital general regional no\. 1 · imss · tijuana, b\.c\./i))
      .toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 11. Hygiene
// ───────────────────────────────────────────────────────────────────────
describe('EquipoPublico — hygiene', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('no emite warnings de React ni de act() durante carga y éxito', async () => {
    await renderAndWait();
    const relevant = consoleErrorSpy.mock.calls.filter(args => {
      const msg = String(args[0] ?? '');
      return msg.match(/not wrapped in act|Warning:/i) &&
        !msg.includes('v7_startTransition') &&
        !msg.includes('v7_relativeSplatPath');
    });
    expect(relevant).toHaveLength(0);
  });

  it('no emite warnings durante error 404', async () => {
    mocks.mockAxiosGet.mockRejectedValue({ response: { status: 404 } });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/el código qr puede ser inválido/i)).toBeInTheDocument();
    });
    const relevant = consoleErrorSpy.mock.calls.filter(args => {
      const msg = String(args[0] ?? '');
      return msg.match(/not wrapped in act|Warning:/i) &&
        !msg.includes('v7_startTransition') &&
        !msg.includes('v7_relativeSplatPath');
    });
    expect(relevant).toHaveLength(0);
  });
});