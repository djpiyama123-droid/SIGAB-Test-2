// node --test src/utils/fechas.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFecha, ymd, agruparPorDia, statsReservas, serieDiaria, reservasDelDia } from './fechas.js';

test('parseFecha: formato MySQL con espacio (el que rompe en Safari iOS) es válido', () => {
  const d = parseFecha('2026-06-25 14:30:00');
  assert.ok(d instanceof Date && !isNaN(d.getTime()));
  assert.equal(ymd(d), '2026-06-25');
});

test('parseFecha: ISO con T también', () => {
  assert.equal(ymd(parseFecha('2026-06-25T14:30:00')), '2026-06-25');
});

test('parseFecha: null/basura → null (no rompe)', () => {
  assert.equal(parseFecha(null), null);
  assert.equal(parseFecha(''), null);
  assert.equal(parseFecha('no es fecha'), null);
  assert.equal(ymd(null), null);
});

test('agruparPorDia: cuenta reservas por día de fecha_inicio', () => {
  const reservas = [
    { fecha_inicio: '2026-06-25 09:00:00' },
    { fecha_inicio: '2026-06-25 15:00:00' },
    { fecha_inicio: '2026-06-26 10:00:00' },
    { fecha_inicio: null }, // ignorada
  ];
  assert.deepEqual(agruparPorDia(reservas), { '2026-06-25': 2, '2026-06-26': 1 });
});

test('statsReservas: total, día pico y días activos', () => {
  const reservas = [
    { fecha_inicio: '2026-06-25 09:00:00' },
    { fecha_inicio: '2026-06-25 15:00:00' },
    { fecha_inicio: '2026-06-26 10:00:00' },
  ];
  assert.deepEqual(statsReservas(reservas), { total: 3, diaPico: 2, diasActivos: 2 });
});

test('statsReservas: lista vacía → ceros', () => {
  assert.deepEqual(statsReservas([]), { total: 0, diaPico: 0, diasActivos: 0 });
});

test('serieDiaria: longitud = dias e incluye días en 0', () => {
  const hoy = new Date('2026-06-25T12:00:00');
  const serie = serieDiaria([{ fecha_inicio: '2026-06-25 09:00:00' }], 7, hoy);
  assert.equal(serie.length, 7);
  assert.equal(serie[serie.length - 1].fecha, '2026-06-25');
  assert.equal(serie[serie.length - 1].count, 1);
  assert.equal(serie[0].count, 0);
});

test('reservasDelDia: filtra y ordena por hora', () => {
  const reservas = [
    { id: 1, fecha_inicio: '2026-06-25 15:00:00' },
    { id: 2, fecha_inicio: '2026-06-25 09:00:00' },
    { id: 3, fecha_inicio: '2026-06-26 09:00:00' },
  ];
  const dia = reservasDelDia(reservas, '2026-06-25');
  assert.deepEqual(dia.map((r) => r.id), [2, 1]);
});
