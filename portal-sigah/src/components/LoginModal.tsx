import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconX, IconMail, IconLock, IconLoader, IconAlertCircle, IconBuildingHospital } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onClose: () => void
}

const ADMIN_ROLES = ['superadmin', 'admin']

export default function LoginModal({ onClose }: Props) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [matricula, setMatricula] = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(matricula.trim(), password)
      // superadmin/admin → panel (misma SPA); resto → app hospitalaria /app/.
      if (ADMIN_ROLES.includes(u.rol)) navigate('/panel/hub')
      else window.location.assign('/app/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas. Verifica tu matrícula y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,73,125,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-white rounded-[12px] card-border overflow-hidden">
        {/* Header */}
        <div className="bg-sigah-blue-dark px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <span
                className="font-sans font-medium text-white text-xl block mb-1"
                style={{ letterSpacing: '-1px' }}
              >
                SIGAH
              </span>
              <h2 className="font-sans font-medium text-base text-white">
                Acceso al panel hospitalario
              </h2>
              <p className="font-data font-normal text-sm text-white/60 mt-1">
                Ingresa con las credenciales proporcionadas por tu administrador
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 text-white/60 hover:text-white transition-colors rounded-lg"
              aria-label="Cerrar"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          {/* Hospital context badge */}
          <div className="flex items-center gap-2 bg-bg-alt rounded-[8px] px-3 py-2.5 card-border">
            <IconBuildingHospital size={15} className="text-sigah-blue flex-shrink-0" />
            <span className="font-data font-normal text-xs text-sigah-blue-dark">
              Acceso multi-inquilino — los datos son exclusivos de tu institución
            </span>
          </div>

          {/* Username */}
          <div>
            <label className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
              Matrícula
            </label>
            <div className="relative">
              <IconMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={matricula}
                onChange={e => setMatricula(e.target.value)}
                placeholder="Matrícula IMSS"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg card-border font-data font-normal text-sm text-slate-800 placeholder-slate-400 bg-white outline-none focus:border-sigah-blue transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <IconLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg card-border font-data font-normal text-sm text-slate-800 placeholder-slate-400 bg-white outline-none focus:border-sigah-blue transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rojo-bg rounded-lg px-4 py-3 card-border">
              <IconAlertCircle size={15} className="text-rojo flex-shrink-0 mt-0.5" />
              <p className="font-data font-normal text-xs text-rojo leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !matricula || !password}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <IconLoader size={16} className="animate-spin" />
                Verificando credenciales...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>

          <p className="font-data font-normal text-xs text-slate-400 text-center">
            ¿Olvidaste tu contraseña?{' '}
            <a href="mailto:soporte@sigah.mx" className="text-sigah-blue hover:text-sigah-blue-dark transition-colors">
              Contacta a soporte
            </a>
          </p>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-bg-principal border-t border-border">
          <p className="font-data font-normal text-xs text-slate-400 text-center">
            SIGAH, S. de R.L. de C.V. · Datos protegidos bajo aislamiento multi-inquilino
          </p>
        </div>
      </div>
    </div>
  )
}
