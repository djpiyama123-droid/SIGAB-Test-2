import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(matricula, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          SIGAB
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Hospital General Regional No. 1 — IMSS Tijuana
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="matricula" className="block text-sm font-medium text-slate-300">
                Matrícula
              </label>
              <div className="mt-1">
                <input
                  id="matricula"
                  name="matricula"
                  type="text"
                  required
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  placeholder="Ej. ADMIN001"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Iniciando sesión...' : 'Ingresar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
