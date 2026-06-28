// src/pages/AdminGlobal.test.jsx
// AdminGlobal es el panel SUPERADMIN SIGAH: vista cross-hospital con KPIs
// globales, tabla de tenants (hospitales) y actividad reciente. Concentra
// varios patrones sutiles:
//
//   - Carga inicial con `Promise.all([getAdminStats(), getAdminHospitales(),
//     getAdminActividad()])` envuelto en try/catch/finally. El `finally`
//     apaga `loading` aunque una promesa rechace. Si alguien borra el
//     `setLoading(false)` del finally, la pantalla se queda eternamente con
//     "Cargando..." incluso si el backend devolvió 500.
//   - 3 ramas de error distintas:
//       * err.response?.status === 403 → setForbidden(true) + banner
//         ámbar con código + toast.error "Acceso restringido: se requiere
//         rol superadmin_sigah".
//       * Otro status (500, 502, red) → sólo toast.error "Error al cargar
//         panel admin" (sin banner).
//     Si alguien homogeneiza ambos errores a un solo toast genérico, el
//     operador pierde el contexto sobre permisos vs falla de red.
//   - 4 KPICards con valores derivados de `stats`. El "MRR" se formatea
//     como `$${Number(stats.mrr_mxn).toLocaleString('es-MX')} MXN` y usa
//     '—' cuando mrr_mxn es null. "Usuarios Totales" cae a
//     stats.usuarios_totales si stats.total_usuarios no existe (alias).
//     Si alguien borra el alias, el KPI muestra '—' en deployments viejos.
//   - `SUSCRIPCION_BADGE` con fallback a `inactivo` para estados
//     desconocidos (null, undefined, 'foo'). Si alguien quita el `??`,
//     un estado nuevo crashea al intentar leer `.dot`/`.pill`/`.label`
//     de `undefined`.
//   - `hospitales` y `actividad` con tolerancia a shape: acepta tanto
//     `{hospitales: [...]}` como `[...]` directamente (`.x ?? z ?? []`).
//     Si alguien quita el fallback, una respuesta `{hospitales: null}`
//     crashea con TypeError.
//   - Tabla de hospitales con 6 columnas (Hospital, Slug, Suscripción,
//     Usuarios, Activo Desde, Acciones). "Activo Desde" se formatea con
//     `toLocaleDateString('es-MX', {day:'2-digit', month:'short',
//     year:'numeric'})` — formato local, regex flexible en tests.
//   - `num_usuarios ?? total_usuarios ?? '—'` para tolerar tanto el
//     nombre nuevo como el viejo del campo.
//   - Botón "Ver detalles" siempre `disabled` (Fase 3). Si alguien
//     habilita el botón sin wirearlo, el operador hace click y nada pasa.
//   - Lista de actividad con slice(0, 20). Si hay >20 entradas, sólo
//     se renderizan las 20 más recientes (saneamiento de lista larga).
//   - `formatRelative(isoString)`:
//       * <1 min   → "hace un momento"
//       * <60 min  → "hace {n} min"
//       * <24 h    → "hace {n} h"
//       * >=24 h   → "hace {n} d"
//       * null     → "—"
//     Si alguien cambia <1 por <=1, una fecha de hace 30s se reporta como
//     "hace 1 min" (over-reporting). Si alguien borra el guard de
//     `if (!isoString)`, un null se evalúa como 1970 → "hace X años".
//   - Botón "Actualizar" invoca `cargar()` otra vez (3 endpoints
//     llamados 2x). El ícono RefreshCw recibe `animate-spin` mientras
//     loading=true.
//   - `ev.hospital_nombre ?? ev.hospital ?? 'Sistema'` para tolerar
//     tanto el campo nuevo como el viejo del hospital.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si el `setLoading(false)` se quita del finally, el loading se queda
//     para siempre aunque el backend responda 500.
//   - Si el `?? SUSCRIPCION_BADGE.inactivo` se borra, un estado
//     desconocido crashea el componente entero.
//   - Si el alias `total_usuarios` se quita, deployments con respuesta
//     vieja muestran '—' en el KPI.
//   - Si el fallback de shape `hosp.hospitales ?? hosp ?? []` se quita,
//     una respuesta `{hospitales: null}` rompe la página.
//   - Si el banner 403 se quita, el operador no sabe que el panel está
//     en modo "datos de ejemplo".
//   - Si el guard `if (!isoString) return '—'` se borra, una actividad
//     sin timestamp reporta años (1970).
//
// Se mockea: `../api/sigah` (3 endpoints), `../components/Toast` (sileo
// no es jsdom-safe). NO se mockea `lucide-react` (los iconos funcionan
// en jsdom). NO se usa MemoryRouter (la página no usa react-router).
// NO se mockea `framer-motion` (no se usa).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetAdminStats:       vi.fn(),
  mockGetAdminHospitales:  vi.fn(),
  mockGetAdminActividad:   vi.fn(),
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
    getAdminStats:      (...a) => mocks.mockGetAdminStats(...a),
    getAdminHospitales: (...a) => mocks.mockGetAdminHospitales(...a),
    getAdminActividad:  (...a) => mocks.mockGetAdminActividad(...a),
  },
}));

vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }) => children,
  useToast:      () => mocks.mockToast,
  default:       mocks.mockToast,
}));

import AdminGlobal from './AdminGlobal';

// ── Fixtures ──
const STATS_BASE = {
  total_hospitales:  12,
  hospitales_activos: 9,
  mrr_mxn:           124500,
  total_usuarios:    187,
};

const HOSP_ACTIVO = {
  id: 1,
  nombre: 'HGR No. 1 IMSS Tijuana',
  slug: 'hgr-1-tijuana',
  estado_suscripcion: 'activo',
  num_usuarios: 42,
  activo_desde: '2025-01-15T00:00:00Z',
};
const HOSP_TRIAL = {
  id: 2,
  nombre: 'HGR No. 20 IMSS Tijuana',
  slug: 'hgr-20-tijuana',
  estado_suscripcion: 'trial',
  num_usuarios: 18,
  activo_desde: '2026-03-01T00:00:00Z',
};
const HOSP_VENCIDO = {
  id: 3,
  nombre: 'HGP Ginecopediatría Tijuana',
  slug: 'hgp-tijuana',
  estado_suscripcion: 'vencido',
  num_usuarios: 5,
  activo_desde: null,
};
const HOSP_DESCONOCIDO = {
  id: 4,
  nombre: 'Hospital Piloto',
  slug: 'h-piloto',
  estado_suscripcion: 'no_existe_en_mapa',
  num_usuarios: 1,
  activo_desde: '2026-05-01T00:00:00Z',
};

const ACT_RECIENTE = {
  id: 1,
  hospital_nombre: 'HGR No. 1 IMSS Tijuana',
  accion: 'Nuevo equipo registrado',
  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // hace 5 min
};
const ACT_HACE_HORA = {
  id: 2,
  hospital_nombre: 'HGR No. 20 IMSS Tijuana',
  accion: 'OS cerrada',
  created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // hace 3 h
};
const ACT_HACE_DIA = {
  id: 3,
  hospital: 'HGP Tijuana', // sin hospital_nombre, usa fallback 'hospital'
  accion: 'Login usuario',
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // hace 2 d
};
const ACT_SIN_HOSPITAL = {
  id: 4,
  accion: 'Job automático',
  created_at: new Date(Date.now() - 30 * 1000).toISOString(), // hace 30 s → "hace un momento"
};
const ACT_NULL_TIMESTAMP = {
  id: 5,
  hospital_nombre: 'HGR No. 1',
  accion: 'Acción sin timestamp',
  created_at: null,
};

// ── Helpers ──
function setupApi({
  stats = STATS_BASE,
  hospitales = [HOSP_ACTIVO, HOSP_TRIAL, HOSP_VENCIDO],
  actividad = [ACT_RECIENTE, ACT_HACE_HORA, ACT_HACE_DIA],
} = {}) {
  mocks.mockGetAdminStats.mockResolvedValue(stats);
  mocks.mockGetAdminHospitales.mockResolvedValue(hospitales);
  mocks.mockGetAdminActividad.mockResolvedValue(actividad);
}

