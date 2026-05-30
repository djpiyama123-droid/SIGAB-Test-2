import { useState, useRef, useEffect } from 'react'
import { IconTerminal2, IconSend, IconTrash, IconCopy } from '@tabler/icons-react'

interface Line {
  type: 'cmd' | 'out' | 'err' | 'info'
  text: string
}

const HELP_OUTPUT = `
Comandos disponibles en el terminal SIGAB:
  help            Muestra esta ayuda
  status          Estado del sistema SIGAH
  list-equipos    Lista equipos registrados
  tokens          Estado de tokens API Anthropic
  claude --help   Opciones de Claude Code CLI
  clear           Limpiar terminal
`.trim()

const COMMANDS: Record<string, string> = {
  help: HELP_OUTPUT,
  status: '✓ API SIGAH: OK  ✓ DB: OK  ✓ WebSocket: OK  ✓ VPS: OK  ! Backup S3: WARN',
  'list-equipos': 'EQ-001  Ventilador Dräger V500       UCI            [operativo]\nEQ-002  Desfibrilador Zoll M Series  Urgencias      [alerta]\nEQ-003  Monitor Mindray MEC-1200    Hospitalización [operativo]\nEQ-004  Bomba B.Braun Perfusor       Quirófano       [mantenimiento]\nEQ-005  ECG MAC 5500                Cardiología     [operativo]',
  tokens: 'sk-ant-001  Claude Code CLI         2,847 llamadas  Activo\nsk-ant-002  SIGAH Backend Agent       912 llamadas  Activo\nsk-ant-003  Portal Análisis Demo      148 llamadas  Inactivo\n─────────────────────────────────────────────────\nConsumo mensual: $18.42 USD  |  1,840,000 tokens',
  'claude --help': 'Claude Code CLI v1.x\nUso: claude [opciones] [mensaje]\n  --model   Modelo a usar (opus/sonnet/haiku)\n  --file    Incluir archivo en el contexto\n  --output  Formato de salida (text/json)\n  --help    Esta ayuda',
  clear: '',
  '': '',
}

const PROMPT = 'sigah@webpanel:~$'

export default function TerminalPage() {
  const [lines, setLines] = useState<Line[]>([
    { type: 'info', text: 'SIGAB WebPanel — Terminal Claude Code v1.0' },
    { type: 'info', text: `Conectado como ${new Date().toLocaleString('es-MX')}` },
    { type: 'info', text: 'Escribe "help" para ver comandos disponibles.' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const run = (raw: string) => {
    const cmd = raw.trim()
    setLines(prev => [...prev, { type: 'cmd', text: `${PROMPT} ${cmd}` }])

    if (cmd === 'clear') {
      setLines([{ type: 'info', text: 'Terminal limpiado.' }])
      return
    }

    const out = COMMANDS[cmd]
    if (out === undefined) {
      setLines(prev => [...prev, { type: 'err', text: `bash: ${cmd}: comando no encontrado` }])
    } else if (out !== '') {
      out.split('\n').forEach(line => {
        setLines(prev => [...prev, { type: 'out', text: line }])
      })
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = input
      setHistory(h => [...h, val])
      setHistIdx(-1)
      setInput('')
      run(val)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = histIdx + 1
      if (idx < history.length) {
        setHistIdx(idx)
        setInput(history[history.length - 1 - idx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = histIdx - 1
      if (idx < 0) { setHistIdx(-1); setInput('') }
      else { setHistIdx(idx); setInput(history[history.length - 1 - idx]) }
    }
  }

  const copyAll = () => {
    navigator.clipboard.writeText(lines.map(l => l.text).join('\n'))
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Terminal Claude Code</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
            Interfaz de comandos SIGAB WebPanel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card-border text-xs font-data text-slate-500 hover:bg-bg-alt transition-colors">
            <IconCopy size={13} /> Copiar
          </button>
          <button onClick={() => setLines([{ type: 'info', text: 'Terminal limpiado.' }])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card-border text-xs font-data text-slate-500 hover:bg-bg-alt transition-colors">
            <IconTrash size={13} /> Limpiar
          </button>
        </div>
      </div>

      <div
        className="bg-slate-900 rounded-xl overflow-hidden"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Title bar */}
        <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rojo opacity-80" />
            <span className="w-3 h-3 rounded-full bg-ambar opacity-80" />
            <span className="w-3 h-3 rounded-full bg-esmeralda opacity-80" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <IconTerminal2 size={13} className="text-slate-500" />
            <span className="font-mono text-xs text-slate-500">sigab — bash</span>
          </div>
        </div>

        {/* Output */}
        <div className="px-5 py-4 min-h-72 max-h-96 overflow-y-auto font-mono text-xs leading-5 space-y-0.5">
          {lines.map((line, i) => (
            <p
              key={i}
              className={
                line.type === 'cmd'  ? 'text-slate-200' :
                line.type === 'err'  ? 'text-rojo' :
                line.type === 'info' ? 'text-sigah-blue' :
                'text-slate-400'
              }
            >
              {line.text}
            </p>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-700">
          <span className="font-mono text-xs text-esmeralda flex-shrink-0">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent font-mono text-xs text-slate-200 outline-none placeholder-slate-600"
            placeholder="escribe un comando..."
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => { run(input); setInput('') }}
            className="p-1.5 text-slate-500 hover:text-esmeralda transition-colors"
          >
            <IconSend size={13} />
          </button>
        </div>
      </div>

      {/* Quick commands */}
      <div className="flex flex-wrap gap-2">
        <p className="font-data font-normal text-xs text-slate-400 w-full">Comandos rápidos:</p>
        {['help', 'status', 'list-equipos', 'tokens', 'claude --help'].map(cmd => (
          <button
            key={cmd}
            onClick={() => { run(cmd) }}
            className="px-3 py-1.5 rounded-lg bg-white card-border font-mono text-xs text-slate-600 hover:bg-bg-alt transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  )
}
