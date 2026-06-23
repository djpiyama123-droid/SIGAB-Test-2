// src/context/ThemeContext.test.jsx
// Tests del ThemeProvider. La lógica de v3.0 tiene 3 ramas:
//   1. localStorage vacío → default 'green' (Verde-Blanco IMSS)
//   2. localStorage con 'dark' (legacy pre-v3) → se MIGRA a 'green'
//   3. localStorage con cualquier otro valor (p.ej. 'light', 'green') → se respeta
// Si alguien refactoriza y rompe la migración, el frontend se quedaría
// con data-theme="dark" y todos los colores de contraste se irían al traste.
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('light')}>set-light</button>
    </div>
  );
}

describe('ThemeProvider — defaults v3.0', () => {
  it('sin localStorage arranca en "green" (Verde-Blanco IMSS)', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('green');
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
    expect(localStorage.getItem('sigah-theme')).toBe('green');
  });

  it('localStorage con "dark" (legacy) se migra automáticamente a "green"', () => {
    localStorage.setItem('sigah-theme', 'dark');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('green');
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
  });

  it('localStorage con "light" se respeta', () => {
    localStorage.setItem('sigah-theme', 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('ThemeProvider — cambio dinámico', () => {
  it('setTheme actualiza data-theme en <html> y persiste en localStorage', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('green');

    act(() => {
      screen.getByRole('button', { name: /set-light/ }).click();
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('sigah-theme')).toBe('light');
  });
});