// npx vitest run src/api/sigab.test.js
// SIG-11: getMediaUrl resuelve rutas relativas del backend (/static/uploads/...)
// a una URL consumible por Safari iOS, sin tocar rutas ya absolutas.
import { describe, it, expect } from 'vitest';
import { getMediaUrl } from './sigab';

describe('getMediaUrl', () => {
  it('path relativo: prefija con la base derivada de la baseURL de axios', () => {
    // baseURL de axios en este proyecto es '/api' (relativa), por lo que el
    // prefijo de media queda vacío hoy; el helper deja la ruta intacta pero
    // ya pasa por el punto único de resolución (listo para baseURL absoluta).
    expect(getMediaUrl('/static/uploads/equipos/foto.jpg')).toBe('/static/uploads/equipos/foto.jpg');
  });

  it('path ya absoluto: se devuelve sin modificar (http, https, data, blob)', () => {
    expect(getMediaUrl('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg');
    expect(getMediaUrl('http://cdn.example.com/x.jpg')).toBe('http://cdn.example.com/x.jpg');
    expect(getMediaUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(getMediaUrl('blob:http://localhost/abc-123')).toBe('blob:http://localhost/abc-123');
  });

  it('path vacío o nulo: no rompe, devuelve cadena vacía', () => {
    expect(getMediaUrl('')).toBe('');
    expect(getMediaUrl(null)).toBe('');
    expect(getMediaUrl(undefined)).toBe('');
  });
});
