// src/components/ProtectedRoute.test.jsx
// ProtectedRoute es la frontera de seguridad del frontend —
//  - Sin user → redirige a /login (cualquier ruta protegida)
//  - User sin rol permitido → redirige a /
//  - User con rol permitido → renderiza el <Outlet />
// Si alguien rompe el orden de las guards, el operador podría
// ver datos de Clínica sin estar logueado.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthContext } from '../context/AuthContext';

function renderWithAuth({ user = null, loading = false, initialPath = '/protegida' }) {
  const authValue = { user, loading, login: vi.fn(), logout: vi.fn() };
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/" element={<div>HOME_PAGE</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protegida" element={<div>PROTEGIDA_PAGE</div>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
            <Route path="/superadmin" element={<div>SUPERADMIN_PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute — auth gating', () => {
  it('muestra "Cargando..." mientras loading=true', () => {
    renderWithAuth({ user: null, loading: true });
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
    expect(screen.queryByText('PROTEGIDA_PAGE')).not.toBeInTheDocument();
  });

  it('sin user redirige a /login', () => {
    renderWithAuth({ user: null, loading: false });
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('PROTEGIDA_PAGE')).not.toBeInTheDocument();
  });

  it('con user renderiza el Outlet (la ruta hija)', () => {
    renderWithAuth({ user: { rol: 'operador' }, loading: false });
    expect(screen.getByText('PROTEGIDA_PAGE')).toBeInTheDocument();
  });

  it('acepta tanto `rol` como `role` (compatibilidad backend nuevo/viejo)', () => {
    renderWithAuth({ user: { role: 'operador' }, loading: false });
    expect(screen.getByText('PROTEGIDA_PAGE')).toBeInTheDocument();
  });
});

describe('ProtectedRoute — gating por rol', () => {
  it('user con rol no permitido → redirige a /', () => {
    renderWithAuth({ user: { rol: 'operador' }, loading: false, initialPath: '/superadmin' });
    expect(screen.getByText('HOME_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SUPERADMIN_PAGE')).not.toBeInTheDocument();
  });

  it('user con rol permitido → renderiza el Outlet', () => {
    renderWithAuth({ user: { rol: 'superadmin' }, loading: false, initialPath: '/superadmin' });
    expect(screen.getByText('SUPERADMIN_PAGE')).toBeInTheDocument();
  });
});