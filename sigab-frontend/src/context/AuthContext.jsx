import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/sigab';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario inicial si hay token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(data => {
          setUser(data);
        })
        .catch(err => {
          console.error("Token inválido o expirado");
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
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
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
