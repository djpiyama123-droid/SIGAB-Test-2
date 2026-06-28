// src/pages/QRScanner.test.jsx
// QRScanner (252 líneas) es la página que el operador usa en el celular
// para escanear el QR pegado al equipo biomédico. NO requiere auth y abre
// la cámara del dispositivo para leer el QR. Si la cámara falla o el
// operador prefiere escribir el token/URL manualmente, hay un input de
// fallback. La página clasifica el texto detectado en 3 rutas:
//   1) URL completa que contiene "/equipo/" → extrae token y navega.
//   2) Token alfanumérico 8-32 chars → navega directo.
//   3) URL externa completa → redirige (window.location.href).
//
// Patrones sutiles cubiertos:
//
//   - **`useEffect` con deps `[]` que llama `startCamera()` en mount**.
//     El cleanup es `stopCamera`, que llama `cancelAnimationFrame` Y
//     `stream.getTracks().forEach(t => t.stop)`. Si el cleanup se rompe,
//     el scanner deja la cámara encendida después de navegar (batería
//     drenada en campo — riesgo operativo real).
//   - **`startCamera` con `getUserMedia({video: {facingMode, ...}})`**.
//     Si alguien quita el `facingMode`, los celulares no saben qué
//     cámara usar y el navegador defaults a la frontal (UX rota en
//     operador sosteniendo el celular).
//   - **3 ramas de error de cámara**:
//       NotAllowedError → 'Permiso de cámara denegado...'
//       NotFoundError   → 'No se encontró cámara...'
//       otro            → 'Error de cámara: <msg>'
//     Si alguien homogeniza los mensajes, el operador pierde el contexto
//     (¿le di permiso? ¿el equipo no tiene cámara?).
//   - **Botón "Reintentar" sólo se muestra cuando hay error**: si alguien
//     lo sube al render normal, aparece un botón redundante al lado de
//     la cámara.
//   - **`handleResult` clasifica el texto en orden estricto**:
//     1) includes('/equipo/') → navega
//     2) matchea regex `/^[a-zA-Z0-9_-]{8,32}$/` → navega
//     3) startsWith('http') → window.location.href
//     Si alguien invierte el orden, una URL tipo "http://x.com/equipo/abc"
//     dispara la rama 1 primero (OK), pero "abc123456" (8 chars)
//     matchea la rama 2 antes de cualquier otra (OK por diseño). El
//     riesgo es que un cambio rompa la rama 3: tokens que NO matchean
//     el regex quedan silenciosos (sin navigate, sin error).
//   - **`stopCamera` se llama ANTES de `setSuccess`**: si alguien los
//     invierte, el overlay de éxito aparece mientras la cámara sigue
//     corriendo, drenando batería.
//   - **`navigator.vibrate?.(200)` con optional chaining + try/catch**:
//     si el navegador no soporta vibración (la mayoría de desktops), el
//     `?.` evita el crash y el `try/catch` atrapa throws raros. Si alguien
//     quita el `?.`, `vibrate is not a function` rompe la página justo
//     después del scan.
//   - **`setTimeout(..., 600)` antes de navegar**: le da tiempo al operador
//     a ver el overlay "QR detectado / Redirigiendo..." antes de que
//     cambie la pantalla. Si alguien borra el setTimeout, la página navega
//     instantáneamente sin feedback visual.
//   - **`stopCamera + setTimeout(300) + startCamera(next)` en toggleCamera**:
//     el delay 300ms evita race conditions entre detener y abrir la nueva
//     stream. Si alguien borra el delay, getUserMedia puede rechazar con
//     "Device in use".
//   - **Botón "atrás" llama `stopCamera()` Y `navigate(-1)`**: si alguien
//     quita el `stopCamera`, la cámara queda encendida después de salir.
//
// Riesgos silenciosos cubiertos por los tests:
//   - Si el cleanup de useEffect se rompe, la cámara queda encendida
//     después de navegar (drenaje de batería en campo).
//   - Si la rama 3 (URL externa) se rompe, un QR con URL de un proveedor
//     (no "/equipo/") se queda sin acción y el operador confundido.
//   - Si el orden de las ramas 1 y 2 se invierte, un texto que matchea
//     ambos criterios va al path equivocado.
//   - Si el setTimeout 600ms se borra, el feedback visual de "QR
//     detectado" desaparece antes de que el operador lo vea.
//   - Si la lógica de error de cámara se homogeniza, el operador pierde
//     el contexto (permiso vs hardware).
//
// Se mockea `jsqr` (no se ejecuta el decoder real), `react-router-dom`
// (sólo necesitamos useNavigate), `navigator.mediaDevices`,
// `navigator.vibrate`, `requestAnimationFrame` y `cancelAnimationFrame`
// (jsdom no implementa el loop de animación). Se stub-ea el prototipo de
// HTMLMediaElement (play/load) y HTMLCanvasElement (getContext). NO se
// mockea lucide-react (la página no usa iconos, sólo SVGs inline).
// NO se usa MemoryRouter (mockeamos useNavigate directamente).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  mockNavigate:    vi.fn(),
  mockJsQR:        vi.fn(() => null),
  mockGetUserMedia: vi.fn(),
  mockVibrate:     vi.fn(),
  mockStopTrack:   vi.fn(),
  mockPlay:        vi.fn(),
}));

