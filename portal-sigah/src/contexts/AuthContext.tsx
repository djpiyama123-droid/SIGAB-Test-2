import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { API_URL } from '../lib/api'

// Roles reales del backend SIGAB (campo `rol` en tabla usuarios).
// superadmin/admin acceden al panel; el resto va a la app hospitalaria.
export type UserRole = string

export interface AuthUser {
  id: number
  nombre: string
  matricula: string
  email: string | null
  rol: UserRole
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (matricula: string, password: string) => Promise<AuthUser>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ADMIN_ROLES = ['superadmin', 'admin']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  })

  // Bootstrap: si hay token compartido (`token`, mismo que la app SIGAB),
  // validar contra /api/auth/me. Mismo origen ⇒ SSO entre /panel y /app.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setState(s => ({ ...s, loading: false })); return }

    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((user: AuthUser) => setState({ user, token, loading: false }))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        setState({ user: null, token: null, loading: false })
      })
  }, [])

  const login = async (matricula: string, password: string): Promise<AuthUser> => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matricula, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { detail?: string }).detail ?? 'Matrícula o contraseña incorrecta')
    }
    const data = await res.json() as {
      access_token: string
      refresh_token?: string
      user: AuthUser
    }
    // Token key unificado con sigab-frontend para SSO same-origin.
    localStorage.setItem('token', data.access_token)
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setState({ user: data.user, token: data.access_token, loading: false })
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setState({ user: null, token: null, loading: false })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAdmin: ADMIN_ROLES.includes(state.user?.rol ?? ''),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
