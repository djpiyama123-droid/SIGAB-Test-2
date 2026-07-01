// node test runner via vitest (configurado en vite.config.js, scope src/lib/, env node).
import { describe, it, expect } from 'vitest';
import { pickList } from './pickList.js';

describe('pickList', () => {
  describe('casos normales', () => {
    it('data es array directo → devuelve el array tal cual', () => {
      expect(pickList([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('data es objeto con la clave apuntando a array → devuelve ese array', () => {
      expect(pickList({ equipos: ['a', 'b'] }, 'equipos')).toEqual(['a', 'b']);
    });

    it('data es array vacío → devuelve []', () => {
      expect(pickList([])).toEqual([]);
    });

    it('data es objeto con clave apuntando a array vacío → devuelve []', () => {
      expect(pickList({ equipos: [] }, 'equipos')).toEqual([]);
    });

    it('array con elementos varios preserva tipos', () => {
      const arr = [{ id: 1 }, 'x', 0, false];
      expect(pickList(arr)).toEqual(arr);
    });
  });

  describe('casos hostiles (el bug real)', () => {
    it('data es {} sin clave → [] (NO {})', () => {
      expect(pickList({})).toEqual([]);
    });

    it('data es {} y se pide clave → []', () => {
      expect(pickList({}, 'equipos')).toEqual([]);
    });

    it('data es null → []', () => {
      expect(pickList(null)).toEqual([]);
    });

    it('data es undefined → []', () => {
      expect(pickList(undefined)).toEqual([]);
    });

    it('data es 0 (falsy pero no objeto) → []', () => {
      expect(pickList(0)).toEqual([]);
    });

    it('data es "" (falsy string) → []', () => {
      expect(pickList('')).toEqual([]);
    });

    it('data es string "no es array" → []', () => {
      expect(pickList('hola')).toEqual([]);
    });

    it('data es número → []', () => {
      expect(pickList(42)).toEqual([]);
    });
  });

  describe('clave presente pero con tipo incorrecto', () => {
    it('data.clave es {} → [] (no {})', () => {
      expect(pickList({ equipos: {} }, 'equipos')).toEqual([]);
    });

    it('data.clave es null → []', () => {
      expect(pickList({ equipos: null }, 'equipos')).toEqual([]);
    });

    it('data.clave es "string" → []', () => {
      expect(pickList({ equipos: 'a,b,c' }, 'equipos')).toEqual([]);
    });

    it('data.clave es número → []', () => {
      expect(pickList({ equipos: 42 }, 'equipos')).toEqual([]);
    });
  });

  describe('envoltura de objeto en otro objeto', () => {
    it('data es { data: { equipos: [...] } } y se pide clave directa → []', () => {
      // No soporta doble envoltura por diseño (no adivinar). Solo clave directa.
      expect(pickList({ data: { equipos: ['a'] } }, 'equipos')).toEqual([]);
    });

    it('data es { items: [...] } con clave "items" → devuelve [...]', () => {
      expect(pickList({ items: [1, 2] }, 'items')).toEqual([1, 2]);
    });
  });

  describe('regression — patrón viejo vs nuevo (demuestra el bug)', () => {
    it('patrón VIEJO con {} → devuelve {} → .filter() revienta con TypeError', () => {
      const data = {};
      // Reproducimos el patrón viejo:
      const old = data.equipos ?? data ?? [];
      expect(Array.isArray(old)).toBe(false);
      expect(() => old.filter(Boolean)).toThrow(TypeError);
    });

    it('pickList con el mismo {} → devuelve [] → .filter() funciona', () => {
      const data = {};
      const next = pickList(data, 'equipos');
      expect(Array.isArray(next)).toBe(true);
      expect(next.filter(Boolean)).toEqual([]);
    });
  });
});