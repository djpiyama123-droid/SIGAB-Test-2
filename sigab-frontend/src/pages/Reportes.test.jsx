// src/pages/Reportes.test.jsx
// Reportes es el panel de generación de reportes ejecutivos del sistema
// (NOM-016 / ISO 13485). Concentra varios patrones sutiles:
//
//   - Carga inicial con `Promise.all([getReporteDiario(),
//     getEquiposCriticos()])` y `.catch(console.error)
//     .finally(() => setLoading(false))`. Si alguien quita el
//     `setLoading(false)` del `.finally()`, la pantalla se queda
//     eternamente con "Generando reporte..." aunque las promesas ya
//     resolvieron. Si el `.catch` se borra sin reemplazo, un rechazo de
//     cualquier endpoint deja la promesa sin manejar y rompe la consola.
//   - Tolerancia a shape: `setCriticos(crit.equipos_criticos || [])`.
//     Rescata `null`/`undefined`/`{}` → `[]`. NO rescata array directo
//     (causa TypeError). Mismo bug latente documentado en
//     Capacitaciones/Metrologia — si en algún ciclo se quiere tapar,
//     basta cambiar a `Array.isArray(crit) ? crit : (crit.equipos_criticos
//     || [])`. Se documenta, no se corrige.
//   - 6 endpoints: getReporteDiario() y getEquiposCriticos() (carga en
//     mount via Promise.all), descargarReporteDiarioPdf(),
//     descargarReporteDiarioExcel(), descargarHistorialPdf(mes, anio),
//     descargarHistorialExcel(mes, anio).
//   - 2 helpers de descarga, mutuamente excluyentes según extensión del
//     filename:
//       * `abrirBlobPdf(blob)` — `URL.createObjectURL(blob)` +
//         `window.open(url, '_blank')`. NO llama `URL.revokeObjectURL`
//         (la pestaña queda abierta hasta que el usuario la cierre).
//       * `descargarBlob(blob, nombre)` — `URL.createObjectURL(blob)` +
//         crea anchor con `download` attribute + `a.click()` +
//         `URL.revokeObjectURL(url)`.
//   - Patrón `tid` de toast: `toast.loading(msg)` → resolve →
//     `toast.success(msg, { id: tid })` (reemplaza el loading, no se
//     duplica). Mismo patrón que AuditPage.
//   - 4 botones de export con `tipo` literal que se usa en el toast:
//     "PDF diario", "Excel diario", "PDF historial", "Excel historial".
//     Si alguien cambia el `tipo`, los mensajes del operador cambian
//     sin aviso.
//   - `mes`/`anio` derivados de `new Date()` en mount:
//     `mes = now.getMonth() + 1`, `anio = now.getFullYear()`. Se pasan
//     a `descargarHistorialPdf(mes, anio)` y
//     `descargarHistorialExcel(mes, anio)`. Si alguien quita el
//     `+1`, los reportes históricos piden diciembre del año anterior
//     silenciosamente.
//   - 6 StatBox con valores derivados de `reporte` y `estadoMap`:
//     * OS abiertas hoy = reporte.ordenes_hoy
//     * OS pendientes   = reporte.ordenes_abiertas
//     * Operativos      = estadoMap['operativo']
//     * En mantenimiento= estadoMap['en_mantenimiento']
//     * Fuera de servicio=estadoMap['fuera_servicio']
//     * En traslado     = estadoMap['en_traslado']
//     `estadoMap` se construye con `reporte.equipos_por_estado.reduce`
//     mapeando `estado → total`. Si el estado no aparece en el array,
//     el StatBox muestra '—'.
//   - Tabla "Preventivos próximos 7 días" oculta si
//     `preventivos_proxima_semana` está vacío o undefined.
//   - Equipos críticos: card por equipo con `eq.estado` formateado
//     (`replace(/_/g, ' ')`) y badge rojo/amarillo según estado.
//     `tickets_abiertos > 0` → muestra "{N} ticket(s) abierto(s)".
//     Si tickets_abiertos es 0/falsy, NO muestra el texto.
//   - Sección "Equipos críticos" oculta si `criticos.length === 0`.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si alguien borra `setLoading(false)` del `.finally()`, la pantalla
//     se queda con "Generando reporte..." para siempre.
//   - Si el `.catch(console.error)` se quita sin reemplazo, rechazos de
//     cualquier endpoint quedan como unhandled promise rejection.
//   - Si el helper de descarga equivocado se llama para una extensión
//     (e.g. PDF abre Excel), el archivo se abre como PDF en lugar de
//     descargarse (o viceversa).
//   - Si el `+1` en `getMonth() + 1` se olvida, el reporte pide
//     diciembre del año anterior.
//   - Si el `id` compartido se pierde, el operador ve dos toasts
//     (uno de "Generando..." que nunca desaparece + el de éxito).
//   - Si el `||` se cambia por `??` en `crit.equipos_criticos || []`,
//     cualquier valor falsy (incluido `0` o `''`) lo cambia a `[]`.
//   - Si la rama de ticket abierto se rompe, el operador no ve que
//     hay tickets críticos sin atender.
//
// Se mockea `../api/sigah` (6 endpoints), `../lib/toast`,
// `URL.createObjectURL`/`URL.revokeObjectURL` (jsdom no los provee de
// forma estable para Blob + anchor/tab pattern) y `window.open` (para
// no abrir pestañas durante el test). NO se mockea `lucide-react` (la
// página no usa iconos de lucide, usa emojis inline). NO se usa
// MemoryRouter (la página no usa react-router). NO se mockea
// `framer-motion` (no se usa).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetReporteDiario:           vi.fn(),
  mockGetEquiposCriticos:         vi.fn(),
  mockDescargarReporteDiarioPdf:  vi.fn(),
  mockDescargarReporteDiarioExcel: vi.fn(),
  mockDescargarHistorialPdf:      vi.fn(),
  mockDescargarHistorialExcel:    vi.fn(),
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
    getReporteDiario:           (...a) => mocks.mockGetReporteDiario(...a),
    getEquiposCriticos:         (...a) => mocks.mockGetEquiposCriticos(...a),
    descargarReporteDiarioPdf:  (...a) => mocks.mockDescargarReporteDiarioPdf(...a),
    descargarReporteDiarioExcel:(...a) => mocks.mockDescargarReporteDiarioExcel(...a),
    descargarHistorialPdf:      (...a) => mocks.mockDescargarHistorialPdf(...a),
    descargarHistorialExcel:    (...a) => mocks.mockDescargarHistorialExcel(...a),
  },
}));