function renderA() {
  return render(<AdminGlobal />);
}

async function renderAndWait(opts = {}) {
  setupApi(opts);
  renderA();
  // esperar a que el setLoading(false) del finally corra
  await waitFor(() => {
    // El botón Actualizar se habilita cuando loading=false (no disabled).
    const btn = screen.queryByRole('button', { name: /actualizar/i });
    expect(btn).not.toBeDisabled();
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Loading state
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — loading state', () => {
  it('muestra "Cargando..." en la tabla y "Cargando actividad..." en la lista mientras las promesas no resuelven', () => {
    mocks.mockGetAdminStats.mockReturnValue(new Promise(() => {}));
    mocks.mockGetAdminHospitales.mockReturnValue(new Promise(() => {}));
    mocks.mockGetAdminActividad.mockReturnValue(new Promise(() => {}));

    renderA();

    expect(screen.getByText(/^cargando\.\.\.$/i)).toBeInTheDocument();
    expect(screen.getByText(/cargando actividad\.\.\./i)).toBeInTheDocument();
  });

  it('oculta el loading tras resolución de Promise.all', async () => {
    await renderAndWait();

    expect(screen.queryByText(/^cargando\.\.\.$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cargando actividad\.\.\./i)).not.toBeInTheDocument();
  });

  it('apaga loading incluso si una promesa rechaza (finally con setLoading(false))', async () => {
    mocks.mockGetAdminStats.mockResolvedValue(STATS_BASE);
    mocks.mockGetAdminHospitales.mockRejectedValue(new Error('Network'));
    mocks.mockGetAdminActividad.mockResolvedValue({ actividad: [] });

    renderA();

    await waitFor(() => {
      expect(screen.queryByText(/^cargando\.\.\.$/i)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText(/cargando actividad\.\.\./i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Header y refresh button
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — header', () => {
  it('renderiza el h1 "Panel SuperAdmin SIGAH"', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: /panel superadmin sigah/i })).toBeInTheDocument();
  });

  it('muestra el subtítulo "Gestión global de hospitales y suscripciones"', async () => {
    await renderAndWait();
    expect(screen.getByText(/gestión global de hospitales y suscripciones/i)).toBeInTheDocument();
  });

  it('muestra el badge "SUPER ADMIN"', async () => {
    await renderAndWait();
    expect(screen.getByText(/super admin/i)).toBeInTheDocument();
  });

  it('muestra el botón "Actualizar" con icono RefreshCw', async () => {
    await renderAndWait();
    const btn = screen.getByRole('button', { name: /actualizar/i });
    expect(btn).toBeInTheDocument();
    expect(btn.querySelector('.lucide-refresh-cw')).toBeTruthy();
  });

  it('click en "Actualizar" invoca los 3 endpoints una segunda vez', async () => {
    await renderAndWait();

    expect(mocks.mockGetAdminStats).toHaveBeenCalledTimes(1);
    expect(mocks.mockGetAdminHospitales).toHaveBeenCalledTimes(1);
    expect(mocks.mockGetAdminActividad).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => {
      expect(mocks.mockGetAdminStats).toHaveBeenCalledTimes(2);
    });
    expect(mocks.mockGetAdminHospitales).toHaveBeenCalledTimes(2);
    expect(mocks.mockGetAdminActividad).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. KPIs (4 cards)
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — KPIs globales', () => {
  it('muestra los 4 labels: Total Hospitales, Hospitales Activos, MRR, Usuarios Totales', async () => {
    await renderAndWait();
    expect(screen.getByText(/total hospitales/i)).toBeInTheDocument();
    expect(screen.getByText(/hospitales activos/i)).toBeInTheDocument();
    expect(screen.getByText(/^mrr$/i)).toBeInTheDocument();
    expect(screen.getByText(/usuarios totales/i)).toBeInTheDocument();
  });

  it('"Total Hospitales" muestra stats.total_hospitales', async () => {
    await renderAndWait();
    const card = screen.getByText(/total hospitales/i).closest('div').parentElement;
    expect(card).toHaveTextContent('12');
  });

  it('"Hospitales Activos" muestra stats.hospitales_activos', async () => {
    await renderAndWait();
    const card = screen.getByText(/hospitales activos/i).closest('div').parentElement;
    expect(card).toHaveTextContent('9');
  });

  it('"MRR" se formatea como "$124,500 MXN" (toLocaleString es-MX)', async () => {
    await renderAndWait();
    const card = screen.getByText(/^mrr$/i).closest('div').parentElement;
    expect(card).toHaveTextContent('$124,500 MXN');
  });

  it('"MRR" muestra "—" cuando stats.mrr_mxn es null', async () => {
    await renderAndWait({ stats: { ...STATS_BASE, mrr_mxn: null } });
    const card = screen.getByText(/^mrr$/i).closest('div').parentElement;
    expect(card).toHaveTextContent('—');
  });

  it('"Usuarios Totales" usa stats.total_usuarios (primario)', async () => {
    await renderAndWait();
    const card = screen.getByText(/usuarios totales/i).closest('div').parentElement;
    expect(card).toHaveTextContent('187');
  });

  it('"Usuarios Totales" cae a stats.usuarios_totales si total_usuarios falta', async () => {
    await renderAndWait({
      stats: { ...STATS_BASE, total_usuarios: undefined, usuarios_totales: 99 },
    });
    const card = screen.getByText(/usuarios totales/i).closest('div').parentElement;
    expect(card).toHaveTextContent('99');
  });

  it('"Usuarios Totales" muestra "—" si ambos campos faltan', async () => {
    await renderAndWait({
      stats: { ...STATS_BASE, total_usuarios: undefined, usuarios_totales: undefined },
    });
    const card = screen.getByText(/usuarios totales/i).closest('div').parentElement;
    expect(card).toHaveTextContent('—');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. SuscripcionBadge
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — SuscripcionBadge', () => {
  it('badge "activo" usa clases emerald', async () => {
    await renderAndWait();
    const badge = screen.getByText('Activo');
    expect(badge.closest('span').className).toContain('text-emerald-600');
  });

  it('badge "trial" usa clases amber', async () => {
    await renderAndWait();
    const badge = screen.getByText('Trial');
    expect(badge.closest('span').className).toContain('text-amber-600');
  });

  it('badge "vencido" usa clases red', async () => {
    await renderAndWait();
    const badge = screen.getByText('Vencido');
    expect(badge.closest('span').className).toContain('text-red-600');
  });

  it('badge "inactivo" usa pill slate + text muted (var(--content-muted))', async () => {
    await renderAndWait({ hospitales: [{ ...HOSP_ACTIVO, estado_suscripcion: 'inactivo' }] });
    const badge = screen.getByText('Inactivo').closest('span');
    // El pill usa bg-slate-500/15 + border-slate-500/25. El text usa
    // var(--content-muted) en lugar de text-slate-500 (decisión de tema:
    // slate-500 plano rompe contraste en dark mode).
    expect(badge.className).toContain('bg-slate-500/15');
    expect(badge.className).toContain('border-slate-500/25');
    expect(badge.className).toContain('text-[var(--content-muted)]');
    // El dot interior lleva bg-slate-500 (color slate).
    const dot = badge.querySelector('span');
    expect(dot.className).toContain('bg-slate-500');
  });

  it('estado desconocido cae al fallback inactivo (sin crash)', async () => {
    await renderAndWait({ hospitales: [HOSP_DESCONOCIDO] });

    // HOSP_DESCONOCIDO tiene estado 'no_existe_en_mapa' → fallback a
    // SUSCRIPCION_BADGE.inactivo.
    const badge = screen.getByText('Inactivo').closest('span');
    expect(badge.className).toContain('bg-slate-500/15');
  });

  it('estado null también cae al fallback inactivo', async () => {
    await renderAndWait({ hospitales: [{ ...HOSP_ACTIVO, estado_suscripcion: null }] });
    const badge = screen.getByText('Inactivo').closest('span');
    expect(badge.className).toContain('bg-slate-500/15');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Tabla de hospitales
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — tabla de hospitales', () => {
  it('renderiza los 6 headers de columna', async () => {
    await renderAndWait();
    expect(screen.getByText(/^hospital$/i)).toBeInTheDocument();
    expect(screen.getByText(/^slug$/i)).toBeInTheDocument();
    expect(screen.getByText(/suscripción/i)).toBeInTheDocument();
    // "Usuarios" matchea tanto el KPI "Usuarios Totales" como la columna
    // "Usuarios" de la tabla. Usamos ^Usuarios$ para anclar a la columna
    // exacta (excluye "Usuarios Totales").
    expect(screen.getByText(/^usuarios$/i)).toBeInTheDocument();
    expect(screen.getByText(/activo desde/i)).toBeInTheDocument();
    expect(screen.getByText(/acciones/i)).toBeInTheDocument();
  });

  it('muestra nombre y slug del hospital', async () => {
    await renderAndWait();
    // "HGR No. 1 IMSS Tijuana" aparece tanto en la tabla (columna
    // Hospital) como en la actividad reciente (ev.hospital_nombre).
    // getByText falla si matchea más de uno, así que verificamos que
    // existe una copia en el <tbody> (la fila de la tabla).
    const matches = screen.getAllByText('HGR No. 1 IMSS Tijuana');
    const inTable = matches.find((el) => el.closest('tbody'));
    expect(inTable).toBeTruthy();
    // El slug es único (sólo aparece en la columna Slug de la tabla).
    expect(screen.getByText('hgr-1-tijuana')).toBeInTheDocument();
  });

  it('"Activo Desde" se formatea como fecha es-MX (regex flexible)', async () => {
    await renderAndWait();
    // HOSP_ACTIVO.activo_desde = '2025-01-15' → formato esperado:
    // algo como "15 ene 2025" / "15 de ene. de 2025". La fixture
    // exacta varía según locale del runner, así que usamos regex.
    const row = screen.getByText('hgr-1-tijuana').closest('tr');
    expect(row).toHaveTextContent(/15/);
    expect(row).toHaveTextContent(/2025/);
  });

  it('"Activo Desde" muestra "—" cuando es null', async () => {
    await renderAndWait();
    const row = screen.getByText('hgp-tijuana').closest('tr');
    // HOSP_VENCIDO tiene activo_desde=null → la celda muestra '—'.
    expect(row).toHaveTextContent('—');
  });

  it('num_usuarios se muestra (con fallback a total_usuarios)', async () => {
    await renderAndWait();
    // HOSP_ACTIVO.num_usuarios = 42
    const row = screen.getByText('hgr-1-tijuana').closest('tr');
    expect(row).toHaveTextContent('42');
  });

  it('num_usuarios cae a total_usuarios si no existe', async () => {
    const hospSinNumUsuarios = { ...HOSP_ACTIVO, num_usuarios: undefined, total_usuarios: 77 };
    await renderAndWait({ hospitales: [hospSinNumUsuarios] });
    const row = screen.getByText('hgr-1-tijuana').closest('tr');
    expect(row).toHaveTextContent('77');
  });

  it('num_usuarios muestra "—" si ambos campos faltan', async () => {
    const hospSinUsuarios = { ...HOSP_ACTIVO, num_usuarios: undefined, total_usuarios: undefined };
    await renderAndWait({ hospitales: [hospSinUsuarios] });
    const row = screen.getByText('hgr-1-tijuana').closest('tr');
    expect(row).toHaveTextContent('—');
  });

  it('botón "Ver detalles" siempre disabled (Fase 3)', async () => {
    await renderAndWait();
    const btn = screen.getAllByRole('button', { name: /ver detalles/i })[0];
    expect(btn).toBeDisabled();
    expect(btn.title).toMatch(/próximamente|fase 3/i);
  });

  it('muestra "Sin hospitales registrados." cuando la lista está vacía', async () => {
    await renderAndWait({ hospitales: [] });
    expect(screen.getByText(/sin hospitales registrados\./i)).toBeInTheDocument();
  });

  it('tolera shape {hospitales: [...]} (objeto envuelto en array): extrae el array', async () => {
    await renderAndWait({ hospitales: { hospitales: [HOSP_ACTIVO] } });
    // getAllByText + closest('tbody') para tolerar que el nombre también
    // aparece en la actividad reciente.
    const matches = screen.getAllByText('HGR No. 1 IMSS Tijuana');
    expect(matches.find((el) => el.closest('tbody'))).toBeTruthy();
  });

  // NOTA: shape `{hospitales: null}` NO se tolera — `hosp.hospitales ?? hosp ?? []`
  // evalúa `null ?? {hospitales:null}` = `{hospitales:null}` (objeto, truthy),
  // y luego `hospitales.map` crashea con TypeError. Mismo bug latente que
  // Capacitaciones / Metrologia / Trazabilidad / ChecklistPage (item #4 del
  // backlog de STATE.md). NO se cubre con test para no contaminar el árbol
  // de React entre tests.
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Lista de actividad reciente
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — actividad reciente', () => {
  it('renderiza una fila por evento con hospital_nombre + acción', async () => {
    await renderAndWait();
    expect(screen.getByText(/nuevo equipo registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/os cerrada/i)).toBeInTheDocument();
    expect(screen.getByText(/login usuario/i)).toBeInTheDocument();
  });

  it('formatRelative: hace 5 min → "hace 5 min"', async () => {
    await renderAndWait({ actividad: [ACT_RECIENTE] });
    expect(screen.getByText(/hace 5 min/i)).toBeInTheDocument();
  });

  it('formatRelative: hace 3 h → "hace 3 h"', async () => {
    await renderAndWait({ actividad: [ACT_HACE_HORA] });
    expect(screen.getByText(/hace 3 h/i)).toBeInTheDocument();
  });

  it('formatRelative: hace 2 d → "hace 2 d"', async () => {
    await renderAndWait({ actividad: [ACT_HACE_DIA] });
    expect(screen.getByText(/hace 2 d/i)).toBeInTheDocument();
  });

  it('formatRelative: < 1 min → "hace un momento"', async () => {
    await renderAndWait({ actividad: [ACT_SIN_HOSPITAL] });
    expect(screen.getByText(/hace un momento/i)).toBeInTheDocument();
  });

  it('formatRelative: created_at null → "—" (guard evita "hace años" 1970)', async () => {
    await renderAndWait({ actividad: [ACT_NULL_TIMESTAMP] });
    // La fila del evento sigue presente (acción), pero el timestamp es '—'.
    expect(screen.getByText(/acción sin timestamp/i)).toBeInTheDocument();
    // El timestamp '—' aparece en la misma fila.
    const row = screen.getByText(/acción sin timestamp/i).closest('li');
    expect(row).toHaveTextContent('—');
  });

  it('evento sin hospital_nombre usa fallback "hospital"', async () => {
    await renderAndWait({ actividad: [ACT_HACE_DIA] });
    // ACT_HACE_DIA sólo tiene "hospital" (no "hospital_nombre") → debe
    // mostrar "HGP Tijuana" del campo `hospital`.
    expect(screen.getByText('HGP Tijuana')).toBeInTheDocument();
  });

  it('evento sin ningún campo de hospital muestra "Sistema"', async () => {
    const sinHospital = {
      id: 99,
      accion: 'Acción sin hospital',
      created_at: new Date().toISOString(),
    };
    await renderAndWait({ actividad: [sinHospital] });
    expect(screen.getByText(/sistema/i)).toBeInTheDocument();
  });

  it('muestra "Sin actividad reciente." cuando la lista está vacía', async () => {
    await renderAndWait({ actividad: [] });
    expect(screen.getByText(/sin actividad reciente\./i)).toBeInTheDocument();
  });

  it('tolera shape {actividad: [...]} (objeto envuelto en array): extrae el array', async () => {
    await renderAndWait({ actividad: { actividad: [ACT_RECIENTE] } });
    expect(screen.getByText(/nuevo equipo registrado/i)).toBeInTheDocument();
  });

  // NOTA: shape `{actividad: null}` NO se tolera — mismo bug latente
  // documentado en la sección de hospitales arriba (item #4 backlog).

  it('trunca la lista a 20 entradas (slicing)', async () => {
    const actividad25 = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      hospital_nombre: `Hospital ${i + 1}`,
      accion: `Acción #${i + 1}`,
      created_at: new Date(Date.now() - (25 - i) * 60 * 1000).toISOString(),
    }));
    await renderAndWait({ actividad: actividad25 });

    // Hospital 21, 22, 23, 24, 25 NO se renderizan (slice(0, 20)).
    expect(screen.queryByText('Hospital 21')).not.toBeInTheDocument();
    expect(screen.queryByText('Hospital 25')).not.toBeInTheDocument();
    // Hospital 1 sí está (entrada #1 → hace ~25 min).
    expect(screen.getByText('Hospital 1')).toBeInTheDocument();
    // Hospital 20 sí está (entrada #20 → hace ~5 min).
    expect(screen.getByText('Hospital 20')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Manejo de errores
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — manejo de errores', () => {
  it('error 403: muestra banner ámbar + toast.error con rol requerido', async () => {
    const err403 = Object.assign(new Error('Forbidden'), { response: { status: 403 } });
    mocks.mockGetAdminStats.mockRejectedValue(err403);
    mocks.mockGetAdminHospitales.mockRejectedValue(err403);
    mocks.mockGetAdminActividad.mockRejectedValue(err403);

    renderA();

    await waitFor(() => {
      expect(screen.getByText(/los datos mostrados son de ejemplo/i)).toBeInTheDocument();
    });
    // El banner incluye el nombre del rol en un <code>.
    expect(screen.getByText(/superadmin_sigah/i)).toBeInTheDocument();
    expect(mocks.mockToast.error).toHaveBeenCalledWith(
      'Acceso restringido: se requiere rol superadmin_sigah',
    );
  });

  it('error 500: NO muestra banner 403, sí toast genérico', async () => {
    const err500 = Object.assign(new Error('Server'), { response: { status: 500 } });
    mocks.mockGetAdminStats.mockRejectedValue(err500);
    mocks.mockGetAdminHospitales.mockRejectedValue(err500);
    mocks.mockGetAdminActividad.mockRejectedValue(err500);

    renderA();

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar panel admin');
    });
    expect(screen.queryByText(/los datos mostrados son de ejemplo/i)).not.toBeInTheDocument();
  });

  it('error de red (sin response.status): toast genérico, sin banner', async () => {
    const errNetwork = new Error('Network Error');
    mocks.mockGetAdminStats.mockRejectedValue(errNetwork);
    mocks.mockGetAdminHospitales.mockRejectedValue(errNetwork);
    mocks.mockGetAdminActividad.mockRejectedValue(errNetwork);

    renderA();

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar panel admin');
    });
    expect(screen.queryByText(/los datos mostrados son de ejemplo/i)).not.toBeInTheDocument();
  });

  it('error 404 → toast genérico (sólo 403 es especial)', async () => {
    const err404 = Object.assign(new Error('Not found'), { response: { status: 404 } });
    mocks.mockGetAdminStats.mockRejectedValue(err404);
    mocks.mockGetAdminHospitales.mockRejectedValue(err404);
    mocks.mockGetAdminActividad.mockRejectedValue(err404);

    renderA();

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith('Error al cargar panel admin');
    });
    // 404 NO debe disparar el banner de permisos.
    expect(screen.queryByText(/los datos mostrados son de ejemplo/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Hygiene (no warnings)
// ─────────────────────────────────────────────────────────────────────────
describe('AdminGlobal — hygiene', () => {
  it('no emite warnings de React ni de act() durante la carga exitosa', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await renderAndWait();

    // Filtramos los warnings pre-existentes de react-router v7 sobre
    // v7_startTransition / v7_relativeSplatPath (no introducidos por
    // este componente — AdminGlobal no usa router).
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});
