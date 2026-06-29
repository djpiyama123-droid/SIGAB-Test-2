import { describe, it, expect } from 'vitest';
import { pickList } from './pickList';

describe('pickList', () => {
  it('devuelve el array envuelto en clave cuando existe y es array', () => {
    expect(pickList({ reservas: [1, 2, 3] }, 'reservas')).toEqual([1, 2, 3]);
  });

  it('devuelve el array crudo cuando la clave no existe y data es array', () => {
    expect(pickList([1, 2, 3], 'reservas')).toEqual([1, 2, 3]);
  });

  it('devuelve [] cuando la clave existe pero es null', () => {
    expect(pickList({ reservas: null }, 'reservas')).toEqual([]);
  });

  it('devuelve [] cuando la clave existe pero es undefined', () => {
    expect(pickList({ reservas: undefined }, 'reservas')).toEqual([]);
  });

  it('devuelve [] cuando data es null', () => {
    expect(pickList(null, 'reservas')).toEqual([]);
  });

  it('devuelve [] cuando data es undefined', () => {
    expect(pickList(undefined, 'reservas')).toEqual([]);
  });

  it('devuelve [] cuando data es `{}` (objeto vacío sin la clave) — antes crasheaba', () => {
    expect(pickList({}, 'reservas')).toEqual([]);
  });

  it('devuelve [] cuando data es `{}` sin clave (uso sin key)', () => {
    expect(pickList({})).toEqual([]);
  });

  it('devuelve [] cuando la clave existe pero no es array (defensivo)', () => {
    expect(pickList({ reservas: 'foo' }, 'reservas')).toEqual([]);
    expect(pickList({ reservas: 42 }, 'reservas')).toEqual([]);
    expect(pickList({ reservas: { anidado: [] } }, 'reservas')).toEqual([]);
  });

  it('devuelve [] cuando data es un objeto cualquiera y no hay clave', () => {
    expect(pickList({ cualquier: 'cosa' })).toEqual([]);
  });

  it('con clave indefinida explícita cae al modo "sin clave" (devuelve data si es array)', () => {
    expect(pickList([1, 2], undefined)).toEqual([1, 2]);
    expect(pickList({ x: 1 }, undefined)).toEqual([]);
  });

  it('preserva identidad del array cuando coincide con la clave', () => {
    const arr = [1, 2, 3];
    const result = pickList({ reservas: arr }, 'reservas');
    expect(result).toBe(arr);
  });
});
