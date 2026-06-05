/**
 * Reporte de costo de tokens — entorno SIGAH/SIGAB.
 *
 * Snapshot calculado a partir de los logs de uso de Claude Code (~/.claude/projects)
 * del periodo, sumando tokens por modelo y aplicando el tarifario público de la
 * API de Anthropic para estimar el costo API-equivalente.
 *
 * Para actualizar: correr el parser de uso y reemplazar los valores de `periodos`.
 */

export interface ModelUsage {
  modelo: 'Opus' | 'Sonnet' | 'Haiku'
  mensajes: number
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
  costoUsd: number
}

export interface PeriodoCosto {
  periodo: string        // etiqueta legible
  desde: string
  hasta: string
  modelos: ModelUsage[]
}

// Tarifario público API Anthropic 2026 (USD por millón de tokens) — referencia mostrada en UI
// Opus 4.7 actualizó a $5/$25 (antes $15/$75); Sonnet/Haiku sin cambio.
export const TARIFARIO = {
  Opus:   { input: 5.0, output: 25.0, cacheWrite: 6.25, cacheRead: 0.5 },
  Sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
  Haiku:  { input: 1.0, output: 5.0,  cacheWrite: 1.25, cacheRead: 0.1 },
} as const

// Costo del plan de suscripción que paga el usuario (plano, no por token)
export const PLAN_SUSCRIPCION = {
  nombre: 'Claude Pro',
  costoMensualUsd: 20,
}

export const periodoMayo2026: PeriodoCosto = {
  periodo: 'Mayo 2026',
  desde: '2026-05-01',
  hasta: '2026-05-31',
  modelos: [
    { modelo: 'Opus',   mensajes: 2164, input: 142441, output: 8003712, cacheWrite: 24200343, cacheRead: 205240836, costoUsd: 454.68 },
    { modelo: 'Sonnet', mensajes: 6107, input: 92014,  output: 4659392, cacheWrite: 25020975, cacheRead: 501031070, costoUsd: 314.30 },
    { modelo: 'Haiku',  mensajes: 449,  input: 25055,  output: 69140,   cacheWrite: 4145212,  cacheRead: 38475295,  costoUsd: 9.40 },
  ],
}

// Comparativa: costo del MISMO workload de mayo en cada plataforma (USD/mes equivalente)
export interface PlataformaCosto {
  plataforma: string
  modelo: string
  costoMes: number
  nota: string
  recomendado?: boolean
}

export const comparativaPlataformas: PlataformaCosto[] = [
  { plataforma: 'DeepSeek',  modelo: 'V4 Flash',       costoMes: 13,   nota: 'Más barato; coding decente' },
  { plataforma: 'DeepSeek',  modelo: 'V4 Pro',         costoMes: 45,   nota: '1.6T MoE, coding fuerte, ya lo usas local' },
  { plataforma: 'Kimi',      modelo: 'K2.5',           costoMes: 138,  nota: 'Muy buen coding, barato' },
  { plataforma: 'Anthropic', modelo: 'Haiku 4.5',      costoMes: 205,  nota: 'Rápido, menor capacidad' },
  { plataforma: 'Kimi',      modelo: 'K2.6',           costoMes: 221,  nota: 'Casi-flagship + Agent Swarm', recomendado: true },
  { plataforma: 'Google',    modelo: 'Gemini 3.5 Flash', costoMes: 307, nota: 'Buen balance, multimodal' },
  { plataforma: 'Google',    modelo: 'Gemini 3.1 Pro', costoMes: 409,  nota: 'Sólido, multimodal' },
  { plataforma: 'OpenAI',    modelo: 'GPT-5.4',        costoMes: 511,  nota: 'Caro para cache-heavy' },
  { plataforma: 'Anthropic', modelo: 'Sonnet 4.6',     costoMes: 615,  nota: 'Top coding, caro' },
  { plataforma: 'OpenAI',    modelo: 'GPT-5.5',        costoMes: 1022, nota: 'El más caro' },
  { plataforma: 'Anthropic', modelo: 'Opus 4.7 (hoy)', costoMes: 1026, nota: 'Máxima calidad, máximo costo' },
]

// Helpers de agregación
export function totalTokens(p: PeriodoCosto) {
  return p.modelos.reduce(
    (acc, m) => ({
      input: acc.input + m.input,
      output: acc.output + m.output,
      cacheWrite: acc.cacheWrite + m.cacheWrite,
      cacheRead: acc.cacheRead + m.cacheRead,
    }),
    { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
  )
}

export function totalCostoUsd(p: PeriodoCosto) {
  return p.modelos.reduce((acc, m) => acc + m.costoUsd, 0)
}

export function totalMensajes(p: PeriodoCosto) {
  return p.modelos.reduce((acc, m) => acc + m.mensajes, 0)
}
