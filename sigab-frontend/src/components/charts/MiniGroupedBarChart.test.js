// npx vitest run src/components/charts/MiniGroupedBarChart.test.js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildGroupedBars } from './MiniGroupedBarChart.jsx';

const opts = { width: 600, height: 220, padding: { top: 8, right: 4, bottom: 24, left: 4 } };

test('buildGroupedBars: sin datos no revienta', () => {
  const { groups } = buildGroupedBars([], ['a', 'b'], opts);
  assert.deepEqual(groups, []);
});

test('buildGroupedBars: un grupo con 2 series produce 2 barras', () => {
  const data = [{ name: 'Ene', a: 10, b: 5 }];
  const { groups } = buildGroupedBars(data, ['a', 'b'], opts);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].bars.length, 2);
  assert.equal(groups[0].name, 'Ene');
});

test('buildGroupedBars: la barra mas alta llega al tope del area interna (maxVal)', () => {
  const data = [{ name: 'Ene', a: 10, b: 5 }];
  const { groups, padding } = buildGroupedBars(data, ['a', 'b'], opts);
  const barA = groups[0].bars.find((b) => b.key === 'a');
  assert.equal(barA.y, padding.top);
});

test('buildGroupedBars: todos los valores en 0 (maxVal cae a 1, sin NaN)', () => {
  const data = [{ name: 'Ene', a: 0, b: 0 }];
  const { groups } = buildGroupedBars(data, ['a', 'b'], opts);
  groups[0].bars.forEach((b) => {
    assert.ok(!Number.isNaN(b.y));
    assert.ok(!Number.isNaN(b.height));
  });
});

test('buildGroupedBars: 4 meses (caso real de MaintenanceChart) produce 4 grupos', () => {
  const data = [
    { name: 'Ene', programadas: 12, completadas: 10 },
    { name: 'Feb', programadas: 15, completadas: 14 },
    { name: 'Mar', programadas: 10, completadas: 11 },
    { name: 'Abr', programadas: 18, completadas: 16 },
  ];
  const { groups } = buildGroupedBars(data, ['programadas', 'completadas'], opts);
  assert.equal(groups.length, 4);
});
