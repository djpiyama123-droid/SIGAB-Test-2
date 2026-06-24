// src/pages/AuditPage.test.jsx
// AuditPage es el Centro de Auditoría NOM-016 Compliance: bitácora inalterable
// con hashing encadenado SHA-256. Concentra varios patrones:
//
//   - 3 endpoints de API: getAuditLogs (carga inicial), verificarCadena (botón
//     "Verificar Cadena de Bloques"), descargarBitacoraPdf (botón "Generar
//     Bitácora PDF" con Blob + window.open).
//   - 2 useState (logs, verification) + loading local en handleVerify.
//   - Tabla con badges de acción coloreados: INSERT (verde), UPDATE (azul),
//     DELETE (rojo), default (slate).
//   - Alert de verificación CONDICIONAL a `verification` truthy, con borde
//     verde o rojo según `integridad_ok`, ícono distinto en cada rama.
//   - Toast.loading + Toast.success / Toast.error con id compartido para
//     reemplazar el toast de loading (patrón `tid`).
//   - Tolerancia a dos shapes de respuesta: `{logs: [...]}` o
//     `{eventos: [...]}` (fallback con `||`).
//   - Botón Verificar se DISABILITA durante la verificación
//     (`disabled={loading}`).
//
// Riesgos silenciosos que un test atrapa:
//   - Si alguien borra `data.logs || data.eventos` el operador ve tabla
//     vacía aunque la API sí devolvió eventos.
//   - Si el botón Verificar no se deshabilita, el operador puede spamear
//     el endpoint durante la verificación y saturar el backend.
//   - Si la cadena `toast.loading(id) → toast.success(_, { id })` se rompe,
//     el operador ve dos toasts en cascada (uno de "Verificando…" que
//     nunca desaparece + el de éxito).
//   - Si la URL.createObjectURL no se llama antes de window.open, el
//     operador hace click en "Generar Bitácora PDF" y nada se descarga.
//   - Si alguien quita el fallback 'SISTEMA' para logs sin usuario_nombre,
//     la celda queda vacía y se pierde la trazabilidad.
//
// Se mockea `../api/sigah` (3 endpoints), `../components/Toast` y
// `URL.createObjectURL` + `window.open` (jsdom no los provee de forma
// estable para el patrón Blob + window.open).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockGetAuditLogs:         vi.fn(),
  mockVerificarCadena:      vi.fn(),
  mockDescargarBitacoraPdf: vi.fn(),
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
    getAuditLogs:         (...a) => mocks.mockGetAuditLogs(...a),
    verificarCadena:      (...a) => mocks.mockVerificarCadena(...a),
    descargarBitacoraPdf: (...a) => mocks.mockDescargarBitacoraPdf(...a),
  },
}));

vi.mock('../components/Toast', () => ({
  ToastProvider: ({ children }) => children,
  useToast:      () => mocks.mockToast,
  default:       mocks.mockToast,
}));

// AuditPage importa `toast` directamente desde '../lib/toast' (no usa
// useToast()), así que hay que mockear ese path también para capturar
// las llamadas a toast.loading/success/error de handleVerify y
// handleGenerarBitacora.
vi.mock('../lib/toast', () => ({
  default: {
    success: (...a) => mocks.mockToast.success(...a),
    error:   (...a) => mocks.mockToast.error(...a),
    info:    (...a) => mocks.mockToast.info(...a),
    warning: (...a) => mocks.mockToast.warning(...a),
    loading: (...a) => mocks.mockToast.loading(...a),
    dismiss: (...a) => mocks.mockToast.dismiss(...a),
  },
}));

import AuditPage from './AuditPage';

