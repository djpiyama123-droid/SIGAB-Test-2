import { useEffect, useState } from 'react'
import { IconKey, IconCircleCheck, IconCircleX, IconRefresh } from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

interface TokenRecord {
  id: string
  label: string
  created: string
  last_used: string
  calls: number
  active: boolean
}

interface TokenData {
  tokens: TokenRecord[]
  monthly_spend_usd: number
  tokens_used_this_month: number
}

export default function TokensPage() {
  const { token } = useAuth()
  const [data, setData] = useState<TokenData | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => null)
  }, [token])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Tokens API</h1>
        <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
          Gestión de tokens Anthropic Claude — SIGAH AI integrations
        </p>
      </div>

      {/* Consumo mensual */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl card-border p-5">
          <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">Gasto mensual</p>
          <p className="font-sans font-medium text-3xl text-sigah-blue-dark mt-1">
            ${data?.monthly_spend_usd.toFixed(2) ?? '—'} <span className="text-sm text-slate-400 font-normal">USD</span>
          </p>
        </div>
        <div className="bg-white rounded-xl card-border p-5">
          <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">Tokens usados este mes</p>
          <p className="font-sans font-medium text-3xl text-slate-800 mt-1">
            {data ? (data.tokens_used_this_month / 1_000_000).toFixed(2) : '—'} <span className="text-sm text-slate-400 font-normal">M tokens</span>
          </p>
        </div>
      </div>

      {/* Lista de tokens */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-sans font-medium text-sm text-slate-700">API Keys activas</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card-border text-xs font-data text-slate-500 hover:bg-bg-alt transition-colors">
            <IconRefresh size={13} /> Sincronizar
          </button>
        </div>
        <div className="divide-y divide-border">
          {data?.tokens.map(tk => (
            <div key={tk.id} className="flex items-center gap-4 px-5 py-4">
              <div className={`p-2 rounded-lg ${tk.active ? 'bg-green-50' : 'bg-slate-50'}`}>
                <IconKey size={16} className={tk.active ? 'text-esmeralda' : 'text-slate-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-data font-normal text-sm text-slate-700">{tk.label}</p>
                  {tk.active
                    ? <IconCircleCheck size={13} className="text-esmeralda flex-shrink-0" />
                    : <IconCircleX size={13} className="text-slate-400 flex-shrink-0" />
                  }
                </div>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{tk.id.slice(0, 10)}••••••</p>
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="font-data font-normal text-sm text-slate-700">{tk.calls.toLocaleString()} llamadas</p>
                <p className="font-data font-normal text-xs text-slate-400">Último uso: {tk.last_used}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-data font-normal ${
                tk.active ? 'bg-green-50 text-esmeralda' : 'bg-slate-100 text-slate-500'
              }`}>
                {tk.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
          {!data && (
            <div className="px-5 py-10 flex justify-center">
              <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <p className="font-data font-normal text-xs text-slate-400">
        Los tokens se generan en{' '}
        <span className="font-mono">console.anthropic.com</span> y se agregan aquí para monitoreo centralizado.
      </p>
    </div>
  )
}
