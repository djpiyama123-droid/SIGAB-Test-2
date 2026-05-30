import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { API_URL } from '../lib/api'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  username: string
  nombre: string
  email: string
  role: UserRole
  avatar: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('sigah_access_token')
    if (!token) { setState(s => ({ ...s, loading: false })); return }

    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((user: AuthUser) => setState({ user, token, loading: false }))
      .catch(() => {
        localStorage.removeItem('sigah_access_token')
        setState({ user: null, token: null, loading: false })
      })
  }, [])

  const login = async (username: string, password: string) => {
    const body = new URLSearchParams({ username, password })
    const res = await fetch(`${API_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { detail?: string }).detail ?? 'Credenciales incorrectas')
    }
    const data = await res.json() as { access_token: string; role: string; nombre: string }
    localStorage.setItem('sigah_access_token', data.access_token)

    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    const user: AuthUser = await meRes.json()
    setState({ user, token: data.access_token, loading: false })
  }

  const logout = () => {
    localStorage.removeItem('sigah_access_token')
    setState({ user: null, token: null, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAdmin: state.user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
