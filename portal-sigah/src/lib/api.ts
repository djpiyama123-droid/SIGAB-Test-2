export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Fetch autenticado central: ante 401 limpia la sesión y fuerza re-login,
// evitando el estado "zombie" donde el token expira pero el panel sigue montado.
export async function apiFetch<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('sigah_access_token')
    if (!location.pathname.startsWith('/login')) location.assign('/login')
    throw new ApiError(401, 'Sesión expirada')
  }
  if (!res.ok) throw new ApiError(res.status, `Error ${res.status}`)
  return res.json() as Promise<T>
}
