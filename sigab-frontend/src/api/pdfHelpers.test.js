// npx vitest run src/api/pdfHelpers.test.js
// Cobertura de los helpers PDF iOS-safe (prepararVentanaPdf/abrirPdf/
// triggerDownload) de api/sigab.js. Regla dura del proyecto: "NUNCA rompas
// el flujo de PDFs iOS" — este archivo existía sin ningún test hasta ahora.
//
// `isIOS` se calcula UNA vez al top-level del módulo a partir de
// `navigator`, así que cada grupo de tests stubea `navigator` con
// vi.stubGlobal ANTES de un `vi.resetModules()` + import dinámico, para que
// el módulo se reevalúe con el navigator correcto.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const NAVIGATOR_DESKTOP = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  platform: 'Win32',
  maxTouchPoints: 0,
};

const NAVIGATOR_IPHONE = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  platform: 'iPhone',
  maxTouchPoints: 5,
};

// iPad moderno: se anuncia como Mac, se distingue por multitouch (ver
// comentario original en api/sigab.js).
const NAVIGATOR_IPAD_DESKTOP_UA = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  platform: 'MacIntel',
  maxTouchPoints: 5,
};

async function importFreshApi(navigatorStub) {
  vi.resetModules();
  vi.stubGlobal('navigator', { ...navigatorStub });
  const mod = await import('./sigab.js');
  return mod.api;
}

function makeFakeDocument() {
  const link = { href: '', download: '', click: vi.fn() };
  return {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
    __link: link,
  };
}

