// Setup global para vitest. Carga matchers de jest-dom y limpia
// localStorage entre tests para que cada test arranque en limpio.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});