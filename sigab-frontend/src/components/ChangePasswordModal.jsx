import { useState } from 'react';
import { api } from '../api/sigab';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export default function ChangePasswordModal({ isOpen, onClose, required }) {
  const { setUser, user } = useAuth();
  const toast = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nueva !== confirmar) {
      return setError('Las contraseñas nuevas no coinciden');
    }
    if (nueva.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres');
    }
    if (actual === nueva) {
      return setError('La nueva contraseña debe ser distinta de la actual');
    }

    setLoading(true);
    const tid = toast.loading('Actualizando contraseña…');
    try {
      await api.changePassword({ password_actual: actual, password_nueva: nueva });

      // Actualizar estado del usuario
      setUser({ ...user, must_change_password: false });

      toast.success('Contraseña actualizada', { id: tid });
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al cambiar contraseña';
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/75 transition-opacity backdrop-blur-sm" aria-hidden="true" />

        <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-slate-800 text-left shadow-xl border border-slate-700">
          <form onSubmit={handleSubmit}>
            <div className="bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-base font-semibold leading-6 text-white">
                    {required ? 'Cambio de Contraseña Obligatorio' : 'Cambiar Contraseña'}
                  </h3>
                  <div className="mt-2 text-sm text-slate-400 mb-6">
                    {required 
                      ? "Por seguridad, debes cambiar tu contraseña predeterminada antes de continuar."
                      : "Ingresa tu contraseña actual y la nueva contraseña para actualizarla."}
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Contraseña Actual
                      </label>
                      <input
                        type="password"
                        required
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        className="block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Nueva Contraseña (mínimo 6 caracteres)
                      </label>
                      <input
                        type="password"
                        required
                        value={nueva}
                        onChange={(e) => setNueva(e.target.value)}
                        className="block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Confirmar Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        className="block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-slate-700">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 sm:ml-3 sm:w-auto disabled:opacity-50 transition-colors"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
              {!required && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm hover:bg-slate-600 sm:mt-0 sm:w-auto"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
    </div>
  );
}