// ── Fixtures ──
const LOG_INSERT = {
  id: 1,
  timestamp: '2026-06-24T10:30:00Z',
  usuario_nombre: 'Dr. García',
  accion: 'INSERT',
  entidad: 'Equipo',
  entidad_id: 42,
  hash_registro: 'a1b2c3d4e5f6789012345678901234567890abcdef0123456789abcdef012345',
};
const LOG_UPDATE = {
  id: 2,
  timestamp: '2026-06-24T11:15:00Z',
  usuario_nombre: 'Ing. López',
  accion: 'UPDATE',
  entidad: 'OrdenServicio',
  entidad_id: 99,
  hash_registro: 'b2c3d4e5f6789012345678901234567890abcdef0123456789abcdef01234567',
};
const LOG_DELETE = {
  id: 3,
  timestamp: '2026-06-24T12:00:00Z',
  usuario_nombre: null, // sin usuario → debe mostrar 'SISTEMA'
  accion: 'DELETE',
  entidad: 'ReporteFalla',
  entidad_id: 7,
  hash_registro: 'c3d4e5f6789012345678901234567890abcdef0123456789abcdef0123456789',
};
const LOG_OTHER = {
  id: 4,
  timestamp: '2026-06-24T13:00:00Z',
  usuario_nombre: 'SISTEMA',
  accion: 'LOGIN', // acción no mapeada → badge slate
  entidad: 'Sesion',
  entidad_id: 1,
  hash_registro: 'd4e5f6789012345678901234567890abcdef0123456789abcdef0123456789ab',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Silenciar console.error — los 3 .catch() imprimen en errores esperados.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom no implementa URL.createObjectURL de forma estable; lo asignamos
  // directamente (no se puede spyOn si la propiedad no existe en el prototipo).
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  // window.open debe ser un spy no-op para no abrir pestañas durante el test.
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
});

