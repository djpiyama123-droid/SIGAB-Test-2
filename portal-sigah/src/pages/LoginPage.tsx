import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconMail, IconLock, IconLoader, IconAlertCircle, IconBuildingHospital } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'admin' ? '/panel/dashboard' : '/panel/sigab', { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-principal flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-bg-principal flex items-center justify-center p-4"
      style={{ backgroundImage: 'radial-gradient(ellipse at 60% 40%, #DCEBF7 0%, #F1F5F9 70%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="font-sans font-medium text-sigah-blue-dark text-3xl"
            style={{ letterSpacing: '-2px' }}
          >
            SIGAH
          </span>
          <p className="font-data font-normal text-sm text-slate-500 mt-1">
            Sistema inteligente de gestión de activos hospitalarios
          </p>
        </div>

        <div className="bg-white rounded-2xl card-border overflow-hidden">
          {/* Header */}
          <div className="bg-sigah-blue-dark px-8 pt-7 pb-6">
            <h1 className="font-sans font-medium text-base text-white">Acceso al panel</h1>
            <p className="font-data font-normal text-sm text-white/60 mt-0.5">
              Ingresa con tus credenciales institucionales
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="flex items-center gap-2 bg-bg-alt rounded-lg px-3 py-2.5 card-border">
              <IconBuildingHospital size={15} className="text-sigah-blue flex-shrink-0" />
              <span className="font-data font-normal text-xs text-sigah-blue-dark">
                Acceso multi-inquilino — datos exclusivos de tu institución
              </span>
            </div>

            <div>
              <label className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <IconMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="gustavo / carlos / demo"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg card-border font-data font-normal text-sm text-slate-800 placeholder-slate-400 bg-white outline-none focus:border-sigah-blue transition-colors"
                />
              </div>
            </div>

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

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 rounded-lg px-4 py-3 card-border border-red-100">
                <IconAlertCircle size={15} className="text-rojo flex-shrink-0 mt-0.5" />
                <p className="font-data font-normal text-xs text-rojo leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {submitting
                ? <><IconLoader size={16} className="animate-spin" /> Verificando...</>
                : 'Iniciar sesión'
              }
            </button>

            {/* Credenciales de demo — solo visibles en desarrollo */}
            {import.meta.env.DEV && (
              <div className="rounded-lg bg-bg-alt card-border p-3 space-y-1">
                <p className="font-data font-normal text-[10px] text-slate-400 uppercase tracking-wider">Demo (solo dev)</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-500">
                  <div><span className="text-slate-400">Admin:</span> gustavo / Sigah2026!</div>
                  <div><span className="text-slate-400">Admin:</span> carlos / Sigah2026!</div>
                  <div className="col-span-2"><span className="text-slate-400">Usuario:</span> demo / demo123</div>
                </div>
              </div>
            )}
          </form>

          <div className="px-8 py-4 bg-bg-principal border-t border-border">
            <p className="font-data font-normal text-xs text-slate-400 text-center">
              SIGAH, S. de R.L. de C.V. · Datos protegidos bajo aislamiento multi-inquilino
            </p>
          </div>
        </div>

        <p className="text-center mt-4 font-data font-normal text-xs text-slate-400">
          <a href="/" className="text-sigah-blue hover:text-sigah-blue-dark transition-colors">
            Volver al portal
          </a>
        </p>
      </div>
    </div>
  )
}
