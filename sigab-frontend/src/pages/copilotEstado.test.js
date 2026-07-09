// npx vitest run src/pages/copilotEstado.test.js
//
// Cubre el bug de producción v4.0.23: /copilot mostraba "Ollama offline" +
// banner "instala Ollama" incluso cuando el backend corría en modo API
// (SIGAH_LLM_API_MODE=openai / MiniMax) y estaba sano. La causa era que el
// frontend decidía todo a partir de `ollama_activo`, que el backend fijaba
// en `false` SIEMPRE en modo api. estadoCopilot() ahora decide a partir de
// {mode, ok, modelo_disponible}.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { estadoCopilot } from './copilotEstado.js';

test('estadoCopilot: sin status (fetch aún no resuelve) → desconocido, sin banner', () => {
  const r = estadoCopilot(null);
  assert.equal(r.badge, 'desconocido');
  assert.equal(r.banner, null);
});

test('estadoCopilot: sin mode (error de red / shape viejo) → desconocido, sin banner', () => {
  const r = estadoCopilot({ ok: false });
  assert.equal(r.badge, 'desconocido');
  assert.equal(r.banner, null);
});

test('estadoCopilot: modo api sano → activo, sin banner (no debe pedir instalar Ollama)', () => {
  const r = estadoCopilot({ mode: 'api', ok: true, modelo_activo: 'MiniMax-M2.5', modelo_disponible: true });
  assert.equal(r.badge, 'activo');
  assert.equal(r.banner, null);
});

test('estadoCopilot: modo api caído → api_offline, banner de proveedor nube', () => {
  const r = estadoCopilot({ mode: 'api', ok: false, detail: 'timeout' });
  assert.equal(r.badge, 'api_offline');
  assert.equal(r.banner, 'api_no_disponible');
});

test('estadoCopilot: modo ollama caído → ollama_offline, banner de instalar Ollama', () => {
  const r = estadoCopilot({ mode: 'ollama', ok: false });
  assert.equal(r.badge, 'ollama_offline');
  assert.equal(r.banner, 'instalar_ollama');
});

test('estadoCopilot: modo ollama sano pero modelo no descargado → banner de descargar modelo', () => {
  const r = estadoCopilot({ mode: 'ollama', ok: true, modelo_disponible: false });
  assert.equal(r.badge, 'modelo_no_descargado');
  assert.equal(r.banner, 'descargar_modelo');
});

test('estadoCopilot: modo ollama sano y modelo disponible → activo, sin banner', () => {
  const r = estadoCopilot({ mode: 'ollama', ok: true, modelo_disponible: true, modelo_activo: 'gemma3:4b' });
  assert.equal(r.badge, 'activo');
  assert.equal(r.banner, null);
});
