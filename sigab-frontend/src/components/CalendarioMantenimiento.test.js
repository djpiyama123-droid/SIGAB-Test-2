// npx vitest run src/components/CalendarioMantenimiento.test.js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { estadoMantenimiento } from './CalendarioMantenimiento.jsx';

const HOY = new Date('2026-07-06T00:00:00');

test('estadoMantenimiento: sin fecha (null/vacío/basura) → null, no rompe', () => {
  assert.equal(estadoMantenimiento(null, HOY), null);
  assert.equal(estadoMantenimiento('', HOY), null);
  assert.equal(estadoMantenimiento('no es fecha', HOY), null);
});

test('estadoMantenimiento: fecha pasada → vencido', () => {
  const r = estadoMantenimiento('2026-07-01', HOY);
  assert.equal(r.estado, 'vencido');
  assert.equal(r.diffDias, -5);
  assert.equal(r.etiqueta, 'Vencido hace 5d');
});

test('estadoMantenimiento: hoy → urgente, etiqueta "Hoy"', () => {
  const r = estadoMantenimiento('2026-07-06', HOY);
  assert.equal(r.estado, 'urgente');
  assert.equal(r.etiqueta, 'Hoy');
});

test('estadoMantenimiento: dentro de 7 días → urgente', () => {
  const r = estadoMantenimiento('2026-07-10', HOY);
  assert.equal(r.estado, 'urgente');
  assert.equal(r.diffDias, 4);
  assert.equal(r.etiqueta, 'En 4d');
});

test('estadoMantenimiento: más de 7 días en el futuro → programado', () => {
  const r = estadoMantenimiento('2026-08-01', HOY);
  assert.equal(r.estado, 'programado');
  assert.equal(r.etiqueta, 'En 26d');
});

test('estadoMantenimiento: formato MySQL con espacio (iOS-safe, ver utils/fechas.js) también funciona', () => {
  const r = estadoMantenimiento('2026-07-10 00:00:00', HOY);
  assert.equal(r.estado, 'urgente');
});