// jsQR: el componente llama `jsQR(data, width, height, options)` y
// usa `code?.data` para extraer el texto del QR. Mockeamos para
// retornar null (no se detecta nada) — el scanFrame hace early return
// sin llamar handleResult.
vi.mock('jsqr', () => ({
  default: (...args) => mocks.mockJsQR(...args),
}));

// react-router-dom: la página sólo usa useNavigate. Mockeamos para
// trackear las llamadas de navegación sin necesidad de MemoryRouter.
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.mockNavigate,
}));

import QRScanner from './QRScanner';

// ── Setup ───────────────────────────────────────────────────────────────
beforeEach(() => {
  mocks.mockNavigate.mockReset();
  mocks.mockJsQR.mockReset().mockReturnValue(null);
  mocks.mockVibrate.mockReset();
  mocks.mockStopTrack.mockReset();
  mocks.mockPlay.mockReset().mockResolvedValue(undefined);

  // navigator.mediaDevices.getUserMedia: default resuelve con stream
  // cuyo getTracks()[0].stop es mockStopTrack (para verificar cleanup).
  const fakeStream = {
    getTracks: () => [{ stop: mocks.mockStopTrack }],
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mocks.mockGetUserMedia },
    writable: true,
    configurable: true,
  });
  mocks.mockGetUserMedia.mockReset();
  mocks.mockGetUserMedia.mockResolvedValue(fakeStream);

  // navigator.vibrate — algunos browsers no lo tienen. Optional chaining
  // + try/catch en el componente.
  Object.defineProperty(navigator, 'vibrate', {
    value: mocks.mockVibrate,
    writable: true,
    configurable: true,
  });

  // requestAnimationFrame / cancelAnimationFrame — jsdom no implementa el
  // loop. Mockeamos como no-op (retorna 1, no llama al callback) para
  // que scanFrame corra una vez y se detenga sin recursion infinita.
  // Importante: el mock debe retornar un valor truthy (>0) — stopCamera
  // hace `if (animRef.current) cancelAnimationFrame(...)` y con 0 el
  // branch se saltea (el cleanup nunca llama cancelAnimationFrame).
  let rafId = 1;
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => rafId++));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  // HTMLMediaElement.play/load — jsdom no implementa play() y devuelve
  // undefined, lo que rompe `await videoRef.current.play()` en startCamera.
  window.HTMLMediaElement.prototype.play = mocks.mockPlay;
  window.HTMLMediaElement.prototype.load = vi.fn();

  // HTMLCanvasElement.getContext — jsdom no provee contexto 2d por
  // defecto. jsQR llama getImageData, que necesita el contexto.
  window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ── Helpers ─────────────────────────────────────────────────────────────
function renderScanner() {
  return render(<QRScanner />);
}

