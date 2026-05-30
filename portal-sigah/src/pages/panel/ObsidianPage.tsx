import { useState, useEffect } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import {
  IconBrain, IconFolder, IconFileText, IconServer, IconCpu,
  IconChevronRight, IconChevronDown, IconMessage2, IconClockHour4,
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

interface Sesion {
  id: string
  proyecto: string
  titulo: string
  fecha: string
  size_kb: number
}

interface FileNode {
  name: string
  type: 'folder' | 'file'
  children?: FileNode[]
  content?: string
}

const VAULTS: Record<string, { label: string; icon: React.ReactNode; tree: FileNode[]; specs: Record<string, string> }> = {
  asus: {
    label: 'ASUS TUF Gaming A16',
    icon: <IconCpu size={16} />,
    specs: {
      'CPU':    'AMD Ryzen 9 7845HX',
      'GPU':    'NVIDIA RTX 4070 8GB',
      'RAM':    '16 GB DDR5',
      'SSD':    '512 GB NVMe',
      'OS':     'Windows 11 + WSL2 Ubuntu 24.04',
      'Rol':    'Estación de desarrollo principal',
    },
    tree: [
      {
        name: 'SIGAH', type: 'folder', children: [
          { name: 'Arquitectura.md',    type: 'file', content: '# Arquitectura SIGAH\n\nStack: FastAPI + React + PostgreSQL\n\n## Módulos\n- Auth JWT\n- Inventario biomédico\n- Alertas y mantenimiento\n- Dashboard analítico' },
          { name: 'Stack técnico.md',   type: 'file', content: '# Stack técnico\n\n**Frontend:** Vite + React 19 + TypeScript + Tailwind v4\n**Backend:** FastAPI + Python 3.12\n**DB:** PostgreSQL 16\n**Auth:** JWT / OAuth2\n**Deploy:** VPS Bluehost + Nginx' },
          { name: 'Roadmap 2026.md',    type: 'file', content: '# Roadmap 2026\n\n- [x] Portal comercial v1\n- [x] Login con roles\n- [x] SIGAB WebPanel\n- [ ] Integración IMSS HGR-1\n- [ ] App móvil iOS/Android\n- [ ] Plan B hospitalario completo' },
        ],
      },
      {
        name: 'Dev Setup', type: 'folder', children: [
          { name: 'WSL2 config.md',   type: 'file', content: '# WSL2 Setup\n\nDistro: Ubuntu 24.04\nNode: v20.x\nnpm: 10.8\nPython: 3.12\nClaude Code: instalado globalmente' },
          { name: 'Shortcuts.md',     type: 'file', content: '# Shortcuts frecuentes\n\n```bash\nnpm run dev    # Portal\nbash backend/start.sh  # API\nclaude         # Claude Code CLI\n```' },
        ],
      },
      {
        name: 'Reuniones', type: 'folder', children: [
          { name: '2026-05-29 kick-off.md', type: 'file', content: '# Kick-off SIGAB WebPanel\n\nAsistentes: Gustavo, Carlos Oswaldo\n\n## Agenda\n1. Definición de paneles\n2. Estructura de roles\n3. Timeline despliegue' },
        ],
      },
    ],
  },
  lenovo: {
    label: 'Lenovo ThinkCentre',
    icon: <IconServer size={16} />,
    specs: {
      'CPU':  'Intel Core i5-12400',
      'RAM':  '16 GB DDR4',
      'SSD':  '256 GB SSD + 1 TB HDD',
      'OS':   'Windows 10 Pro',
      'Rol':  'Servidor local / NAS',
    },
    tree: [
      {
        name: 'Servidor local', type: 'folder', children: [
          { name: 'Backup config.md', type: 'file', content: '# Backup automático\n\nScript: rsync + tarea programada\nFrecuencia: diario 02:00\nDestino: HDD externo + VPS Bluehost' },
          { name: 'Compartidos.md',   type: 'file', content: '# Recursos compartidos en red\n\n- \\\\LENOVO\\SIGAH-docs\n- \\\\LENOVO\\backups\n- Acceso vía VPN local' },
        ],
      },
      {
        name: 'Documentos SIGAH', type: 'folder', children: [
          { name: 'Contratos.md',    type: 'file', content: '# Contratos\n\n- Plan A HGR-1 IMSS Tijuana\n  Inicio: 2026-Q3\n  Setup: $20,000 MXN\n  Mensualidad: $4,000 MXN' },
          { name: 'Facturas.md',     type: 'file', content: '# Control de facturación\n\nRFC: SIGAH s. de R.L.\nCliente: IMSS HGR No.1 Tijuana' },
        ],
      },
    ],
  },
  bluehost: {
    label: 'VPS Bluehost',
    icon: <IconServer size={16} />,
    specs: {
      'CPU':    '2 vCPU',
      'RAM':    '2 GB',
      'Disco':  '30 GB SSD',
      'OS':     'Ubuntu 22.04 LTS',
      'IP':     'Configurada en DNS',
      'Rol':    'Producción SIGAH + API',
    },
    tree: [
      {
        name: 'Nginx', type: 'folder', children: [
          { name: 'sites-available.md', type: 'file', content: '# Nginx config\n\n```nginx\nserver {\n  listen 80;\n  server_name sigah.mx;\n  root /var/www/sigah/dist;\n  try_files $uri /index.html;\n\n  location /api/ {\n    proxy_pass http://127.0.0.1:8000/;\n  }\n}\n```' },
        ],
      },
      {
        name: 'Deploy', type: 'folder', children: [
          { name: 'CI-CD.md', type: 'file', content: '# Pipeline de despliegue\n\n1. `npm run build` en local\n2. `rsync dist/ user@vps:/var/www/sigah/dist/`\n3. Reiniciar uvicorn: `pm2 restart sigah-api`' },
          { name: 'PM2 config.md', type: 'file', content: '# PM2 — SIGAH API\n\n```json\n{\n  "name": "sigah-api",\n  "script": "uvicorn",\n  "args": "main:app --host 0.0.0.0 --port 8000"\n}\n```' },
        ],
      },
      {
        name: 'SSL', type: 'folder', children: [
          { name: 'Certbot.md', type: 'file', content: '# SSL con Certbot\n\n```bash\nsudo certbot --nginx -d sigah.mx -d www.sigah.mx\n```\nRenovación automática cada 90 días.' },
        ],
      },
    ],
  },
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)
  const [selected, setSelected] = useState(false)

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-bg-alt transition-colors text-slate-600"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
          <IconFolder size={13} className="text-ambar flex-shrink-0" />
          <span className="font-data font-normal text-xs text-slate-600">{node.name}</span>
        </button>
        {open && node.children?.map(child => (
          <TreeNode key={child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <FileNodeView node={node} depth={depth} />
  )
}

function FileNodeView({ node, depth }: { node: FileNode; depth: number }) {
  const [showContent, setShowContent] = useState(false)

  return (
    <div>
      <button
        onClick={() => setShowContent(v => !v)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-bg-alt transition-colors"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <IconFileText size={13} className="text-sigah-blue flex-shrink-0" />
        <span className="font-data font-normal text-xs text-slate-500">{node.name}</span>
      </button>
      {showContent && node.content && (
        <div className="mx-3 my-1 p-3 rounded-lg bg-slate-900 border border-slate-700">
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{node.content}</pre>
        </div>
      )}
    </div>
  )
}

function SesionesTrabajo() {
  const { token } = useAuth()
  const [data, setData] = useState<{ equipo: string; sesiones: Sesion[] } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/cerebro/sesiones`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
  }, [token])

  return (
    <div className="bg-white rounded-xl card-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconMessage2 size={15} className="text-sigah-blue" />
          <h2 className="font-sans font-medium text-sm text-slate-700">Sesiones de trabajo Claude Code</h2>
        </div>
        {data && (
          <span className="font-mono text-xs text-slate-400">{data.equipo} · {data.sesiones.length} sesiones</span>
        )}
      </div>
      {error && (
        <div className="px-5 py-6 text-center">
          <p className="font-data font-normal text-xs text-slate-400">
            No hay sesiones disponibles en este equipo (el backend lee ~/.claude/projects del equipo donde corre).
          </p>
        </div>
      )}
      <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
        {data?.sesiones.map(s => (
          <div key={s.id + s.fecha} className="flex items-center gap-3 px-5 py-3">
            <span className={`px-2 py-0.5 rounded text-[10px] font-data font-normal flex-shrink-0 ${
              /SIGAB/i.test(s.proyecto) ? 'bg-blue-50 text-sigah-blue' : 'bg-green-50 text-esmeralda'
            }`}>{s.proyecto}</span>
            <div className="flex-1 min-w-0">
              <p className="font-data font-normal text-sm text-slate-700 truncate">{s.titulo}</p>
              <p className="font-mono text-[10px] text-slate-400">{s.id} · {s.size_kb} KB</p>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0">
              <IconClockHour4 size={12} />
              <span className="font-data font-normal text-xs">
                {new Date(s.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {!data && !error && (
          <div className="px-5 py-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ObsidianPage() {
  const { equipo } = useParams<{ equipo: string }>()
  const vault = equipo ? VAULTS[equipo] : null

  if (!vault) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <IconBrain size={20} className="text-sigah-blue" />
          <div>
            <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">Cerebro de información</h1>
            <p className="font-data font-normal text-sm text-slate-500 mt-0.5">
              Sesiones de Claude, Antigravity y documentos de los 3 equipos
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(VAULTS).map(([key, v]) => (
            <NavLink
              key={key}
              to={`/panel/cerebro/${key}`}
              className="bg-white rounded-xl card-border p-5 flex items-start gap-3 hover:border-sigah-blue transition-colors"
            >
              <div className="p-2 bg-bg-alt rounded-lg flex-shrink-0">{v.icon}</div>
              <div>
                <p className="font-sans font-medium text-sm text-slate-700">{v.label}</p>
                <p className="font-data font-normal text-xs text-slate-400 mt-0.5">
                  {Object.keys(v.specs).length} especificaciones · {v.tree.length} carpetas
                </p>
              </div>
            </NavLink>
          ))}
        </div>

        <SesionesTrabajo />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <IconBrain size={20} className="text-sigah-blue" />
        <div>
          <h1 className="font-sans font-medium text-xl text-sigah-blue-dark">{vault.label}</h1>
          <p className="font-data font-normal text-sm text-slate-500 mt-0.5">Cerebro de información — Vault Obsidian</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Specs */}
        <div className="bg-white rounded-xl card-border p-5 space-y-3">
          <h2 className="font-sans font-medium text-sm text-slate-700 border-b border-border pb-2">Especificaciones</h2>
          {Object.entries(vault.specs).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="font-data font-normal text-xs text-slate-400">{k}</span>
              <span className="font-data font-normal text-xs text-slate-700 text-right">{v}</span>
            </div>
          ))}
        </div>

        {/* File tree */}
        <div className="lg:col-span-2 bg-white rounded-xl card-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <IconBrain size={14} className="text-sigah-blue" />
            <span className="font-sans font-medium text-xs text-slate-700">Vault</span>
          </div>
          <div className="p-2 overflow-y-auto max-h-[480px]">
            {vault.tree.map(node => (
              <TreeNode key={node.name} node={node} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
