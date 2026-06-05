import {
  IconCoin, IconTrendingUp, IconBolt, IconArrowDownRight, IconInfoCircle, IconStar,
} from '@tabler/icons-react'
import {
  periodoMayo2026, totalTokens, totalCostoUsd, totalMensajes,
  PLAN_SUSCRIPCION, TARIFARIO, comparativaPlataformas, type ModelUsage,
} from '../../data/tokenCostReport'

const fmtUsd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtTok = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n)

const MODEL_COLOR: Record<ModelUsage['modelo'], string> = {
  Opus:   'text-sigah-blue',
  Sonnet: 'text-esmeralda',
  Haiku:  'text-ambar',
}
const MODEL_BAR: Record<ModelUsage['modelo'], string> = {
  Opus:   'bg-sigah-blue',
  Sonnet: 'bg-esmeralda',
  Haiku:  'bg-ambar',
}

export default function TokensPage() {
  const p = periodoMayo2026
  const tok = totalTokens(p)
  const costo = totalCostoUsd(p)
  const msgs = totalMensajes(p)
  const totalTok = tok.input + tok.output + tok.cacheWrite + tok.cacheRead

  const ahorro = costo - PLAN_SUSCRIPCION.costoMensualUsd
  const factor = costo / PLAN_SUSCRIPCION.costoMensualUsd

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Costo de tokens — Operación IA</h1>
        <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
          Consumo de Claude Code en el entorno SIGAH/SIGAB · <span className="font-medium text-slate-600">{p.periodo}</span> (30 días)
        </p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-sigah-blue-dark rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-data font-normal text-xs text-white/60 uppercase tracking-wider">Costo API-equivalente</p>
            <IconCoin size={18} className="text-white/70" />
          </div>
          <p className="font-sans font-medium text-3xl text-white">{fmtUsd(costo)}</p>
          <p className="font-data font-normal text-xs text-white/50 mt-1">si se facturara por token vía API</p>
        </div>

        <div className="bg-white rounded-xl card-border p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-data font-normal text-xs text-slate-400 uppercase tracking-wider">Tokens procesados</p>
            <IconBolt size={18} className="text-ambar" />
          </div>
          <p className="font-sans font-medium text-3xl text-slate-800">{(totalTok / 1_000_000).toFixed(0)}<span className="text-base text-slate-400 font-normal"> M</span></p>
          <p className="font-data font-normal text-xs text-slate-400 mt-1">{msgs.toLocaleString()} mensajes de IA</p>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-data font-normal text-xs text-esmeralda uppercase tracking-wider">Ahorro vs API</p>
            <IconArrowDownRight size={18} className="text-esmeralda" />
          </div>
          <p className="font-sans font-medium text-3xl text-esmeralda">{fmtUsd(ahorro)}</p>
          <p className="font-data font-normal text-xs text-slate-500 mt-1">
            plan {PLAN_SUSCRIPCION.nombre} {fmtUsd(PLAN_SUSCRIPCION.costoMensualUsd)}/mes → <span className="font-medium">{factor.toFixed(0)}× valor</span>
          </p>
        </div>
      </div>

      {/* Desglose por modelo */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-sans font-medium text-sm text-slate-700">Desglose por modelo</h2>
        </div>
        <div className="divide-y divide-border">
          {p.modelos.map(m => {
            const mTotal = m.input + m.output + m.cacheWrite + m.cacheRead
            const pct = (m.costoUsd / costo) * 100
            return (
              <div key={m.modelo} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-sans font-medium text-sm ${MODEL_COLOR[m.modelo]}`}>Claude {m.modelo}</span>
                    <span className="font-data font-normal text-xs text-slate-400">· {m.mensajes.toLocaleString()} msgs · {fmtTok(mTotal)} tokens</span>
                  </div>
                  <span className="font-sans font-medium text-sm text-slate-800">{fmtUsd(m.costoUsd)}</span>
                </div>
                <div className="w-full h-2 bg-bg-alt rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${MODEL_BAR[m.modelo]}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Input', m.input], ['Output', m.output],
                    ['Cache write', m.cacheWrite], ['Cache read', m.cacheRead],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <p className="font-data font-normal text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="font-data font-normal text-xs text-slate-600">{fmtTok(val as number)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tarifario de referencia */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <IconTrendingUp size={15} className="text-sigah-blue" />
          <h2 className="font-sans font-medium text-sm text-slate-700">Tarifario API de referencia (USD / millón de tokens)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-border bg-bg-principal">
                {['Modelo', 'Input', 'Output', 'Cache write', 'Cache read'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Object.keys(TARIFARIO) as Array<keyof typeof TARIFARIO>).map(modelo => (
                <tr key={modelo}>
                  <td className={`px-4 py-2.5 font-data font-medium ${MODEL_COLOR[modelo]}`}>{modelo}</td>
                  <td className="px-4 py-2.5 font-data text-slate-600">${TARIFARIO[modelo].input.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-data text-slate-600">${TARIFARIO[modelo].output.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-data text-slate-600">${TARIFARIO[modelo].cacheWrite.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-data text-slate-600">${TARIFARIO[modelo].cacheRead.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparativa de plataformas — mismo workload en cada IA */}
      <div className="bg-white rounded-xl card-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-sans font-medium text-sm text-slate-700">Comparativa de plataformas — tu workload en cada IA</h2>
          <p className="font-data font-normal text-xs text-slate-400 mt-0.5">
            Costo mensual equivalente si corrieras los mismos {(totalTok / 1_000_000).toFixed(0)}M tokens en cada plataforma
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-border bg-bg-principal">
                {['Plataforma', 'Modelo', 'Costo/mes', 'Nota'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-data font-normal text-xs text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparativaPlataformas.map(pl => (
                <tr key={pl.plataforma + pl.modelo} className={pl.recomendado ? 'bg-sigah-blue/5' : ''}>
                  <td className="px-4 py-2.5 font-data font-medium text-slate-700 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      {pl.recomendado && <IconStar size={13} className="text-sigah-blue flex-shrink-0" />}
                      {pl.plataforma}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-data text-slate-500 whitespace-nowrap">{pl.modelo}</td>
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-800 whitespace-nowrap">${pl.costoMes.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-data text-xs text-slate-400">{pl.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border bg-bg-principal">
          <p className="font-data font-normal text-xs text-slate-500 leading-relaxed">
            <span className="font-medium text-sigah-blue">Recomendación:</span> esquema híbrido —
            <span className="font-medium"> runtime de SIGAB en IA local</span> (Ollama, nunca sale dato del hospital) +
            <span className="font-medium"> desarrollo en Kimi K2.6</span> (Allegro $99 / Vivace $199, ~5× más barato que Opus, con Agent Swarm).
            Conservar Claude Opus solo para arquitectura crítica.
          </p>
        </div>
      </div>

      {/* Metodología */}
      <div className="bg-bg-alt rounded-xl border border-border p-4 flex gap-3">
        <IconInfoCircle size={16} className="text-sigah-blue flex-shrink-0 mt-0.5" />
        <p className="font-data font-normal text-xs text-slate-500 leading-relaxed">
          Cálculo a partir de los registros de uso de Claude Code en el entorno SIGAH/SIGAB ({p.desde} → {p.hasta}).
          Se suman tokens de entrada, salida y caché por modelo y se aplica el tarifario público de la API de Anthropic.
          El <span className="font-medium text-slate-600">costo API-equivalente</span> es el valor que se pagaría facturando por token;
          con el plan {PLAN_SUSCRIPCION.nombre} (suscripción plana) el costo real fue {fmtUsd(PLAN_SUSCRIPCION.costoMensualUsd)}.
          El uso intensivo de <span className="font-medium">caché de prompts</span> reduce drásticamente el costo de los {fmtTok(tok.cacheRead)} tokens de cache-read.
        </p>
      </div>
    </div>
  )
}
