// src/pages/Login.test.jsx
// Login es la frontera de auth del frontend — si rompe, nadie entra.
// Verifica: render del formulario, manejo del state local, éxito (navigate),
// errores de servidor (con y sin `detail`), estado de loading.
// Usa un AuthContext.Provider mockeado (mismo patrón que ProtectedRoute.test.jsx)
// para no tener que mockear `api.login` entero ni montar el AuthProvider real.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { AuthContext } from '../context/AuthContext';

function renderLogin({ login = vi.fn() } = {}) {
  const authValue = { user: null, loading: false, login, logout: vi.fn() };
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('Login — render del formulario', () => {
  it('muestra título "SIGAB" y subtítulo del hospital', () => {
    renderLogin();
    expect(screen.getByRole('heading', { level: 2, name: /SIGAB/i })).toBeInTheDocument();
    expect(screen.getByText(/IMSS 1 Clínica General Tijuana/i)).toBeInTheDocument();
  });

  it('muestra los dos inputs con sus labels asociados', () => {
    renderLogin();
    expect(screen.getByLabelText(/Matrícula/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
  });

  it('inputs están vacíos inicialmente', () => {
    renderLogin();
    expect(screen.getByLabelText(/Matrícula/i).value).toBe('');
    expect(screen.getByLabelText(/Contraseña/i).value).toBe('');
  });

  it('botón muestra "Ingresar" en estado idle (no "Iniciando sesión...")', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
    expect(screen.queryByText(/Iniciando sesión/i)).not.toBeInTheDocument();
  });
});

describe('Login — manejo del state local', () => {
  it('type en matrícula actualiza el state', () => {
    renderLogin();
    const matricula = screen.getByLabelText(/Matrícula/i);
    fireEvent.change(matricula, { target: { value: 'ADMIN001' } });
    expect(matricula.value).toBe('ADMIN001');
  });

  it('type en password actualiza el state', () => {
    renderLogin();
    const password = screen.getByLabelText(/Contraseña/i);
    fireEvent.change(password, { target: { value: 'secreto' } });
    expect(password.value).toBe('secreto');
  });
});

describe('Login — submit exitoso', () => {
  it('llama login(matricula, password) y navega a /dashboard', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1, matricula: 'ADMIN001', rol: 'admin' });
    renderLogin({ login });

    fireEvent.change(screen.getByLabelText(/Matrícula/i), { target: { value: 'ADMIN001' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'clave' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('ADMIN001', 'clave');
    });
    expect(await screen.findByText('DASHBOARD_PAGE')).toBeInTheDocument();
  });

  it('muestra "Iniciando sesión..." mientras loading=true (entre click y resolve)', async () => {
    let resolveLogin;
    const login = vi.fn().mockImplementation(() => new Promise((res) => { resolveLogin = res; }));
    renderLogin({ login });

    fireEvent.change(screen.getByLabelText(/Matrícula/i), { target: { value: 'M' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'P' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    expect(await screen.findByText(/Iniciando sesión/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciando sesión/i })).toBeDisabled();

    // Resolver la promesa dentro de act() para que los state updates de
    // navigate('/dashboard') + setLoading(false) no disparen warnings.
    await act(async () => { resolveLogin({ id: 1 }); });
  });
});

describe('Login — submit con error', () => {
  it('muestra err.response.data.detail cuando el servidor lo devuelve', async () => {
    const login = vi.fn().mockRejectedValue({
      response: { data: { detail: 'Credenciales incorrectas' } },
    });
    renderLogin({ login });

    fireEvent.change(screen.getByLabelText(/Matrícula/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Y' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    expect(await screen.findByText(/Credenciales incorrectas/i)).toBeInTheDocument();
    expect(screen.queryByText('DASHBOARD_PAGE')).not.toBeInTheDocument();
  });

  it('muestra mensaje por defecto cuando el error no tiene detail', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Network Error'));
    renderLogin({ login });

    fireEvent.change(screen.getByLabelText(/Matrícula/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Y' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    expect(await screen.findByText(/Error al iniciar sesión. Verifique sus credenciales./i)).toBeInTheDocument();
  });

  it('tras error el botón vuelve a "Ingresar" (loading=false)', async () => {
    const login = vi.fn().mockRejectedValue(new Error('boom'));
    renderLogin({ login });

    fireEvent.change(screen.getByLabelText(/Matrícula/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Y' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await screen.findByText(/Error al iniciar sesión/i);
    expect(screen.getByRole('button', { name: /Ingresar/i })).toBeInTheDocument();
    expect(screen.queryByText(/Iniciando sesión/i)).not.toBeInTheDocument();
  });

  it('NO llama a navigate cuando login rechaza', async () => {
    const login = vi.fn().mockRejectedValue(new Error('boom'));
    renderLogin({ login });

    fireEvent.change(screen.getByLabelText(/Matrícula/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), { target: { value: 'Y' } });
    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await screen.findByText(/Error al iniciar sesión/i);
    expect(screen.queryByText('DASHBOARD_PAGE')).not.toBeInTheDocument();
  });
});