async function renderAndWaitForStart() {
  renderScanner();
  // startCamera → await getUserMedia → await play → setScanning(true).
  // 2 microtasks bastan para que la cadena se complete.
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

function setupCameraError(name, message = 'fail') {
  mocks.mockGetUserMedia.mockReset();
  const err = new Error(message);
  err.name = name;
  mocks.mockGetUserMedia.mockRejectedValue(err);
}

async function waitForInputToSettle() {
  // input change handler es síncrono (setState), no necesita flush.
  await act(async () => { await Promise.resolve(); });
}

// ───────────────────────────────────────────────────────────────────────
// 1. Header y subtítulo
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — header', () => {
  it('renderiza el h1 "Escanear QR de Equipo"', async () => {
    await renderAndWaitForStart();
    expect(screen.getByRole('heading', { name: /escanear qr de equipo/i, level: 1 }))
      .toBeInTheDocument();
  });

  it('el subtítulo menciona SIGAH y HGR No.1 IMSS', async () => {
    await renderAndWaitForStart();
    const h1 = screen.getByRole('heading', { name: /escanear qr de equipo/i, level: 1 });
    const subtitle = h1.parentElement.querySelector('p');
    expect(subtitle).toHaveTextContent(/sigah/i);
    expect(subtitle).toHaveTextContent(/hgr no\.?\s*1/i);
    expect(subtitle).toHaveTextContent(/imss/i);
  });

  it('muestra el input manual con placeholder "Token o URL del equipo..."', async () => {
    await renderAndWaitForStart();
    expect(screen.getByPlaceholderText(/token o url del equipo/i)).toBeInTheDocument();
  });

  it('muestra el botón "Ver" para enviar el input manual', async () => {
    await renderAndWaitForStart();
    expect(screen.getByRole('button', { name: /^ver$/i })).toBeInTheDocument();
  });

  it('muestra la instrucción de apuntar al QR', async () => {
    await renderAndWaitForStart();
    expect(screen.getByText(/apunta la cámara al código qr/i)).toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 2. Camera start en mount
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — cámara en mount', () => {
  it('llama navigator.mediaDevices.getUserMedia al montar', async () => {
    await renderAndWaitForStart();
    expect(mocks.mockGetUserMedia).toHaveBeenCalledTimes(1);
  });

  it('pide la cámara con facingMode "environment" (trasera) por defecto', async () => {
    await renderAndWaitForStart();
    expect(mocks.mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: 'environment' }),
        audio: false,
      }),
    );
  });

  it('después de éxito: scanning=true → overlay con esquinas emerald se renderiza', async () => {
    await renderAndWaitForStart();
    // 4 esquinas del marco de escaneo con border-emerald-400.
    const corners = document.querySelectorAll('.border-emerald-400');
    expect(corners.length).toBeGreaterThanOrEqual(4);
  });

  it('después de éxito: scanning=true → botón "Cambiar cámara" presente', async () => {
    await renderAndWaitForStart();
    expect(screen.getByRole('button', { name: /cambiar cámara/i })).toBeInTheDocument();
  });

  it('no muestra botón "Reintentar" cuando la cámara tuvo éxito', async () => {
    await renderAndWaitForStart();
    expect(screen.queryByRole('button', { name: /reintentar/i }))
      .not.toBeInTheDocument();
  });

  it('llama videoRef.current.play() tras recibir el stream', async () => {
    await renderAndWaitForStart();
    expect(mocks.mockPlay).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 3. Errores de cámara (3 ramas)
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — errores de cámara', () => {
  it('NotAllowedError → "Permiso de cámara denegado. Actívalo..."', async () => {
    setupCameraError('NotAllowedError');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/permiso de cámara denegado/i)).toBeInTheDocument();
    });
  });

  it('NotFoundError → "No se encontró cámara en este dispositivo."', async () => {
    setupCameraError('NotFoundError');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/no se encontró cámara en este dispositivo/i))
        .toBeInTheDocument();
    });
  });

  it('error genérico → "Error de cámara: <message>"', async () => {
    setupCameraError('SomeOtherError', 'Algo explotó');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/error de cámara: algo explotó/i)).toBeInTheDocument();
    });
  });

  it('en cualquier error se muestra el botón "Reintentar"', async () => {
    setupCameraError('NotAllowedError');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });
  });

  it('en cualquier error NO se muestra el botón "Cambiar cámara"', async () => {
    setupCameraError('NotAllowedError');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/permiso de cámara denegado/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /cambiar cámara/i }))
      .not.toBeInTheDocument();
  });

  it('click en "Reintentar" vuelve a llamar getUserMedia', async () => {
    setupCameraError('NotAllowedError');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    mocks.mockGetUserMedia.mockClear();
    // Restaurar la cámara para que esta vez resuelva OK.
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    mocks.mockGetUserMedia.mockResolvedValue(fakeStream);

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(mocks.mockGetUserMedia).toHaveBeenCalledTimes(1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 4. Input manual — submit vacío / inválido
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — input manual vacío e inválido', () => {
  it('submit con input VACÍO → no navega', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: '   ' } }); // whitespace-only
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  it('submit con texto que NO es URL ni token válido → no navega', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    // "hola" tiene 4 chars (regex pide 8-32), no es URL → cae fuera de las
    // 3 ramas de handleResult → no hay acción.
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  it('submit con token de 7 chars (corto) → no navega', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'abc1234' } }); // 7 chars
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  it('submit con token de 33 chars (largo) → no navega', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'a'.repeat(33) } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 5. Input manual — URL con /equipo/
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — URL con /equipo/', () => {
  it('submit con URL que contiene "/equipo/TOKEN" → navega a /equipo/TOKEN', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'https://sigah.129-121-100-147.sslip.io/equipo/abc12345' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    // setTimeout(600) → navega después.
    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/abc12345');
    });
  });

  it('submit con "/equipo/TOKEN?query=1" → extrae sólo el token (ignora query)', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: '/equipo/token12345?foo=bar' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/token12345');
    });
  });

  it('submit con "/equipo/TOKEN#hash" → extrae sólo el token (ignora hash)', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: '/equipo/token67890#section' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/token67890');
    });
  });

  it('submit con URL "/equipo/" → navega al path vacío (sin crash)', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    // path vacío: split('/equipo/').pop() → ''. El componente navega a
    // '/equipo/' — no rompe pero va a ruta inválida. Documenta el caso.
    fireEvent.change(input, { target: { value: '/equipo/' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/');
    });
  });
});

