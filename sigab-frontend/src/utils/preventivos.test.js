// npx vitest run src/utils/preventivos.test.js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { diasRestantes } from './preventivos.js';

test('diasRestantes: sin fecha (null/vacío/undefined) → null, no rompe', () => {
  assert.equal(diasRestantes(null), null);
  assert.equal(diasRestantes(undefined), null);
  assert.equal(diasRestantes(''), null);
});

test('diasRestantes: fecha pasada → negativo; fecha futura → positivo', () => {
  const ayer = new Date(Date.now() - 2 * 86400000);
  const manana = new Date(Date.now() + 86400000);
  assert.ok(diasRestantes(ayer.toISOString()) < 0);
  assert.ok(diasRestantes(manana.toISOString()) > 0);
});

test('diasRestantes: hoy → 0', () => {
  assert.equal(diasRestantes(new Date().toISOString()), 0);
});
