// npx vitest run src/components/charts/MiniDonutChart.test.js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildDonutSegments } from './MiniDonutChart.jsx';

const circumference = 2 * Math.PI * 66;

test('buildDonutSegments: sin datos no revienta', () => {
  const segments = buildDonutSegments([], circumference);
  assert.deepEqual(segments, []);
});

test('buildDonutSegments: reparte 100% entre 2 categorias segun su proporcion', () => {
  const data = [
    { name: 'Operativo', value: 75, color: '#10b981' },
    { name: 'Baja', value: 25, color: '#64748b' },
  ];
  const [a, b] = buildDonutSegments(data, circumference);
  assert.equal(a.percent, 75);
  assert.equal(b.percent, 25);
  assert.equal(a.dashoffset, -0);
  assert.ok(Math.abs(b.dashoffset - -0.75 * circumference) < 1e-9);
});

test('buildDonutSegments: una sola categoria con el 100% del total no revienta (arco completo)', () => {
  const data = [{ name: 'Operativo', value: 40, color: '#10b981' }];
  const [seg] = buildDonutSegments(data, circumference);
  assert.equal(seg.percent, 100);
  assert.equal(seg.dashoffset, -0);
});

test('buildDonutSegments: total en 0 no produce NaN (todas las fracciones en 0)', () => {
  const data = [
    { name: 'Operativo', value: 0, color: '#10b981' },
    { name: 'Baja', value: 0, color: '#64748b' },
  ];
  const segments = buildDonutSegments(data, circumference);
  segments.forEach((s) => {
    assert.ok(!Number.isNaN(s.fraction));
    assert.equal(s.fraction, 0);
    assert.equal(s.percent, 0);
  });
});

test('buildDonutSegments: caso real de equipos_por_estado (5 categorias) suma 100%', () => {
  const data = [
    { name: 'Operativo', value: 700, color: '#10b981' },
    { name: 'Mantenimiento', value: 100, color: '#eab308' },
    { name: 'Fuera de Serv.', value: 50, color: '#ef4444' },
    { name: 'Traslado', value: 20, color: '#3b82f6' },
    { name: 'Baja', value: 11, color: '#64748b' },
  ];
  const segments = buildDonutSegments(data, circumference);
  const totalPercent = segments.reduce((sum, s) => sum + s.percent, 0);
  assert.ok(Math.abs(totalPercent - 100) <= 1);
});
