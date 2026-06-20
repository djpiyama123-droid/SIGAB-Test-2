import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/sigah';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario inicial si hay token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Optimistic: mostrar cached user inmediatamente mientras se valida
      const cached = localStorage.getItem('user');
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch (_) {}
      }
      api.getMe()
        .then(data => {
          const normalized = { ...data, rol: data.rol ?? data.role, matricula: data.matricula ?? data.username };
          setUser(normalized);
          localStorage.setItem('user', JSON.stringify(normalized));
        })
        .catch(err => {
          console.error("Token inválido o expirado");
          // Solo limpiar si no hay usuario cacheado válido
          const hasCached = localStorage.getItem('user');
          if (!hasCached) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (matricula, password) => {
    const data = await api.login({ matricula, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
