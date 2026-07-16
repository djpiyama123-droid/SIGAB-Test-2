// npx vitest run src/components/charts/MiniAreaChart.test.js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildSmoothPath } from './MiniAreaChart.jsx';

test('buildSmoothPath: sin puntos no revienta', () => {
  assert.equal(buildSmoothPath([]), '');
});

test('buildSmoothPath: un solo punto es un M sin curva', () => {
  assert.equal(buildSmoothPath([{ x: 5, y: 10 }]), 'M 5,10');
});

test('buildSmoothPath: 30 puntos (serie diaria real) produce una curva C por segmento', () => {
  const points = Array.from({ length: 30 }, (_, i) => ({ x: i * 20, y: 100 - i }));
  const path = buildSmoothPath(points);
  assert.match(path, /^M 0,100/);
  assert.equal((path.match(/ C /g) || []).length, 29);
});

test('buildSmoothPath: todos los conteos en 0 (maxCount cae a 1, sin NaN)', () => {
  const points = [{ x: 0, y: 172 }, { x: 300, y: 172 }, { x: 600, y: 172 }];
  const path = buildSmoothPath(points);
  assert.ok(!path.includes('NaN'));
});