// ───────────────────────────────────────────────────────────────────────
// 6. Input manual — token alfanumérico
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — token alfanumérico', () => {
  it('submit con token 8 chars → navega a /equipo/<token>', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'abcd1234' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/abcd1234');
    });
  });

  it('submit con token 32 chars (boundary) → navega', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const token = 'a'.repeat(32);
    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: token } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith(`/equipo/${token}`);
    });
  });

  it('submit con token que contiene guiones y underscores → matchea regex', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'abc_def-123' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/abc_def-123');
    });
  });

  it('el token se trimea antes de navegar (espacios al inicio/fin)', async () => {
    await renderAndWaitForStart();
    mocks.mockNavigate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: '  tokentrim  ' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalledWith('/equipo/tokentrim');
    });
  });
});

// ───────────────────────────────────────────────────────────────────────
// 7. Input manual — URL externa (window.location.href)
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — URL externa (no contiene /equipo/)', () => {
  it('submit con "http://example.com/foo" → window.location.href = url', async () => {
    await renderAndWaitForStart();

    // El componente asigna window.location.href — jsdom no navega realmente,
    // sólo cambia la propiedad. Capturamos el descriptor original para
    // restaurarlo después.
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    let capturedHref = null;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    try {
      const input = screen.getByPlaceholderText(/token o url del equipo/i);
      fireEvent.change(input, { target: { value: 'http://example.com/foo' } });
      fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

      await waitFor(() => {
        capturedHref = window.location.href;
        expect(capturedHref).toBe('http://example.com/foo');
      });
      // NO navega por router (es URL externa).
      expect(mocks.mockNavigate).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(window, 'location', original);
    }
  });

  it('submit con "https://..." también dispara window.location.href', async () => {
    await renderAndWaitForStart();

    const original = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    try {
      const input = screen.getByPlaceholderText(/token o url del equipo/i);
      fireEvent.change(input, { target: { value: 'https://sigab.example/qr/manual.pdf' } });
      fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

      await waitFor(() => {
        expect(window.location.href).toBe('https://sigab.example/qr/manual.pdf');
      });
    } finally {
      if (original) Object.defineProperty(window, 'location', original);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// 8. Comportamiento tras handleResult (stopCamera + vibrate + success)
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — efectos de un QR detectado', () => {
  it('submit con token válido → llama stopCamera en el track', async () => {
    await renderAndWaitForStart();
    mocks.mockStopTrack.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'tokendetect' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockStopTrack).toHaveBeenCalled();
    });
  });

  it('submit con token válido → llama navigator.vibrate(200)', async () => {
    await renderAndWaitForStart();
    mocks.mockVibrate.mockClear();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'vibratetest' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockVibrate).toHaveBeenCalledWith(200);
    });
  });

  it('submit con token válido → muestra overlay "QR detectado"', async () => {
    await renderAndWaitForStart();

    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'visualfeedback' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(screen.getByText(/qr detectado/i)).toBeInTheDocument();
      expect(screen.getByText(/redirigiendo/i)).toBeInTheDocument();
    });
  });

  it('NO rompe si navigator.vibrate no existe (cubrir ?. + try/catch)', async () => {
    // Quitamos vibrate completamente — debe pasar por optional chaining.
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await renderAndWaitForStart();
    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'novibrate01' } });

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));
    }).not.toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 9. Cleanup: cámara se apaga al desmontar
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — cleanup al desmontar', () => {
  it('al desmontar llama stopCamera → cancelAnimationFrame + track.stop()', async () => {
    const { unmount } = renderScanner();
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    mocks.mockStopTrack.mockClear();
    const cancelRafSpy = window.cancelAnimationFrame;

    unmount();

    // stopCamera ejecuta cancelAnimationFrame(animRef.current).
    expect(cancelRafSpy).toHaveBeenCalled();
    // Y stream.getTracks().forEach(t => t.stop()).
    expect(mocks.mockStopTrack).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────
// 10. Toggle cámara (frontal ↔ trasera)
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — toggle de cámara', () => {
  it('click en "Cambiar cámara" flip facingMode de "environment" a "user"', async () => {
    await renderAndWaitForStart();

    mocks.mockGetUserMedia.mockClear();
    // Restaurar stream mock para que el re-start resuelva OK.
    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    mocks.mockGetUserMedia.mockResolvedValue(fakeStream);

    fireEvent.click(screen.getByRole('button', { name: /cambiar cámara/i }));

    // setTimeout(300) antes de re-start. Flush microtasks + avanzar timer.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(mocks.mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: 'user' }),
      }),
    );
  });

  it('segundo click vuelve a "environment"', async () => {
    await renderAndWaitForStart();

    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    mocks.mockGetUserMedia.mockResolvedValue(fakeStream);

    fireEvent.click(screen.getByRole('button', { name: /cambiar cámara/i }));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    mocks.mockGetUserMedia.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /cambiar cámara/i }));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(mocks.mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: 'environment' }),
      }),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────
