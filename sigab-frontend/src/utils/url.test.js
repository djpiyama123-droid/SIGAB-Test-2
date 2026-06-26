// node --test src/utils/url.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

// absUrl usa window.location.origin; lo stubeamos para el entorno node.
globalThis.window = { location: { origin: 'https://sigab.example.io' } };

const { absUrl, parseFotos } = await import('./url.js');

test('absUrl: ruta relativa con / se ancla al origin', () => {
  assert.equal(absUrl('/static/uploads/x.pdf'), 'https://sigab.example.io/static/uploads/x.pdf');
});

test('absUrl: ruta relativa sin / inicial agrega la barra', () => {
  assert.equal(absUrl('static/uploads/x.pdf'), 'https://sigab.example.io/static/uploads/x.pdf');
});

test('absUrl: URL ya absoluta se respeta', () => {
  assert.equal(absUrl('https://otro.host/a.pdf'), 'https://otro.host/a.pdf');
  assert.equal(absUrl('http://otro.host/a.pdf'), 'http://otro.host/a.pdf');
});

test('absUrl: vacío/null pasa tal cual (sin romper)', () => {
  assert.equal(absUrl(''), '');
  assert.equal(absUrl(null), null);
  assert.equal(absUrl(undefined), undefined);
});

test('parseFotos: JSON array', () => {
  assert.deepEqual(parseFotos('["/a.jpg","/b.jpg"]'), ['/a.jpg', '/b.jpg']);
});

test('parseFotos: CSV (el caso que fallaba en silencio)', () => {
  assert.deepEqual(parseFotos('/a.jpg, /b.jpg ,/c.jpg'), ['/a.jpg', '/b.jpg', '/c.jpg']);
});

test('parseFotos: URL única', () => {
  assert.deepEqual(parseFotos('/solo.jpg'), ['/solo.jpg']);
});

test('parseFotos: array nativo', () => {
  assert.deepEqual(parseFotos(['/a.jpg', null, '/b.jpg']), ['/a.jpg', '/b.jpg']);
});

test('parseFotos: vacío/null → []', () => {
  assert.deepEqual(parseFotos(null), []);
  assert.deepEqual(parseFotos(''), []);
  assert.deepEqual(parseFotos('   '), []);
  assert.deepEqual(parseFotos(undefined), []);
});