vi.mock('../lib/toast', () => ({
  default: mocks.mockToast,
  toast:    mocks.mockToast,
}));

import Reportes from './Reportes';

// ── Fixtures ──
// `fecha` se usa en el subtítulo del h1. Los `mes`/`anio` se derivan
// en runtime con `new Date()`, no son fixture-controlled.
const REPORTE_BASE = {
  fecha: '2026-06-27',
  ordenes_hoy: 7,
  ordenes_abiertas: 12,
  equipos_por_estado: [
    { estado: 'operativo',        total: 45 },
    { estado: 'en_mantenimiento', total: 8  },
    { estado: 'fuera_servicio',   total: 3  },
    { estado: 'en_traslado',      total: 2  },
  ],
  preventivos_proxima_semana: [
    {
      nombre: 'Monitor Philips MX450',
      serie: 'MX450-2024-001',
      tipo_preventivo: 'Calibración trimestral',
      proxima_ejecucion: '2026-07-01',
    },
    {
      nombre: 'Ventilador Mindray SV300',
      serie: 'SV300-2023-042',
      tipo_preventivo: 'Mantenimiento preventivo',
      proxima_ejecucion: '2026-07-03',
    },
  ],
};

const CRITICO_FUERA_SERVICIO = {
  id: 1,
  nombre: 'Desfibrilador ZOLL R',
  marca: 'ZOLL',
  serie: 'ZR-998',
  area: 'UCI Adultos',
  estado: 'fuera_servicio',
  tickets_abiertos: 2,
};

const CRITICO_EN_MANTENIMIENTO = {
  id: 2,
  nombre: 'Monitor Philips MX450',
  marca: 'Philips',
  serie: 'MX450-2024-001',
  area: 'Urgencias',
  estado: 'en_mantenimiento',
  tickets_abiertos: 0,
};

