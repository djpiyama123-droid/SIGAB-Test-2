import { describe, it, expect } from 'vitest';
import { fmtFecha } from './formatoThemes';

describe('fmtFecha', () => {
  it("parsea 'YYYY-MM-DD' como fecha local — no retrocede un día en zonas UTC-negativas (bug Tijuana)", () => {
    // Antes del fix, new Date('2026-07-08') era medianoche UTC y en
    // UTC-7/-8 imprimía 7/7/2026. Debe imprimir el 8 de julio local.
    expect(fmtFecha('2026-07-08')).toBe(new Date(2026, 6, 8).toLocaleDateString('es-MX'));
  });

  it('mantiene el comportamiento previo con timestamps que traen hora', () => {
    const ts = '2026-07-08T12:30:00';
    expect(fmtFecha(ts)).toBe(new Date(ts).toLocaleDateString('es-MX'));
  });

  it('devuelve el placeholder con valores vacíos o nulos', () => {
    expect(fmtFecha(null)).toBe('__/__/____');
    expect(fmtFecha(undefined)).toBe('__/__/____');
    expect(fmtFecha('')).toBe('__/__/____');
  });
});