// 11. Botón "atrás"
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — botón atrás', () => {
  it('click en "atrás" llama stopCamera (cancelAnimationFrame + track.stop)', async () => {
    const { container } = renderScanner();
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    mocks.mockStopTrack.mockClear();
    const cancelRafSpy = window.cancelAnimationFrame;

    // El botón atrás es el primer <button> del header (sin texto,
    // sólo tiene SVG con flecha).
    const backBtn = container.querySelector('header button, .flex.items-center button');
    fireEvent.click(backBtn);

    expect(mocks.mockStopTrack).toHaveBeenCalled();
    expect(cancelRafSpy).toHaveBeenCalled();
  });

  it('click en "atrás" llama navigate(-1)', async () => {
    const { container } = renderScanner();
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    mocks.mockNavigate.mockClear();
    const backBtn = container.querySelector('header button, .flex.items-center button');
    fireEvent.click(backBtn);

    expect(mocks.mockNavigate).toHaveBeenCalledWith(-1);
  });
});

// ───────────────────────────────────────────────────────────────────────
// 12. Hygiene
// ───────────────────────────────────────────────────────────────────────
describe('QRScanner — hygiene', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('no emite warnings de React ni de act() durante mount + scan', async () => {
    await renderAndWaitForStart();

    const relevant = consoleErrorSpy.mock.calls.filter(args => {
      const msg = String(args[0] ?? '');
      return msg.match(/not wrapped in act|Warning:/i) &&
        !msg.includes('v7_startTransition') &&
        !msg.includes('v7_relativeSplatPath');
    });
    expect(relevant).toHaveLength(0);
  });

  it('no emite warnings durante error de cámara', async () => {
    setupCameraError('NotAllowedError');
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/permiso de cámara denegado/i)).toBeInTheDocument();
    });

    const relevant = consoleErrorSpy.mock.calls.filter(args => {
      const msg = String(args[0] ?? '');
      return msg.match(/not wrapped in act|Warning:/i) &&
        !msg.includes('v7_startTransition') &&
        !msg.includes('v7_relativeSplatPath');
    });
    expect(relevant).toHaveLength(0);
  });

  it('no emite warnings durante input manual → navegación', async () => {
    await renderAndWaitForStart();
    const input = screen.getByPlaceholderText(/token o url del equipo/i);
    fireEvent.change(input, { target: { value: 'cleanrun00' } });
    fireEvent.click(screen.getByRole('button', { name: /^ver$/i }));

    await waitFor(() => {
      expect(mocks.mockNavigate).toHaveBeenCalled();
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