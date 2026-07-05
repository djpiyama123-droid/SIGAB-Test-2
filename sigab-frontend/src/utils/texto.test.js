import { describe, it, expect } from 'vitest';
import { normalizar } from './texto';

describe('normalizar', () => {
  it('quita acentos comunes del español', () => {
    expect(normalizar('PATOLOGÍA')).toBe('patologia');
  });

  it('permite que la búsqueda sin acento encuentre el original con acento', () => {
    expect(normalizar('patologia')).toBe(normalizar('PATOLOGÍA'));
  });

  it('normaliza ñ', () => {
    expect(normalizar('Baño')).toBe('bano');
  });

  it('recorta espacios y es insensible a mayúsculas', () => {
    expect(normalizar('  Quirófano  ')).toBe('quirofano');
  });

  it('maneja valores vacíos o nulos sin lanzar error', () => {
    expect(normalizar('')).toBe('');
    expect(normalizar(null)).toBe('');
    expect(normalizar(undefined)).toBe('');
  });
});
