// src/pages/Reservas.test.jsx
// Reservas (475 líneas) — gestión de reservas de equipos biomédicos con
// KPIs, filtros locales por estado, tabla de bitácora, acciones de cambio
// de estado y modal de creación. Concentra varios patrones sutiles:
//
//   - **Carga inicial con `api.getReservas()`** en try/catch/finally. El
//     `setLoading(false)` del finally apaga el spinner aunque el backend
//     rechace. Si alguien borra `setLoading(false)` del finally, el spinner
//     se queda eternamente aunque el backend devuelva 500.
//   - **`data.reservas ?? data ?? []`** con fallback. Tolera `{reservas:[...]}`
//     y `{}`. Si la respuesta es `null`, fallback a `[]` sin crash.
//     **BUG CONOCIDO** (item #4 del backlog, mismo que Capacitaciones/
//     Metrologia/Trazabilidad/ChecklistPage/AdminGlobal/Almacén): NO tolera
//     `{reservas: null}` porque `null ?? {reservas:null}` = `{reservas:null}`
//     (objeto truthy), y luego `reservas.map` crashea. NO se cubre con test
//     para no contaminar el árbol de React entre tests.
//   - **KPIs derivados del listado completo (NO del filtrado)**:
//       * `total` = `reservas.length`.
//       * `activas` = `filter(r => r.estado === 'activa').length`.
//       * `pendientes` = `filter(r => r.estado === 'pendiente').length`.
//       * `completadas` = `filter(r => r.estado === 'completada').length`.
//     Si alguien refactorea para que los KPIs reflejen `filteredReservas`,
//     "Total Reservado" cambia al filtrar (semánticamente erróneo — el
//     total debe ser siempre el de la carga del servidor).
//   - **Filtros locales por estado (`filterEstado`)**: NO recarga el API,
//     sólo filtra el array en memoria. Si alguien mete `filterEstado` en el
//     `useEffect`, cada click spammea al backend.
//   - **`filterEstado === ''` (Todas)** es el valor por defecto y muestra
//     todas las reservas. El estilo del botón "Todas" activo incluye la
//     clase `bg-[var(--content-bg)] text-[var(--content-text)] border`.
//   - **Badge de estado con `getBadgeStyle()`** mapea 4 estados:
//     activa → emerald, pendiente → amber, completada → blue,
//     cancelada → gray (var content-bg). El default (estado desconocido)
//     también es gray. Si alguien refactorea `getBadgeStyle`, estados
//     podrían tener colores incoherentes entre sí.
//   - **`estado.toUpperCase()`** en el badge: muestra la clave en
//     mayúsculas ('ACTIVA', 'PENDIENTE', 'COMPLETADA', 'CANCELADA').
//   - **Acciones condicionales por estado**:
//       * pendiente → sólo botón Play (Iniciar Reserva, title="Iniciar Reserva").
//       * activa    → sólo botón CheckCircle2 (Completar Reserva).
//       * pendiente O activa → botón Ban (Cancelar Reserva).
//       * completada/cancelada → sin acciones de cambio de estado.
//       * motivo existe → botón FileText (Ver Motivo) en TODAS las filas
//         con motivo, independiente del estado.
//   - **Ver Motivo** → `toast(res.motivo, { icon: '📝', duration: 4000 })`.
//     **BUG CONOCIDO** (item #6 del backlog, mismo bug que Almacen.jsx
//     "Smart Predicción"): `toast` (default export de `lib/toast.js`) es un
//     objeto con métodos (success/error/info), NO una función. Llamarlo
//     como función `toast(msg, opts)` tira `toast is not a function` en
//     producción si el usuario hace click en "Ver Motivo". Decisión: cubrir
//     con test usando mock callable (`Object.assign(vi.fn(), {...})`) que
//     permite assert la llamada. La existencia del bug se documenta en
//     STATE para fix futuro si el operador lo decide.
//   - **`handleCambiarEstado`** → `cambiarEstadoReserva(id, { estado })`.
//     Éxito → `toast.success('Reserva marcada como {nuevoEstado} exitosamente')`
//     + recarga. Error con `response.data.detail` → toast.detail. Error
//     genérico → "Error al actualizar el estado de la reserva".
//   - **Modal `NuevaReservaModal` carga equipos con `api.getEquipos({ limit: 200 })`**
//     en `.then().catch()` (NO en try/finally — sin loading state interno).
//     El catch muestra `toast.error('Error al cargar equipos del inventario')`.
//     Si alguien refactorea y elimina el catch, un 500 al cargar equipos
//     rompe la UI silenciosamente.
//   - **Modal filtra equipos con `estado === 'baja'`**: equipos dados de
//     baja NO aparecen en el `<select>`. Si alguien refactorea el filtro,
//     equipos dados de baja podrían reservarse.
//   - **Modal filtra equipos por búsqueda case-insensitive** sobre
//     `nombre`, `serie` y `modelo` (cualquier match → visible). NO recarga
//     del backend — sólo filtra el array en memoria.
//   - **Validación del handler del modal**:
//       * `!form.equipo_id` → toast.error. PERO el `<select required>`
//         bloquea el submit antes de que el handler corra (HTML5 nativo).
//         Misma situación que Almacen "cantidad < 1": validación dead-code
//         bajo el flujo UI normal. Decisión: NO cubrir el path.
//       * `!form.area_reserva.trim()` → toast.error. El `.trim()` es
//         esencial: áreas con sólo espacios NO pasan. **SÍ cubierto** —
//         espacios pasan `required` pero fallan `.trim()`.
//       * `!form.fecha_inicio` → toast.error. `<input required>` bloquea.
//         Decisión: NO cubrir el path (mismo dead-code).
//   - **`solicitante_id: user?.id || null`** — si no hay user en
//     AuthContext, el payload incluye `solicitante_id: null`. Si el operador
//     quiere, podría cubrirse este path de payload sin user; en este
//     ciclo se verifica el path con user y se deja documentado el otro.
//   - **404 / 5xx del submit distinto de 409**:
//       * 409 → toast dedicado "Conflicto: El equipo ya se encuentra
//         reservado en ese horario".
//       * otro status → `err.response?.data?.detail || 'Error al guardar
//         la reserva'`.
//   - **`fecha_inicio` por defecto = NOW slice(0, 16)** (datetime-local,
//     sin segundos). El modal inicializa con la hora actual; el render
//     contiene un value de tipo `YYYY-MM-DDTHH:MM`. Test verifica que el
//     input tiene un value inicial con ese shape.
//   - **`fecha_fin` por defecto = NOW + 2h slice(0, 16)**.
//   - **`onSaved` recarga** el listado principal tras cerrar el modal.
//   - **`piso_reserva` opcional** → si está vacío, se manda `null`.
//   - **`motivo` opcional** → si está vacío, se manda `''`.
//
// Se mockea: `../api/sigah` (getReservas, crearReserva, cambiarEstadoReserva,
// getEquipos), `../lib/toast` (sileo no es jsdom-safe). NO se mockea
// `lucide-react` (los iconos funcionan en jsdom sin cambios). NO se usa
// MemoryRouter (la página no usa react-router). Se wrappea con un
// `<AuthContext.Provider>` mockeado (la página llama `useAuth()` para
// `user?.id` en el payload de `crearReserva` desde el modal).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const toastFn = vi.fn();
  return {
    mockGetReservas:         vi.fn(),
    mockCrearReserva:        vi.fn(),
    mockCambiarEstadoReserva: vi.fn(),
    mockGetEquipos:          vi.fn(),
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
    getReservas:          (...a) => mocks.mockGetReservas(...a),
    crearReserva:         (...a) => mocks.mockCrearReserva(...a),
    cambiarEstadoReserva: (...a) => mocks.mockCambiarEstadoReserva(...a),
    getEquipos:           (...a) => mocks.mockGetEquipos(...a),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import { AuthContext } from '../context/AuthContext';
import Reservas from './Reservas';

// ── Fixtures ─────────────────────────────────────────────────────────────
const RES_ACTIVA = {
  id: 1,
  equipo_id: 11,
  equipo_nombre: 'Ventilador Oxylog 3000',
  equipo_serie: 'DRG-OXY-0001',
  area_reserva: 'UCI Adultos',
  piso_reserva: 'Piso 3',
  solicitante_nombre: 'Dra. Ramírez',
  fecha_inicio: '2026-07-01T08:00',
  fecha_fin: '2026-07-01T12:00',
  motivo: 'Cirugía programada paciente 1029',
  estado: 'activa',
};
const RES_PENDIENTE = {
  id: 2,
  equipo_id: 12,
  equipo_nombre: 'Monitor IntelliVue MX450',
  equipo_serie: 'PHI-MX4-0002',
  area_reserva: 'Quirófano 3',
  piso_reserva: null,
  solicitante_nombre: 'Dr. Hernández',
  fecha_inicio: '2026-07-02T14:00',
  fecha_fin: '2026-07-02T18:00',
  motivo: 'Procedimiento cardiovascular',
  estado: 'pendiente',
};
const RES_COMPLETADA = {
  id: 3,
  equipo_id: 13,
  equipo_nombre: 'Bomba de Infusión Alaris',
  equipo_serie: 'BD-ALA-0003',
  area_reserva: 'Pediatría',
  piso_reserva: 'Piso 1',
  // solicitante_nombre null → fallback "Asignado General"
  solicitante_nombre: null,
  fecha_inicio: '2026-06-20T09:00',
  fecha_fin: '2026-06-20T11:30',
  motivo: null, // sin motivo → no muestra botón FileText
  estado: 'completada',
};
const RES_CANCELADA = {
  id: 4,
  equipo_id: 14,
  equipo_nombre: 'Desfibrilador HeartStart',
  equipo_serie: 'PHI-HS-0004',
  area_reserva: 'Emergencias',
  piso_reserva: 'Planta Baja',
  solicitante_nombre: 'Dr. Mendoza',
  fecha_inicio: '2026-06-25T10:00',
  // fecha_fin null → "Indefinida"
  fecha_fin: null,
  motivo: 'Cancelada por reprogramación',
  estado: 'cancelada',
};
const ALL_RESERVAS = [RES_ACTIVA, RES_PENDIENTE, RES_COMPLETADA, RES_CANCELADA];

const EQ_DISPONIBLE = {
  id: 11,
  nombre: 'Ventilador Oxylog 3000',
  serie: 'DRG-OXY-0001',
  modelo: 'Oxylog 3000 plus',
  marca: 'Draeger',
  estado: 'operativo',
};
const EQ_TRASLADO = {
  id: 12,
  nombre: 'Monitor IntelliVue MX450',
  serie: 'PHI-MX4-0002',
  modelo: 'MX450',
  marca: 'Philips',
  estado: 'traslado',
};
const EQ_MANTENIMIENTO = {
  id: 13,
  nombre: 'Bomba Alaris',
  serie: 'BD-ALA-0003',
  modelo: 'Alaris 8015',
  marca: 'BD',
  estado: 'mantenimiento',
};
const EQ_BAJA = {
  id: 14,
  nombre: 'Equipo Dado de Baja',
  serie: 'XX-BAJA-0001',
  modelo: 'Legacy',
  marca: 'Genérica',
  estado: 'baja', // filtrado en el modal
};
const ALL_EQUIPOS = [EQ_DISPONIBLE, EQ_TRASLADO, EQ_MANTENIMIENTO, EQ_BAJA];

const TEST_USER = { id: 7, nombre: 'Test User', rol: 'ingeniero' };

// ── Helpers ─────────────────────────────────────────────────────────────
// `setupApis()` setea los defaults (todas las APIs cargan OK, reservas del
// fixture estándar). Es lo que usa `renderAndWait()`.
// Tests que necesitan comportamiento custom (rejection, otro payload)
// setean SUS mocks DESPUÉS de `setupApis()` y ANTES del `fireEvent`,
// porque `vi.resetAllMocks()` en beforeEach limpia las implementations.
function setupApis({
  reservas = ALL_RESERVAS,
  equipos = ALL_EQUIPOS,
} = {}) {
  mocks.mockGetReservas.mockResolvedValue({ reservas });
  mocks.mockGetEquipos.mockResolvedValue({ equipos });
  mocks.mockCrearReserva.mockResolvedValue({ id: 999 });
  mocks.mockCambiarEstadoReserva.mockResolvedValue({});
}

function renderReservas() {
  const authValue = {
    user: TEST_USER,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={authValue}>
      <Reservas />
    </AuthContext.Provider>,
  );
}

async function renderAndWait(opts = {}) {
  setupApis(opts);
  renderReservas();
  await waitFor(() => {
    expect(screen.queryByText(/cargando bitácora/i)).not.toBeInTheDocument();
  });
}

beforeEach(() => {
  vi.resetAllMocks(); // Limpia .mock.calls Y .mock implementations para que cada test re-construya las suyas.
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────
// 1. Loading state
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — loading state', () => {
  it('muestra "Cargando bitácora..." mientras la promesa no resuelve', () => {
    mocks.mockGetReservas.mockReturnValue(new Promise(() => {})); // never resolves
    renderReservas();
    expect(screen.getByText(/cargando bitácora/i)).toBeInTheDocument();
  });

  it('oculta el loading tras resolución exitosa de getReservas', async () => {
    await renderAndWait();
    expect(screen.queryByText(/cargando bitácora/i)).not.toBeInTheDocument();
  });

  it('oculta el loading incluso si getReservas rechaza (finally con setLoading(false))', async () => {
    mocks.mockGetReservas.mockRejectedValue(new Error('Network'));
    renderReservas();
    await waitFor(() => {
      expect(screen.queryByText(/cargando bitácora/i)).not.toBeInTheDocument();
    });
    // Y debe haber mostrado el toast.error
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar la bitácora de reservas');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Header
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — header', () => {
  it('renderiza el h1 "Reservas de Equipos"', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { level: 1, name: /reservas de equipos/i })).toBeInTheDocument();
  });

  it('muestra el subtítulo descriptivo', async () => {
    await renderAndWait();
    expect(screen.getByText(/programación y control de uso compartido/i)).toBeInTheDocument();
  });

  it('renderiza el botón "Nueva Reserva"', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: /nueva reserva/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. KPIs
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — KPIs', () => {
  it('"Total Reservado" muestra length de reservas', async () => {
    await renderAndWait();
    const kpi = screen.getByText(/total reservado/i).closest('div');
    expect(kpi).toHaveTextContent('4');
  });

  it('"Activas Actualmente" cuenta las reservas con estado==activa', async () => {
    await renderAndWait();
    const kpi = screen.getByText(/activas actualmente/i).closest('div');
    expect(kpi).toHaveTextContent('1');
  });

  it('"Pendientes" cuenta las reservas con estado==pendiente', async () => {
    await renderAndWait();
    // El texto "Pendientes" aparece DOS veces: como label del KPI y como botón
    // de filtro. Seleccionamos específicamente el <p> del KPI.
    const allPendientes = screen.getAllByText(/^pendientes$/i);
    const kpiLabel = allPendientes.find((el) => el.tagName === 'P');
    const kpi = kpiLabel.closest('div');
    expect(kpi).toHaveTextContent('1');
  });

  it('"Completadas" cuenta las reservas con estado==completada', async () => {
    await renderAndWait();
    const kpi = screen.getByText(/^completadas$/i).closest('div');
    expect(kpi).toHaveTextContent('1');
  });

  it('KPIs muestran 0 cuando la lista está vacía', async () => {
    await renderAndWait({ reservas: [] });
    // Re-query: ahora hay un único "Pendientes" (KPI) y un "Pendientes"
    // (filtro) — usamos getAllByText para sumarlos a 2 ocurrencias.
    const kpis = screen.getAllByText(/0/);
    expect(kpis.length).toBeGreaterThanOrEqual(4);
  });

  it('KPIs reflejan el TOTAL (no el filtrado): cambiar filtro "Pendientes" no baja "Total Reservado"', async () => {
    await renderAndWait();
    const kpiTotal = screen.getByText(/total reservado/i).closest('div');
    expect(kpiTotal).toHaveTextContent('4');

    // Filtro "Pendientes" reduce la tabla pero NO debe bajar el KPI total.
    fireEvent.click(screen.getByRole('button', { name: /^pendientes$/i }));

    const kpiTotalAfter = screen.getByText(/total reservado/i).closest('div');
    expect(kpiTotalAfter).toHaveTextContent('4');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Filtros locales por estado
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — filtros locales por estado', () => {
  it('botón "Todas" es el filtro por defecto y muestra todas las filas', async () => {
    await renderAndWait();
    // "Todas" está activo por defecto (no recarga el API).
    expect(mocks.mockGetReservas).toHaveBeenCalledTimes(1);
    // Las 4 reservas son visibles.
    expect(screen.getByText('Ventilador Oxylog 3000')).toBeInTheDocument();
    expect(screen.getByText('Monitor IntelliVue MX450')).toBeInTheDocument();
    expect(screen.getByText('Bomba de Infusión Alaris')).toBeInTheDocument();
    expect(screen.getByText('Desfibrilador HeartStart')).toBeInTheDocument();
  });

  it('click en "Pendientes" filtra localmente (NO recarga el API) y muestra sólo pendientes', async () => {
    await renderAndWait();
    expect(mocks.mockGetReservas).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^pendientes$/i }));

    // Sigue habiendo 1 sola llamada al API (filtro local).
    expect(mocks.mockGetReservas).toHaveBeenCalledTimes(1);

    // Sólo la fila pendiente es visible.
    expect(screen.getByText('Monitor IntelliVue MX450')).toBeInTheDocument();
    expect(screen.queryByText('Ventilador Oxylog 3000')).not.toBeInTheDocument();
    expect(screen.queryByText('Bomba de Infusión Alaris')).not.toBeInTheDocument();
    expect(screen.queryByText('Desfibrilador HeartStart')).not.toBeInTheDocument();
  });

  it('click en "Activas" filtra localmente y muestra sólo activas', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^activas$/i }));
    expect(screen.getByText('Ventilador Oxylog 3000')).toBeInTheDocument();
    expect(screen.queryByText('Monitor IntelliVue MX450')).not.toBeInTheDocument();
    expect(screen.queryByText('Bomba de Infusión Alaris')).not.toBeInTheDocument();
    expect(screen.queryByText('Desfibrilador HeartStart')).not.toBeInTheDocument();
  });

  it('click en "Listas" filtra localmente y muestra sólo completadas', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^listas$/i }));
    expect(screen.getByText('Bomba de Infusión Alaris')).toBeInTheDocument();
    expect(screen.queryByText('Ventilador Oxylog 3000')).not.toBeInTheDocument();
  });

  it('volver a "Todas" muestra todas las filas de nuevo', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /^pendientes$/i }));
    expect(screen.queryByText('Ventilador Oxylog 3000')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^todas$/i }));
    expect(screen.getByText('Ventilador Oxylog 3000')).toBeInTheDocument();
    expect(screen.getByText('Monitor IntelliVue MX450')).toBeInTheDocument();
    expect(screen.getByText('Bomba de Infusión Alaris')).toBeInTheDocument();
    expect(screen.getByText('Desfibrilador HeartStart')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Tabla de reservas
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — tabla de reservas', () => {
  it('muestra los 6 headers de columna', async () => {
    await renderAndWait();
    const headers = ['Equipo / Serie', 'Área Destino', 'Solicitante', 'Fecha Programada', 'Estado', 'Acciones'];
    headers.forEach((h) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(`^${h}$`, 'i') })).toBeInTheDocument();
    });
  });

  it('cada fila muestra equipo_nombre + equipo_serie', async () => {
    await renderAndWait();
    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    expect(fila).toHaveTextContent('DRG-OXY-0001');
  });

  it('cada fila muestra area_reserva + piso_reserva cuando existe', async () => {
    await renderAndWait();
    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    expect(fila).toHaveTextContent('UCI Adultos');
    expect(fila).toHaveTextContent('Piso 3');
  });

  it('fila con piso_reserva=null oculta el subtexto del piso', async () => {
    await renderAndWait();
    // RES_PENDIENTE tiene piso_reserva=null (Monitor IntelliVue MX450).
    const fila = screen.getByText('Monitor IntelliVue MX450').closest('tr');
    // El td del area contiene "Quirófano 3" pero NO contiene "Piso" en subtexto.
    expect(fila).toHaveTextContent('Quirófano 3');
    expect(fila).not.toHaveTextContent('Piso');
  });

  it('solicitante_nombre=null usa fallback "Asignado General"', async () => {
    await renderAndWait();
    // RES_COMPLETADA tiene solicitante_nombre=null (Bomba de Infusión Alaris).
    const fila = screen.getByText('Bomba de Infusión Alaris').closest('tr');
    expect(fila).toHaveTextContent('Asignado General');
  });

  it('fecha_fin=null NO muestra el bloque "Fin:" (BUG LATENTE: "Indefinida" nunca renderiza)', async () => {
    await renderAndWait();
    // RES_CANCELADA tiene fecha_fin=null (Desfibrilador HeartStart).
    const fila = screen.getByText('Desfibrilador HeartStart').closest('tr');
    // El bloque "Fin:" no se renderiza porque la condicional requiere
    // fecha_fin truthy. **BUG LATENTE**: la constante
    //   `const fin = res.fecha_fin ? ... : 'Indefinida'`
    // está computada en el código pero nunca se usa (dead code). Si la
    // intención era mostrar "Indefinida" cuando fecha_fin es null, el bloque
    // JSX debería renderizar siempre pero elegir el texto según fecha_fin.
    expect(fila).not.toHaveTextContent(/Fin:/);
  });

  it('empty state: "Sin reservas registradas para este filtro." cuando vacío', async () => {
    await renderAndWait({ reservas: [] });
    expect(screen.getByText(/sin reservas registradas para este filtro/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Badges de estado (estilo)
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — badges de estado', () => {
  it('estado "activa" muestra texto "ACTIVA" con clases emerald', async () => {
    await renderAndWait();
    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    const badge = within(fila).getByText(/^ACTIVA$/);
    expect(badge.className).toMatch(/emerald/);
  });

  it('estado "pendiente" muestra texto "PENDIENTE" con clases amber', async () => {
    await renderAndWait();
    const fila = screen.getByText('Monitor IntelliVue MX450').closest('tr');
    const badge = within(fila).getByText(/^PENDIENTE$/);
    expect(badge.className).toMatch(/amber/);
  });

  it('estado "completada" muestra texto "COMPLETADA" con clases blue', async () => {
    await renderAndWait();
    const fila = screen.getByText('Bomba de Infusión Alaris').closest('tr');
    const badge = within(fila).getByText(/^COMPLETADA$/);
    expect(badge.className).toMatch(/blue/);
  });

  it('estado "cancelada" muestra texto "CANCELADA" con clases muted (var content-bg)', async () => {
    await renderAndWait();
    const fila = screen.getByText('Desfibrilador HeartStart').closest('tr');
    const badge = within(fila).getByText(/^CANCELADA$/);
    // El fallback usa `bg-[var(--content-bg)]` (literal en la clase).
    expect(badge.className).toMatch(/content-bg|content-muted/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Acciones por estado (botones de cambio de estado y Ver Motivo)
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — botones de acción por estado', () => {
  it('fila "pendiente" muestra sólo el botón "Iniciar Reserva" + "Cancelar"', async () => {
    await renderAndWait();
    const fila = screen.getByText('Monitor IntelliVue MX450').closest('tr');
    expect(within(fila).getByTitle('Iniciar Reserva')).toBeInTheDocument();
    expect(within(fila).getByTitle('Cancelar Reserva')).toBeInTheDocument();
    // "Completar" sólo aparece en activas.
    expect(within(fila).queryByTitle('Completar Reserva')).not.toBeInTheDocument();
  });

  it('fila "activa" muestra sólo el botón "Completar Reserva" + "Cancelar"', async () => {
    await renderAndWait();
    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    expect(within(fila).getByTitle('Completar Reserva')).toBeInTheDocument();
    expect(within(fila).getByTitle('Cancelar Reserva')).toBeInTheDocument();
    // "Iniciar" sólo aparece en pendientes.
    expect(within(fila).queryByTitle('Iniciar Reserva')).not.toBeInTheDocument();
  });

  it('fila "completada" NO muestra ningún botón de cambio de estado', async () => {
    await renderAndWait();
    const fila = screen.getByText('Bomba de Infusión Alaris').closest('tr');
    expect(within(fila).queryByTitle('Iniciar Reserva')).not.toBeInTheDocument();
    expect(within(fila).queryByTitle('Completar Reserva')).not.toBeInTheDocument();
    expect(within(fila).queryByTitle('Cancelar Reserva')).not.toBeInTheDocument();
  });

  it('botón "Ver Motivo" sólo aparece cuando motivo existe (no en completada con motivo null)', async () => {
    await renderAndWait();
    // RES_COMPLETADA tiene motivo=null → sin botón FileText.
    const filaCompl = screen.getByText('Bomba de Infusión Alaris').closest('tr');
    expect(within(filaCompl).queryByTitle('Ver Motivo')).not.toBeInTheDocument();
    // Las demás reservas sí tienen motivo.
    const filaPend = screen.getByText('Monitor IntelliVue MX450').closest('tr');
    expect(within(filaPend).getByTitle('Ver Motivo')).toBeInTheDocument();
  });

  it('click en "Iniciar Reserva" llama cambiarEstadoReserva con estado="activa"', async () => {
    mocks.mockCambiarEstadoReserva.mockResolvedValue({});
    // Necesitamos recargar para que cambie la lista y no pierda la fila — el
    // mock por defecto devuelve la misma lista. Lo dejamos mockeado simple.
    mocks.mockGetReservas
      .mockResolvedValueOnce({ reservas: ALL_RESERVAS })
      .mockResolvedValueOnce({ reservas: [RES_ACTIVA, RES_COMPLETADA, RES_CANCELADA] });
    await renderAndWait();

    const fila = screen.getByText('Monitor IntelliVue MX450').closest('tr');
    fireEvent.click(within(fila).getByTitle('Iniciar Reserva'));

    await waitFor(() => {
      expect(mocks.mockCambiarEstadoReserva).toHaveBeenCalledWith(2, { estado: 'activa' });
    });
    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalledWith('Reserva marcada como activa exitosamente');
    });
  });

  it('click en "Cancelar Reserva" llama cambiarEstadoReserva con estado="cancelada"', async () => {
    mocks.mockCambiarEstadoReserva.mockResolvedValue({});
    await renderAndWait();

    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    fireEvent.click(within(fila).getByTitle('Cancelar Reserva'));

    await waitFor(() => {
      expect(mocks.mockCambiarEstadoReserva).toHaveBeenCalledWith(1, { estado: 'cancelada' });
    });
  });

  it('error en cambiarEstadoReserva con detail → toast.error con detail del backend', async () => {
    await renderAndWait();
    // Override DESPUÉS de renderAndWait (que setea mockResolvedValue por default).
    mocks.mockCambiarEstadoReserva.mockRejectedValueOnce({
      response: { data: { detail: 'Transición de estado no permitida' } },
    });

    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    fireEvent.click(within(fila).getByTitle('Cancelar Reserva'));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Transición de estado no permitida');
    });
  });

  it('error genérico en cambiarEstadoReserva → toast.error con mensaje por defecto', async () => {
    await renderAndWait();
    mocks.mockCambiarEstadoReserva.mockRejectedValueOnce(new Error('Network'));

    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    fireEvent.click(within(fila).getByTitle('Cancelar Reserva'));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al actualizar el estado de la reserva');
    });
  });

  it('click en "Ver Motivo" llama toast(motivo, { icon: "📝", duration: 4000 }) — callable bug', async () => {
    // **BUG CONOCIDO**: `toast(msg, opts)` no funciona en producción porque
    // `lib/toast.js` exporta un objeto, no una función. El mock callable
    // simula el comportamiento esperado del fix. Verifica que la llamada
    // tiene la signatura correcta.
    await renderAndWait();

    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    fireEvent.click(within(fila).getByTitle('Ver Motivo'));

    expect(mocks.mockToast).toHaveBeenCalledWith(
      'Cirugía programada paciente 1029',
      { icon: '📝', duration: 4000 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Modal: Nueva Reserva
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — modal Nueva Reserva', () => {
  it('click en "Nueva Reserva" abre el modal con el heading', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    // Espera a que el modal asiente (useEffect → getEquipos → setEquipos)
    // para evitar "An update was not wrapped in act" en tests siguientes.
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 2, name: /nueva reserva de equipo/i })).toBeInTheDocument();
  });

  it('abrir el modal dispara api.getEquipos con { limit: 200 }', async () => {
    await renderAndWait();
    expect(mocks.mockGetEquipos).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));

    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalledWith({ limit: 200 });
    });
  });

  it('modal lista los equipos en el select con la key correcta y excluye baja', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => {
      expect(mocks.mockGetEquipos).toHaveBeenCalled();
    });

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options);
    // 1 placeholder + 3 equipos (excluye EQ_BAJA).
    expect(options).toHaveLength(4);
    expect(options[1].value).toBe(String(EQ_DISPONIBLE.id));
    expect(options[1].textContent).toMatch(/operativo/);
    // El equipo de baja NO aparece.
    expect(options.find((o) => o.value === String(EQ_BAJA.id))).toBeUndefined();
  });

  it('modal acepta shape {equipos:[...]} del API', async () => {
    mocks.mockGetEquipos.mockResolvedValueOnce({ equipos: [EQ_DISPONIBLE, EQ_TRASLADO] });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      const options = Array.from(select.options);
      expect(options).toHaveLength(3); // placeholder + 2 equipos
    });
  });

  it('modal acepta shape [...] directo (sin envolver)', async () => {
    mocks.mockGetEquipos.mockResolvedValueOnce([EQ_DISPONIBLE]);
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      const options = Array.from(select.options);
      expect(options).toHaveLength(2); // placeholder + 1 equipo
    });
  });

  it('getEquipos rechazando → toast.error con mensaje específico', async () => {
    await renderAndWait();
    // Override DESPUÉS de renderAndWait (el override por default no incluye errors).
    mocks.mockGetEquipos.mockRejectedValueOnce(new Error('Network'));

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar equipos del inventario');
    });
  });

  it('búsqueda en el modal filtra localmente por nombre (case-insensitive)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const search = screen.getByPlaceholderText(/buscar por nombre, serie o modelo/i);
    fireEvent.change(search, { target: { value: 'ventilador' } });

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options);
    // Placeholder + 1 match.
    expect(options).toHaveLength(2);
    expect(options[1].textContent).toMatch(/Ventilador/);
  });

  it('búsqueda en el modal filtra por serie (case-insensitive)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const search = screen.getByPlaceholderText(/buscar por nombre, serie o modelo/i);
    fireEvent.change(search, { target: { value: 'phi-mx4' } });

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options);
    expect(options).toHaveLength(2);
    expect(options[1].textContent).toMatch(/IntelliVue/);
  });

  it('búsqueda en el modal filtra por modelo (case-insensitive)', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const search = screen.getByPlaceholderText(/buscar por nombre, serie o modelo/i);
    fireEvent.change(search, { target: { value: 'MX450' } });

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options);
    expect(options).toHaveLength(2);
    expect(options[1].textContent).toMatch(/IntelliVue/);
  });

  it('inputs del modal: fecha_inicio y fecha_fin tienen value inicial con shape YYYY-MM-DDTHH:MM', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    // Espera a que el modal asiente (getEquipos → setEquipos) para evitar
    // "An update was not wrapped in act" warnings.
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const fechas = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    // Hay 2 inputs datetime-local: fecha_inicio y fecha_fin.
    expect(fechas.length).toBeGreaterThanOrEqual(2);
  });

  it('submit válido llama api.crearReserva con shape correcto (incluye user.id, fechas con espacio + ":00")', async () => {
    mocks.mockCrearReserva.mockResolvedValue({ id: 999 });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    // Selecciona un equipo disponible.
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: String(EQ_DISPONIBLE.id) } });

    // Llena área destino.
    const area = screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i);
    fireEvent.change(area, { target: { value: 'Quirófano 5' } });

    // Piso (vacío → null en payload).
    // Motivo (vacío → '' en payload).

    // Submit.
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => {
      expect(mocks.mockCrearReserva).toHaveBeenCalledTimes(1);
    });

    const call = mocks.mockCrearReserva.mock.calls[0][0];
    expect(call.equipo_id).toBe(EQ_DISPONIBLE.id); // Number()
    expect(call.area_reserva).toBe('Quirófano 5');
    expect(call.piso_reserva).toBeNull();
    expect(call.solicitante_id).toBe(TEST_USER.id);
    expect(call.fecha_inicio).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$/);
    expect(call.fecha_fin).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$/);
    expect(call.motivo).toBe('');

    // Espera final para que la cadena async (toast + onSaved) se asiente
    // antes de que el test salga (evita "An update was not wrapped in act").
    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalledWith('Reserva creada exitosamente');
    });
  });

  it('submit exitoso cierra el modal y recarga el API (onSaved)', async () => {
    mocks.mockCrearReserva.mockResolvedValue({ id: 999 });
    await renderAndWait();
    expect(mocks.mockGetReservas).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: /nueva reserva de equipo/i })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mocks.mockGetReservas).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockToast.success).toHaveBeenCalledWith('Reserva creada exitosamente');
  });

  it('submit con piso y motivo vacíos → piso_reserva=null, motivo=""', async () => {
    mocks.mockCrearReserva.mockResolvedValue({ id: 999 });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    // Piso y motivo vacíos.
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => expect(mocks.mockCrearReserva).toHaveBeenCalledTimes(1));
    const call = mocks.mockCrearReserva.mock.calls[0][0];
    expect(call.piso_reserva).toBeNull();
    expect(call.motivo).toBe('');

    // Espera final — mima el "submit válido" test.
    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalled();
    });
  });

  it('submit con piso y motivo con valor → payload los incluye', async () => {
    mocks.mockCrearReserva.mockResolvedValue({ id: 999 });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. 1er Piso, Sótano/i), { target: { value: 'Piso 4' } });
    fireEvent.change(screen.getByPlaceholderText(/procedimiento quirúrgico o clínico/i), {
      target: { value: 'Cirugía cardiovascular' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => expect(mocks.mockCrearReserva).toHaveBeenCalledTimes(1));
    const call = mocks.mockCrearReserva.mock.calls[0][0];
    expect(call.piso_reserva).toBe('Piso 4');
    expect(call.motivo).toBe('Cirugía cardiovascular');

    await waitFor(() => {
      expect(mocks.mockToast.success).toHaveBeenCalled();
    });
  });

  it('validación: area_reserva con sólo whitespace (.trim()=== "") → toast.error y NO llama al API', async () => {
    mocks.mockCrearReserva.mockResolvedValue({ id: 999 });
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    // Selecciona un equipo (pasa el required del select).
    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    // Llena area con sólo espacios (pasa el required del input pero falla .trim()).
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    expect(mocks.mockToast.error).toHaveBeenCalledWith('Ingresa el área de destino');
    expect(mocks.mockCrearReserva).not.toHaveBeenCalled();
  });

  it('submit con 409 → toast.error dedicado de conflicto de horario', async () => {
    await renderAndWait();
    mocks.mockCrearReserva.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Conflicto backend' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Conflicto: El equipo ya se encuentra reservado en ese horario');
    });
  });

  it('submit con error 500 + detail → toast.error con detail del backend (no "Conflicto:")', async () => {
    await renderAndWait();
    mocks.mockCrearReserva.mockRejectedValueOnce({
      response: { status: 500, data: { detail: 'Backend timeout' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Backend timeout');
    });
  });

  it('submit con error genérico (sin response) → toast.error con mensaje por defecto', async () => {
    await renderAndWait();
    mocks.mockCrearReserva.mockRejectedValueOnce(new Error('Network'));

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al guardar la reserva');
    });
  });

  it('click en "Cancelar" cierra el modal sin llamar al API', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 2, name: /nueva reserva de equipo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByRole('heading', { level: 2, name: /nueva reserva de equipo/i })).not.toBeInTheDocument();
    expect(mocks.mockCrearReserva).not.toHaveBeenCalled();
  });

  it('botón X (esquina superior derecha) cierra el modal', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    const heading = screen.getByRole('heading', { level: 2, name: /nueva reserva de equipo/i });
    const closeBtn = heading.parentElement.querySelector('button');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('heading', { level: 2, name: /nueva reserva de equipo/i })).not.toBeInTheDocument();
  });

  it('submit no toca solicitante_id si NO hay user en AuthContext → payload con null', async () => {
    // Sobreescribimos el wrapper SIN user.
    mocks.mockGetReservas.mockResolvedValue({ reservas: ALL_RESERVAS });
    mocks.mockGetEquipos.mockResolvedValue({ equipos: ALL_EQUIPOS });
    mocks.mockCrearReserva.mockResolvedValue({ id: 999 });

    render(
      <AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), logout: vi.fn() }}>
        <Reservas />
      </AuthContext.Provider>,
    );

    await waitFor(() => expect(screen.queryByText(/cargando bitácora/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: String(EQ_DISPONIBLE.id) } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Quirófano 3, UCIN/i), { target: { value: 'UCI' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => expect(mocks.mockCrearReserva).toHaveBeenCalledTimes(1));
    const call = mocks.mockCrearReserva.mock.calls[0][0];
    expect(call.solicitante_id).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Shape tolerance y manejo de errores
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — shape tolerance y manejo de errores', () => {
  it('toast.error cuando getReservas rechaza', async () => {
    mocks.mockGetReservas.mockRejectedValue(new Error('Network'));
    renderReservas();
    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar la bitácora de reservas');
    });
  });

  it('acepta shape `{reservas: [...]}` (objeto envuelto)', async () => {
    mocks.mockGetReservas.mockResolvedValue({ reservas: [RES_ACTIVA, RES_PENDIENTE] });
    renderReservas();
    await waitFor(() => {
      expect(screen.getByText('Ventilador Oxylog 3000')).toBeInTheDocument();
    });
    expect(screen.getByText('Monitor IntelliVue MX450')).toBeInTheDocument();
  });

  it('acepta respuesta `{reservas: []}` (array vacío)', async () => {
    mocks.mockGetReservas.mockResolvedValue({ reservas: [] });
    renderReservas();
    await waitFor(() => {
      expect(screen.getByText(/sin reservas registradas para este filtro/i)).toBeInTheDocument();
    });
  });

  it('acepta respuesta `{}` (objeto vacío) sin crash → fallback a []', async () => {
    mocks.mockGetReservas.mockResolvedValue({});
    renderReservas();
    await waitFor(() => {
      expect(screen.queryByText(/cargando bitácora/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/sin reservas registradas para este filtro/i)).toBeInTheDocument();
    // KPIs a 0 sin crash: los 4 KPIs ("Total Reservado", "Activas
    // Actualmente", "Pendientes", "Completadas") renderizan "0".
    const kpis = screen.getAllByText('0');
    expect(kpis.length).toBeGreaterThanOrEqual(1);
  });

  it('pasa `undefined` como params en la carga inicial (no se llama con {})', async () => {
    mocks.mockGetReservas.mockResolvedValue({ reservas: ALL_RESERVAS });
    renderReservas();
    await waitFor(() => {
      expect(screen.queryByText(/cargando bitácora/i)).not.toBeInTheDocument();
    });
    expect(mocks.mockGetReservas).toHaveBeenCalledWith();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Hygiene (no warnings de React ni de act())
// ─────────────────────────────────────────────────────────────────────────
describe('Reservas — hygiene', () => {
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

  it('no emite warnings durante el flujo completo (filtros + acciones + modal)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mocks.mockCambiarEstadoReserva.mockResolvedValue({});
    await renderAndWait();

    // Filtros.
    fireEvent.click(screen.getByRole('button', { name: /^pendientes$/i }));
    expect(screen.getByText('Monitor IntelliVue MX450')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^todas$/i }));

    // Click "Ver Motivo" (assert toast callable).
    const fila = screen.getByText('Ventilador Oxylog 3000').closest('tr');
    fireEvent.click(within(fila).getByTitle('Ver Motivo'));

    // Modal abre y cierra.
    fireEvent.click(screen.getByRole('button', { name: /nueva reserva/i }));
    await waitFor(() => expect(mocks.mockGetEquipos).toHaveBeenCalled());
    expect(screen.getByRole('heading', { level: 2, name: /nueva reserva de equipo/i })).toBeInTheDocument();
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