const blob = { type: 'application/pdf' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('prepararVentanaPdf', () => {
  it('no-iOS: abre la pestaña síncrona antes del fetch (contra popup blocker)', async () => {
    const api = await importFreshApi(NAVIGATOR_DESKTOP);
    const fakeWin = { closed: false };
    const open = vi.fn(() => fakeWin);
    vi.stubGlobal('window', { open });

    const result = api.prepararVentanaPdf();

    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(result).toBe(fakeWin);
  });

  it('iOS (iPhone): NO abre ventana — se usa share sheet nativo después', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const open = vi.fn();
    vi.stubGlobal('window', { open });

    const result = api.prepararVentanaPdf();

    expect(open).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('iOS (iPad anunciado como Mac + multitouch): NO abre ventana', async () => {
    const api = await importFreshApi(NAVIGATOR_IPAD_DESKTOP_UA);
    const open = vi.fn();
    vi.stubGlobal('window', { open });

    expect(api.prepararVentanaPdf()).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });
});

describe('abrirPdf', () => {
  it('no-iOS con ventana pre-abierta viva: navega esa ventana, no abre otra', async () => {
    const api = await importFreshApi(NAVIGATOR_DESKTOP);
    const open = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const win = { closed: false, location: '' };

    await api.abrirPdf(blob, 'reporte.pdf', win);

    expect(win.location).toBe('blob:fake-url');
    expect(open).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('no-iOS con ventana ya cerrada por el popup blocker: cae a window.open', async () => {
    const api = await importFreshApi(NAVIGATOR_DESKTOP);
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fake-url', revokeObjectURL: vi.fn() });
    const win = { closed: true };

    await api.abrirPdf(blob, 'reporte.pdf', win);

    expect(open).toHaveBeenCalledWith('blob:fake-url', '_blank');
  });

  it('no-iOS sin ventana previa (win=null): abre directo con window.open', async () => {
    const api = await importFreshApi(NAVIGATOR_DESKTOP);
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fake-url', revokeObjectURL: vi.fn() });

    await api.abrirPdf(blob, 'reporte.pdf');

    expect(open).toHaveBeenCalledWith('blob:fake-url', '_blank');
  });

  it('iOS con share sheet disponible: usa navigator.share y NO toca URL.createObjectURL/window.open', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const open = vi.fn();
    const createObjectURL = vi.fn();
    const share = vi.fn(() => Promise.resolve());
    const canShare = vi.fn(() => true);
    class FakeFile {
      constructor(parts, name, opts) { this.name = name; this.type = opts?.type; }
    }
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal('File', FakeFile);
    vi.stubGlobal('navigator', { ...NAVIGATOR_IPHONE, share, canShare });

    await api.abrirPdf(blob, 'reporte.pdf');

    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(FakeFile)] });
    expect(share).toHaveBeenCalledWith({ files: [expect.any(FakeFile)] });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('iOS: usuario cancela el share sheet (AbortError) → no cae a ningún fallback', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const open = vi.fn();
    const createObjectURL = vi.fn();
    const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const share = vi.fn(() => Promise.reject(abortError));
    const canShare = vi.fn(() => true);
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal('File', class { constructor(parts, name, opts) { this.name = name; this.type = opts?.type; } });
    vi.stubGlobal('navigator', { ...NAVIGATOR_IPHONE, share, canShare });

    await api.abrirPdf(blob, 'reporte.pdf');

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('iOS: share() falla con un error distinto de AbortError → cae al flujo de blob URL', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const open = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:fallback-url');
    const share = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    const canShare = vi.fn(() => true);
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal('File', class { constructor(parts, name, opts) { this.name = name; this.type = opts?.type; } });
    vi.stubGlobal('navigator', { ...NAVIGATOR_IPHONE, share, canShare });

    await api.abrirPdf(blob, 'reporte.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(open).toHaveBeenCalledWith('blob:fallback-url', '_blank');
  });

  it('iOS sin soporte real de canShare para archivos: cae al flujo de blob URL', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const open = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:fallback-url');
    const canShare = vi.fn(() => false);
    vi.stubGlobal('window', { open });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal('File', class { constructor(parts, name, opts) { this.name = name; this.type = opts?.type; } });
    vi.stubGlobal('navigator', { ...NAVIGATOR_IPHONE, canShare });

    await api.abrirPdf(blob, 'reporte.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(open).toHaveBeenCalledWith('blob:fallback-url', '_blank');
  });
});

describe('triggerDownload', () => {
  it('no-iOS: crea <a download> temporal, hace click y revoca el blob URL después', async () => {
    const api = await importFreshApi(NAVIGATOR_DESKTOP);
    const createObjectURL = vi.fn(() => 'blob:descarga-url');
    const revokeObjectURL = vi.fn();
    const doc = makeFakeDocument();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('document', doc);

    await api.triggerDownload(blob, 'reporte.xlsx');

    expect(doc.__link.href).toBe('blob:descarga-url');
    expect(doc.__link.download).toBe('reporte.xlsx');
    expect(doc.__link.click).toHaveBeenCalledTimes(1);
    expect(doc.body.appendChild).toHaveBeenCalledWith(doc.__link);
    expect(doc.body.removeChild).toHaveBeenCalledWith(doc.__link);

    vi.advanceTimersByTime(60000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:descarga-url');
  });

  it('iOS con share sheet disponible: usa navigator.share, no crea <a>', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const doc = makeFakeDocument();
    const share = vi.fn(() => Promise.resolve());
    const canShare = vi.fn(() => true);
    vi.stubGlobal('document', doc);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
    vi.stubGlobal('File', class { constructor(parts, name, opts) { this.name = name; this.type = opts?.type; } });
    vi.stubGlobal('navigator', { ...NAVIGATOR_IPHONE, share, canShare });

    await api.triggerDownload(blob, 'reporte.xlsx');

    expect(share).toHaveBeenCalledTimes(1);
    expect(doc.createElement).not.toHaveBeenCalled();
  });

  it('iOS: share() falla con error distinto de AbortError → cae a <a download>', async () => {
    const api = await importFreshApi(NAVIGATOR_IPHONE);
    const doc = makeFakeDocument();
    const createObjectURL = vi.fn(() => 'blob:fallback-descarga');
    const share = vi.fn(() => Promise.reject(new Error('boom')));
    const canShare = vi.fn(() => true);
    vi.stubGlobal('document', doc);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal('File', class { constructor(parts, name, opts) { this.name = name; this.type = opts?.type; } });
    vi.stubGlobal('navigator', { ...NAVIGATOR_IPHONE, share, canShare });

    await api.triggerDownload(blob, 'reporte.xlsx');

    expect(doc.__link.href).toBe('blob:fallback-descarga');
    expect(doc.__link.click).toHaveBeenCalledTimes(1);
  });
});