// Helper: renderiza y espera a que la promesa inicial de getAuditLogs se asiente.
const renderAudit = async () => {
  render(<AuditPage />);
  await act(async () => {
    await Promise.resolve();
  });
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Carga inicial de logs
// ────────────────────────────────────────────────────────────────────────────
describe('AuditPage — carga inicial de logs', () => {
  it('renderiza la tabla con 4 logs cuando la API devuelve {logs: [...]}', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({
      logs: [LOG_INSERT, LOG_UPDATE, LOG_DELETE, LOG_OTHER],
    });

    await renderAudit();

    // Header principal.
    expect(screen.getByRole('heading', { name: /auditoría nom-016 compliance/i, level: 1 }))
      .toBeInTheDocument();

    // Los 4 hashes van en el atributo `title` (el span visible los trunca
    // con `truncate w-32`); usamos getByTitle para validar el contenido real.
    expect(screen.getByTitle(LOG_INSERT.hash_registro)).toBeInTheDocument();
    expect(screen.getByTitle(LOG_UPDATE.hash_registro)).toBeInTheDocument();
    expect(screen.getByTitle(LOG_DELETE.hash_registro)).toBeInTheDocument();
    expect(screen.getByTitle(LOG_OTHER.hash_registro)).toBeInTheDocument();

    // La columna "Entidad" muestra "Equipo #42" para LOG_INSERT.
    expect(screen.getByText('Equipo')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('tolerancia: acepta la shape alternativa {eventos: [...]}', async () => {
    // Cubre el fallback `data.logs || data.eventos` — algunos endpoints
    // del backend usan "eventos" en lugar de "logs".
    mocks.mockGetAuditLogs.mockResolvedValue({
      eventos: [LOG_INSERT],
    });

    await renderAudit();

    expect(screen.getByTitle(LOG_INSERT.hash_registro)).toBeInTheDocument();
  });

  it('tolerancia: si la API no devuelve ni logs ni eventos, tabla queda vacía', async () => {
    // Cubre el caso `data.logs || data.eventos || []` cuando la respuesta
    // es `{}` o un objeto sin las keys esperadas.
    mocks.mockGetAuditLogs.mockResolvedValue({});

    await renderAudit();

    // La tabla se renderiza (header de columnas) pero el tbody está vacío.
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    // No hay hash rows visibles.
    expect(screen.queryByTitle(LOG_INSERT.hash_registro)).not.toBeInTheDocument();
  });

  it('muestra "SISTEMA" en la columna Usuario cuando usuario_nombre es null', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_DELETE] });

    await renderAudit();

    // LOG_DELETE tiene usuario_nombre=null → fallback 'SISTEMA'.
    expect(screen.getByText('SISTEMA')).toBeInTheDocument();
  });

  it('muestra error y tabla vacía si getAuditLogs rechaza', async () => {
    mocks.mockGetAuditLogs.mockRejectedValue(new Error('Network'));

    await renderAudit();

    expect(mocks.mockToast.error).toHaveBeenCalledWith(
      'No se pudo cargar la bitácora de auditoría',
    );
    // La tabla se renderiza pero el tbody queda vacío.
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.queryByText(/^a1b2c3d4/)).not.toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Badges de acción (coloreados por tipo)
// ────────────────────────────────────────────────────────────────────────────
describe('AuditPage — badges de acción', () => {
  it('INSERT lleva clase verde, UPDATE azul, DELETE rojo, default slate', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({
      logs: [LOG_INSERT, LOG_UPDATE, LOG_DELETE, LOG_OTHER],
    });

    await renderAudit();

    const insertBadge = screen.getByText('INSERT');
    const updateBadge = screen.getByText('UPDATE');
    const deleteBadge = screen.getByText('DELETE');
    const otherBadge  = screen.getByText('LOGIN');

    // Las clases exactas del componente: bg-{color}-500/10 text-{color}-600.
    expect(insertBadge.className).toMatch(/bg-emerald-500\/10/);
    expect(insertBadge.className).toMatch(/text-emerald-600/);

    expect(updateBadge.className).toMatch(/bg-blue-500\/10/);
    expect(updateBadge.className).toMatch(/text-blue-600/);

    expect(deleteBadge.className).toMatch(/bg-red-500\/10/);
    expect(deleteBadge.className).toMatch(/text-red-600/);

    // Acción no mapeada → clase slate por default.
    expect(otherBadge.className).toMatch(/bg-slate-500\/10/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Botón "Verificar Cadena de Bloques"
// ────────────────────────────────────────────────────────────────────────────
describe('AuditPage — Verificar Cadena', () => {
  it('integridad_ok=true: toast.loading → toast.success con id compartido y alert verde', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    mocks.mockVerificarCadena.mockResolvedValue({
      integridad_ok: true,
      valida: true,
      total_registros: 1234,
      mensaje: 'Cadena verificada correctamente',
    });

    await renderAudit();

    fireEvent.click(screen.getByRole('button', { name: /verificar cadena de bloques/i }));

    await waitFor(() => {
      expect(mocks.mockVerificarCadena).toHaveBeenCalledTimes(1);
    });

    // Patrón loading → success con id compartido (reemplazo, no duplicado).
    expect(mocks.mockToast.loading).toHaveBeenCalledWith(
      'Verificando integridad de la cadena SHA-256…',
    );
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'Cadena íntegra (1234 registros)',
      { id: 'toast-id-loading' },
    );

    // Alert de verificación verde con el mensaje y el total.
    expect(screen.getByText('Cadena verificada correctamente')).toBeInTheDocument();
    expect(screen.getByText(/total de registros verificados: 1234/i)).toBeInTheDocument();
  });

  it('integridad_ok=false: toast.error con mensaje del backend y alert rojo', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    mocks.mockVerificarCadena.mockResolvedValue({
      integridad_ok: false,
      valida: false,
      total_registros: 1234,
      mensaje: 'Hash no coincide en registro #567',
    });

    await renderAudit();

    fireEvent.click(screen.getByRole('button', { name: /verificar cadena de bloques/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Hash no coincide en registro #567',
        { id: 'toast-id-loading' },
      );
    });

    // Alert rojo con el mensaje de error.
    expect(screen.getByText('Hash no coincide en registro #567')).toBeInTheDocument();
  });

  it('integridad_ok=false sin mensaje: toast.error usa genérico', async () => {
    // Cubre el fallback `data.mensaje || 'Integridad comprometida'`.
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    mocks.mockVerificarCadena.mockResolvedValue({
      integridad_ok: false,
      valida: false,
      total_registros: 0,
      // sin `mensaje`
    });

    await renderAudit();

    fireEvent.click(screen.getByRole('button', { name: /verificar cadena de bloques/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'Integridad comprometida',
        { id: 'toast-id-loading' },
      );
    });
  });

  it('error de red: toast.error con id compartido y alert NO se muestra', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    mocks.mockVerificarCadena.mockRejectedValue(new Error('Network down'));

    await renderAudit();

    fireEvent.click(screen.getByRole('button', { name: /verificar cadena de bloques/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'No se pudo verificar la cadena',
        { id: 'toast-id-loading' },
      );
    });

    // El alert de verificación NO debe renderizarse (verification sigue null).
    expect(screen.queryByText(/total de registros verificados/i)).not.toBeInTheDocument();
  });

  it('botón se DISABILITA durante la verificación y se rehabilita al terminar', async () => {
    // Promesa controlada: el botón debe estar disabled mientras pending.
    let resolveVerify;
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    mocks.mockVerificarCadena.mockReturnValue(
      new Promise((res) => { resolveVerify = res; }),
    );

    await renderAudit();

    const btn = screen.getByRole('button', { name: /verificar cadena de bloques/i });
    expect(btn).not.toBeDisabled();

    fireEvent.click(btn);

    // Mientras la promesa está pending, el botón está disabled.
    await waitFor(() => {
      expect(btn).toBeDisabled();
    });

    // Resolvemos y verificamos que se rehabilita.
    await act(async () => {
      resolveVerify({
        integridad_ok: true,
        valida: true,
        total_registros: 5,
        mensaje: 'OK',
      });
    });

    await waitFor(() => {
      expect(btn).not.toBeDisabled();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Botón "Generar Bitácora PDF"
// ────────────────────────────────────────────────────────────────────────────
describe('AuditPage — Generar Bitácora PDF', () => {
  it('success: crea Blob URL, abre nueva pestaña, toast.success con id compartido', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    // descargarBitacoraPdf devuelve un Blob (en la API real es responseType: 'blob').
    const fakeBlob = new Blob(['PDF-binary'], { type: 'application/pdf' });
    mocks.mockDescargarBitacoraPdf.mockResolvedValue(fakeBlob);

    await renderAudit();

    fireEvent.click(screen.getByRole('button', { name: /generar bitácora pdf/i }));

    await waitFor(() => {
      expect(mocks.mockDescargarBitacoraPdf).toHaveBeenCalledTimes(1);
    });

    // URL.createObjectURL se llamó con el blob antes de window.open.
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    // window.open recibe la URL del blob (el marcador de mock) en nueva pestaña.
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');

    // Cadena loading → success con id compartido.
    expect(mocks.mockToast.loading).toHaveBeenCalledWith('Generando bitácora PDF…');
    expect(mocks.mockToast.success).toHaveBeenCalledWith(
      'Bitácora generada',
      { id: 'toast-id-loading' },
    );
  });

  it('error: toast.error con id compartido, no se abre ventana', async () => {
    mocks.mockGetAuditLogs.mockResolvedValue({ logs: [LOG_INSERT] });
    mocks.mockDescargarBitacoraPdf.mockRejectedValue(new Error('PDF service down'));

    await renderAudit();

    fireEvent.click(screen.getByRole('button', { name: /generar bitácora pdf/i }));

    await waitFor(() => {
      expect(mocks.mockToast.error).toHaveBeenCalledWith(
        'No se pudo generar la bitácora PDF',
        { id: 'toast-id-loading' },
      );
    });

    // window.open NO se llamó porque la promesa rechazó antes.
    expect(window.open).not.toHaveBeenCalled();
  });
});