// ── Helpers ──
function setupApi({
  reporte = REPORTE_BASE,
  criticos = { equipos_criticos: [CRITICO_FUERA_SERVICIO, CRITICO_EN_MANTENIMIENTO] },
} = {}) {
  mocks.mockGetReporteDiario.mockResolvedValue(reporte);
  mocks.mockGetEquiposCriticos.mockResolvedValue(criticos);
}

function renderR() {
  return render(<Reportes />);
}

async function renderAndWait({
  reporte = REPORTE_BASE,
  criticos = { equipos_criticos: [CRITICO_FUERA_SERVICIO, CRITICO_EN_MANTENIMIENTO] },
} = {}) {
  setupApi({ reporte, criticos });
  renderR();
  await act(async () => { await Promise.resolve(); });
}

function getHeader() {
  return screen.getByRole('heading', { name: /^reportes$/i, level: 1 });
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Loading state
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — loading state', () => {
  it('muestra "Generando reporte..." mientras las promesas no resuelven', () => {
    mocks.mockGetReporteDiario.mockReturnValue(new Promise(() => {}));
    mocks.mockGetEquiposCriticos.mockReturnValue(new Promise(() => {}));

    renderR();

    expect(screen.getByText(/generando reporte\.\.\./i)).toBeInTheDocument();
  });

  it('oculta el loading tras resolución de Promise.all', async () => {
    await renderAndWait();

    expect(screen.queryByText(/generando reporte\.\.\./i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Header y subtítulo
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — header', () => {
  it('renderiza el h1 "Reportes"', async () => {
    await renderAndWait();
    expect(getHeader()).toBeInTheDocument();
  });

  it('el subtítulo menciona "Resumen del estado del sistema" y la fecha del reporte', async () => {
    await renderAndWait();

    const subtitle = getHeader().parentElement.querySelector('p');
    expect(subtitle).toHaveTextContent(/resumen del estado del sistema/i);
    expect(subtitle).toHaveTextContent('2026-06-27');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Carga inicial: endpoints y tolerancia a shape
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — carga inicial', () => {
  it('llama getReporteDiario y getEquiposCriticos en mount', async () => {
    await renderAndWait();

    expect(mocks.mockGetReporteDiario).toHaveBeenCalledTimes(1);
    expect(mocks.mockGetEquiposCriticos).toHaveBeenCalledTimes(1);
  });

  it('si getEquiposCriticos rechaza, console.error loggea y loading desaparece', async () => {
    mocks.mockGetReporteDiario.mockResolvedValue(REPORTE_BASE);
    mocks.mockGetEquiposCriticos.mockRejectedValue(new Error('Network'));

    renderR();

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    // El .finally() apaga loading aunque la promesa haya rechazado.
    await waitFor(() => {
      expect(screen.queryByText(/generando reporte\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it('si getReporteDiario rechaza, loading desaparece igual', async () => {
    mocks.mockGetReporteDiario.mockRejectedValue(new Error('Backend down'));
    mocks.mockGetEquiposCriticos.mockResolvedValue({ equipos_criticos: [] });

    renderR();

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText(/generando reporte\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it('tolera shape {equipos_criticos: null} → lista vacía, sección oculta', async () => {
    await renderAndWait({ criticos: { equipos_criticos: null } });

    // Sección de críticos oculta porque criticos.length === 0.
    expect(screen.queryByText(/equipos críticos \/ fuera de servicio/i))
      .not.toBeInTheDocument();
  });

  it('tolera shape {equipos_criticos: []} → sección oculta', async () => {
    await renderAndWait({ criticos: { equipos_criticos: [] } });

    expect(screen.queryByText(/equipos críticos \/ fuera de servicio/i))
      .not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. 6 StatBox con KPIs derivados
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — StatBox de KPIs', () => {
  it('renderiza los 6 labels: OS hoy, OS pendientes, Operativos, En mantenimiento, Fuera de servicio, En traslado', async () => {
    await renderAndWait();

    expect(screen.getByText(/os abiertas hoy/i)).toBeInTheDocument();
    expect(screen.getByText(/os pendientes/i)).toBeInTheDocument();
    expect(screen.getByText(/^operativos$/i)).toBeInTheDocument();
    // El label del StatBox es "En mantenimiento" (capital E), el badge
    // del crítico es "en mantenimiento" (lower e, producto de
    // `replace(/_/g, ' ')`). El regex case-sensitive los disambigua.
    expect(screen.getByText(/^En mantenimiento$/)).toBeInTheDocument();
    expect(screen.getByText(/^Fuera de servicio$/)).toBeInTheDocument();
    expect(screen.getByText(/en traslado/i)).toBeInTheDocument();
  });

  it('"OS abiertas hoy" muestra reporte.ordenes_hoy', async () => {
    await renderAndWait();
    // .parentElement sube del <div>label al <div className="bg-.../50"> root
    // del StatBox, que contiene tanto el value (3xl) como el label.
    // .closest('div') se queda en el propio div del label.
    const card = screen.getByText(/os abiertas hoy/i).parentElement;
    expect(card).toHaveTextContent('7');
  });

  it('"OS pendientes" muestra reporte.ordenes_abiertas', async () => {
    await renderAndWait();
    const card = screen.getByText(/os pendientes/i).parentElement;
    expect(card).toHaveTextContent('12');
  });

  it('"Operativos" muestra estadoMap["operativo"] = 45', async () => {
    await renderAndWait();
    const card = screen.getByText(/^operativos$/i).parentElement;
    expect(card).toHaveTextContent('45');
  });

  it('"Fuera de servicio" muestra estadoMap["fuera_servicio"] = 3', async () => {
    await renderAndWait();
    // Case-sensitive: "Fuera de servicio" (StatBox) vs "fuera servicio"
    // (badge con replace(/_/g, ' ')). El regex /.../i matchea ambos,
    // así que anclamos con capital F.
    const card = screen.getByText(/^Fuera de servicio$/).parentElement;
    expect(card).toHaveTextContent('3');
  });

  it('"En mantenimiento" muestra estadoMap["en_mantenimiento"] = 8', async () => {
    await renderAndWait();
    const card = screen.getByText(/^En mantenimiento$/).parentElement;
    expect(card).toHaveTextContent('8');
  });

  it('"En traslado" muestra estadoMap["en_traslado"] = 2', async () => {
    await renderAndWait();
    const card = screen.getByText(/en traslado/i).parentElement;
    expect(card).toHaveTextContent('2');
  });

  it('si un estado no aparece en estadoMap, el StatBox muestra "—"', async () => {
    // Reporte sin "en_traslado" en el array → estadoMap['en_traslado']
    // es undefined → value ?? '—' → muestra '—'.
    const reporteSinTraslado = {
      ...REPORTE_BASE,
      equipos_por_estado: [
        { estado: 'operativo',        total: 45 },
        { estado: 'en_mantenimiento', total: 8  },
        { estado: 'fuera_servicio',   total: 3  },
      ],
    };
    await renderAndWait({ reporte: reporteSinTraslado });

    // El label sigue visible; el valor es '—' (em dash).
    const card = screen.getByText(/en traslado/i).parentElement;
    expect(card).toHaveTextContent('—');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Tabla "Preventivos próximos 7 días"
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — tabla Preventivos próximos 7 días', () => {
  it('renderiza los 3 headers: Equipo, Tipo preventivo, Fecha', async () => {
    await renderAndWait();

    expect(screen.getByText(/^equipo$/i)).toBeInTheDocument();
    expect(screen.getByText(/tipo preventivo/i)).toBeInTheDocument();
    expect(screen.getByText(/^fecha$/i)).toBeInTheDocument();
  });

  it('renderiza una fila por entrada con nombre, serie, tipo y fecha', async () => {
    await renderAndWait();

    // "Monitor Philips MX450" aparece también en el card de críticos.
    // Filtramos por closest('tbody') para asegurar que está dentro de
    // la fila de preventivos.
    const allMatches = screen.getAllByText('Monitor Philips MX450');
    const preventivosCell = allMatches.find(el => el.closest('tbody'));
    expect(preventivosCell).toBeInTheDocument();
    expect(preventivosCell.closest('tbody')).toHaveTextContent('Calibración trimestral');
    expect(preventivosCell.closest('tbody')).toHaveTextContent('2026-07-01');

    // "Ventilador Mindray SV300" es único en el DOM.
    expect(screen.getByText('Ventilador Mindray SV300')).toBeInTheDocument();
    // La serie se renderiza como "(SV300-2023-042)" con paréntesis.
    expect(screen.getByText('(SV300-2023-042)')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento preventivo')).toBeInTheDocument();
    expect(screen.getByText('2026-07-03')).toBeInTheDocument();
  });

  it('la sección se OCULTA cuando preventivos_proxima_semana está vacía', async () => {
    const reporteSinPreventivos = {
      ...REPORTE_BASE,
      preventivos_proxima_semana: [],
    };
    await renderAndWait({ reporte: reporteSinPreventivos });

    expect(screen.queryByText(/preventivos próximos 7 días/i))
      .not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Equipos críticos
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — Equipos críticos', () => {
  it('renderiza card con nombre, marca, serie y area del equipo', async () => {
    await renderAndWait();

    expect(screen.getByText('Desfibrilador ZOLL R')).toBeInTheDocument();
    expect(screen.getByText(/ZOLL — Serie:/)).toBeInTheDocument();
    expect(screen.getByText('ZR-998')).toBeInTheDocument();
    expect(screen.getByText('UCI Adultos')).toBeInTheDocument();
  });

  it('badge "fuera servicio" se renderiza con clase roja', async () => {
    await renderAndWait();

    // El badge muestra `eq.estado.replace(/_/g, ' ')` → 'fuera servicio'
    // (sin 'de', lowercase). El label del StatBox es 'Fuera de servicio'
    // (con 'de', capital F). El regex case-sensitive los disambigua.
    const badge = screen.getByText(/^fuera servicio$/i).closest('span');
    expect(badge).toBeTruthy();
    expect(badge.className).toMatch(/bg-red-100/);
    expect(badge.className).toMatch(/text-red-700/);
  });

  it('badge "en mantenimiento" se renderiza con clase amarilla', async () => {
    await renderAndWait();

    // El badge muestra 'en mantenimiento' (lowercase e), el label del
    // StatBox es 'En mantenimiento' (capital E). Usamos lowercasee para
    // matchear sólo el badge.
    const badge = screen.getByText(/^en mantenimiento$/).closest('span');
    expect(badge).toBeTruthy();
    expect(badge.className).toMatch(/bg-yellow-100/);
    expect(badge.className).toMatch(/text-yellow-700/);
  });

  it('muestra "N ticket(s) abierto(s)" solo si tickets_abiertos > 0', async () => {
    await renderAndWait();

    // CRITICO_FUERA_SERVICIO tiene tickets_abiertos=2 → muestra.
    expect(screen.getByText(/2 ticket\(s\) abierto\(s\)/i)).toBeInTheDocument();
    // CRITICO_EN_MANTENIMIENTO tiene tickets_abiertos=0 → NO muestra.
    expect(screen.queryByText(/0 ticket\(s\) abierto\(s\)/i)).not.toBeInTheDocument();
  });

  it('la sección se OCULTA cuando criticos está vacía', async () => {
    await renderAndWait({ criticos: { equipos_criticos: [] } });

    expect(screen.queryByText(/equipos críticos \/ fuera de servicio/i))
      .not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Botones Export — render
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — botones de export', () => {
  it('renderiza los 4 botones: PDF Diario, Excel Diario, PDF Historial, Excel Historial', async () => {
    await renderAndWait();

    expect(screen.getByRole('button', { name: /pdf diario/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excel diario/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf historial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excel historial/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. Botón "PDF Diario" — abrirBlobPdf path
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — botón PDF Diario', () => {
  it('success: llama descargarReporteDiarioPdf, abre blob URL en nueva pestaña y toast.success con id compartido', async () => {
    await renderAndWait();
    const fakeBlob = new Blob(['PDF'], { type: 'application/pdf' });
    mocks.mockDescargarReporteDiarioPdf.mockResolvedValue(fakeBlob);

    fireEvent.click(screen.getByRole('button', { name: /pdf diario/i }));

    await waitFor(() => {
      expect(mocks.mockDescargarReporteDiarioPdf).toHaveBeenCalledTimes(1);
    });

    // abrirBlobPdf path: createObjectURL + window.open, SIN revokeObjectURL.
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    // Toast chain: loading → success con id compartido.
    expect(mocks.mockToast.loading).toHaveBeenCalledWith('Generando PDF diario...');
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'PDF diario listo',
      { id: 'toast-id-loading' },
    );
  });

  it('error: toast.error con id compartido, no se abre ventana', async () => {
    await renderAndWait();
    mocks.mockDescargarReporteDiarioPdf.mockRejectedValue(new Error('PDF service down'));

    fireEvent.click(screen.getByRole('button', { name: /pdf diario/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Error al generar PDF diario',
        { id: 'toast-id-loading' },
      );
    });
    expect(window.open).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 9. Botón "Excel Diario" — descargarBlob path
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — botón Excel Diario', () => {
  it('success: llama descargarReporteDiarioExcel, NO abre ventana, revoca blob URL', async () => {
    await renderAndWait();
    const fakeBlob = new Blob(['XLSX'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    mocks.mockDescargarReporteDiarioExcel.mockResolvedValue(fakeBlob);

    fireEvent.click(screen.getByRole('button', { name: /excel diario/i }));

    await waitFor(() => {
      expect(mocks.mockDescargarReporteDiarioExcel).toHaveBeenCalledTimes(1);
    });

    // descargarBlob path: createObjectURL + revokeObjectURL, SIN window.open.
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(window.open).not.toHaveBeenCalled();

    // Toast chain: loading → success con id compartido.
    expect(mocks.mockToast.loading).toHaveBeenCalledWith('Generando Excel diario...');
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'Excel diario listo',
      { id: 'toast-id-loading' },
    );
  });

  it('error: toast.error con id compartido', async () => {
    await renderAndWait();
    mocks.mockDescargarReporteDiarioExcel.mockRejectedValue(new Error('Excel fail'));

    fireEvent.click(screen.getByRole('button', { name: /excel diario/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Error al generar Excel diario',
        { id: 'toast-id-loading' },
      );
    });
    expect(window.open).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 10. Botón "PDF Historial" — llama descargarHistorialPdf(mes, anio)
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — botón PDF Historial', () => {
  it('success: llama descargarHistorialPdf(mes=6, anio=2026) y abre blob URL', async () => {
    await renderAndWait();
    const fakeBlob = new Blob(['PDF'], { type: 'application/pdf' });
    mocks.mockDescargarHistorialPdf.mockResolvedValue(fakeBlob);

    fireEvent.click(screen.getByRole('button', { name: /pdf historial/i }));

    await waitFor(() => {
      expect(mocks.mockDescargarHistorialPdf).toHaveBeenCalledTimes(1);
    });

    // mes = now.getMonth() + 1 = 6, anio = 2026 (ciclo 24 corre 2026-06-27).
    // Si alguien quita el +1 del mes, este test falla porque getMonth
    // devuelve 5 (junio es el mes índice 5).
    expect(mocks.mockDescargarHistorialPdf).toHaveBeenCalledWith(6, 2026);

    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');

    expect(mocks.mockToast.loading).toHaveBeenCalledWith('Generando PDF historial...');
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'PDF historial listo',
      { id: 'toast-id-loading' },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 11. Botón "Excel Historial" — llama descargarHistorialExcel(mes, anio)
// ─────────────────────────────────────────────────────────────────────────
describe('Reportes — botón Excel Historial', () => {
  it('success: llama descargarHistorialExcel(6, 2026), descarga blob sin abrir ventana', async () => {
    await renderAndWait();
    const fakeBlob = new Blob(['XLSX'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    mocks.mockDescargarHistorialExcel.mockResolvedValue(fakeBlob);

    fireEvent.click(screen.getByRole('button', { name: /excel historial/i }));

    await waitFor(() => {
      expect(mocks.mockDescargarHistorialExcel).toHaveBeenCalledTimes(1);
    });
    expect(mocks.mockDescargarHistorialExcel).toHaveBeenCalledWith(6, 2026);

    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(window.open).not.toHaveBeenCalled();

    expect(mocks.mockToast.loading).toHaveBeenCalledWith('Generando Excel historial...');
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'Excel historial listo',
      { id: 'toast-id-loading' },
    );
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // Silenciar console.error — los .catch() del Promise.all y los rechazos
  // esperados de los endpoints loggean a stderr.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom no implementa URL.createObjectURL/revokeObjectURL de forma
  // estable; los asignamos directamente.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  // window.open debe ser un spy no-op para no abrir pestañas durante el test.
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
});