require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const jwt       = require('jsonwebtoken')
const bcrypt    = require('bcryptjs')
const helmet    = require('helmet')
const rateLimit = require('express-rate-limit')
const fs        = require('fs')
const fsp       = require('fs/promises')
const path      = require('path')
const os        = require('os')
const net        = require('net')
const http       = require('http')
const https      = require('https')
const mysql     = require('mysql2/promise')

const app    = express()
const PORT   = process.env.PORT ?? 8000
const IS_PROD = process.env.NODE_ENV === 'production'

// JWT secret — obligatorio en producción, sin fallback inseguro
const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  if (IS_PROD) throw new Error('JWT_SECRET es obligatorio en producción')
  console.warn('[dev] JWT_SECRET no definido — usando secreto temporal de desarrollo')
}
const JWT_SECRET = SECRET ?? 'dev-only-' + Math.random().toString(36)

// CORS — whitelist desde env (CORS_ORIGINS=https://sigah.mx,https://www.sigah.mx)
const ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',').map(s => s.trim())
app.use(cors({ origin: ORIGINS, credentials: true }))
app.use(helmet())
app.set('trust proxy', 1)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limit en login: 5 intentos / minuto / IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Demasiados intentos. Espera un minuto.' },
})

// Usuarios — contraseñas vía env en prod, defaults solo en dev
const USERS = {
  gustavo: {
    username: 'gustavo', nombre: 'Gustavo López Carballo', email: 'djpiyama123@gmail.com',
    password: bcrypt.hashSync(process.env.PWD_GUSTAVO ?? 'Sigah2026!', 10),
    role: 'admin', avatar: 'GL',
  },
  carlos: {
    username: 'carlos', nombre: 'Carlos Oswaldo Ramírez González', email: 'carlos@sigah.mx',
    password: bcrypt.hashSync(process.env.PWD_CARLOS ?? 'Sigah2026!', 10),
    role: 'admin', avatar: 'CR',
  },
  demo: {
    username: 'demo', nombre: 'Usuario Demo Hospital', email: 'demo@hospital.mx',
    password: bcrypt.hashSync(process.env.PWD_DEMO ?? 'demo123', 10),
    role: 'user', avatar: 'DH',
  },
}

function auth(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ detail: 'No autenticado' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ detail: 'Token inválido o expirado' })
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ detail: 'Acceso no autorizado' })
    next()
  }
}

app.get('/',       (_, res) => res.json({ status: 'ok', service: 'SIGAH API v1.1.0' }))
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.post(['/auth/token', '/api/auth/token'], loginLimiter, (req, res) => {
  const { username, password } = req.body
  const user = USERS[username]
  if (!user || !bcrypt.compareSync(password ?? '', user.password)) {
    return res.status(401).json({ detail: 'Usuario o contraseña incorrectos' })
  }
  const token = jwt.sign({ sub: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ access_token: token, token_type: 'bearer', role: user.role, nombre: user.nombre })
})

app.get(['/auth/me', '/api/auth/me'], auth, (req, res) => {
  const user = USERS[req.user.sub]
  if (!user) return res.status(404).json({ detail: 'Usuario no encontrado' })
  const { password: _pw, ...safe } = user
  res.json(safe)
})

// Probe TCP: ¿puerto abierto? devuelve latencia ms o null
function probeTcp(host, port, timeout = 2500) {
  return new Promise(resolve => {
    const t0 = Date.now()
    const sock = new net.Socket()
    const done = ok => { sock.destroy(); resolve(ok ? Date.now() - t0 : null) }
    sock.setTimeout(timeout)
    sock.once('connect', () => done(true))
    sock.once('timeout', () => done(false))
    sock.once('error', () => done(false))
    sock.connect(port, host)
  })
}

// Probe HTTP(S): devuelve latencia ms si responde <500, si no null
function probeHttp(url, timeout = 3000) {
  return new Promise(resolve => {
    const t0 = Date.now()
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { timeout, rejectUnauthorized: false }, res => {
      res.resume()
      resolve(res.statusCode && res.statusCode < 500 ? Date.now() - t0 : null)
    })
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.on('error', () => resolve(null))
  })
}

async function diskPct() {
  try {
    const s = await fsp.statfs('/')
    return Math.round(((s.blocks - s.bfree) / s.blocks) * 100)
  } catch { return 0 }
}

app.get('/api/monitor/status', auth, async (_, res) => {
  const targets = [
    { name: 'API SIGAH (FastAPI)', kind: 'http', addr: 'http://backend:8000/health' },
    { name: 'Base de datos (MySQL)', kind: 'tcp', host: 'mysql', port: 3306 },
    { name: 'Bot WhatsApp', kind: 'http', addr: 'http://bot:3000/health' },
    { name: 'Panel API (Node)', kind: 'tcp', host: '127.0.0.1', port: Number(PORT) },
    { name: 'WebPanel CEO', kind: 'http', addr: 'https://panel.129-121-100-147.sslip.io/health' },
    { name: 'App hospitalaria SIGAB', kind: 'http', addr: 'https://sigab.129-121-100-147.sslip.io' },
    { name: 'Portal SIGAH', kind: 'http', addr: 'https://sigah.129-121-100-147.sslip.io' },
    { name: 'Monitor de servicios', kind: 'http', addr: 'https://monitor.sigah.129-121-100-147.sslip.io' },
    { name: 'OpenClaw AI', kind: 'http', addr: 'https://usg.tpf.mybluehost.me' },
  ]
  const services = await Promise.all(targets.map(async t => {
    const lat = t.kind === 'tcp' ? await probeTcp(t.host, t.port) : await probeHttp(t.addr)
    return {
      name: t.name,
      status: lat === null ? 'error' : lat > 800 ? 'warning' : 'ok',
      uptime: lat === null ? 'caído' : 'activo',
      latency_ms: lat ?? 0,
    }
  }))
  const totalmem = os.totalmem(), freemem = os.freemem()
  const ram = Math.round(((totalmem - freemem) / totalmem) * 100)
  const load = os.loadavg()[0]
  const cpu = Math.min(100, Math.round((load / os.cpus().length) * 100))
  res.json({ services, cpu, ram, disk: await diskPct(), last_checked: new Date().toISOString() })
})

app.get('/api/dashboard/kpis', auth, async (_, res) => {
  const pool = getPool()
  if (!pool) return res.json({ equipos_registrados: 0, mantenimientos_activos: 0, alertas_criticas: 0, activos_en_uso: 0, instituciones: 0, contratos_activos: 0 })
  try {
    const q = async sql => { const [r] = await pool.query(sql); return r[0]?.n ?? 0 }
    const [equipos, operativos, ordenes, alertas, hospitales, contratos] = await Promise.all([
      q('SELECT COUNT(*) n FROM equipos'),
      q("SELECT COUNT(*) n FROM equipos WHERE estado='operativo'"),
      q("SELECT COUNT(*) n FROM ordenes_servicio WHERE estado='abierta'"),
      q("SELECT COUNT(*) n FROM alertas WHERE prioridad='critica' AND leida=0"),
      q('SELECT COUNT(*) n FROM hospitales'),
      q('SELECT COUNT(DISTINCT numero_contrato) n FROM equipos WHERE numero_contrato IS NOT NULL AND numero_contrato<>""'),
    ])
    res.json({
      equipos_registrados: equipos,
      activos_en_uso: operativos,
      mantenimientos_activos: ordenes,
      alertas_criticas: alertas,
      instituciones: hospitales,
      contratos_activos: contratos,
    })
  } catch (e) {
    res.status(502).json({ detail: 'Error leyendo KPIs', error: e.code ?? String(e) })
  }
})

// Órdenes de servicio reales
app.get('/api/ordenes', auth, async (_, res) => {
  const pool = getPool()
  if (!pool) return res.json({ ordenes: [] })
  try {
    const [rows] = await pool.query(
      `SELECT numero_orden, equipo_nombre, equipo_marca, equipo_modelo, area,
              tipo_mantenimiento, tipo_atencion, falla_reportada, fecha, tecnico_nombre,
              estado, prioridad, origen, indice_salud, probabilidad_falla
       FROM ordenes_servicio ORDER BY fecha DESC, id DESC LIMIT 200`
    )
    res.json({ total: rows.length, ordenes: rows.map(o => ({
      numero: o.numero_orden,
      equipo: fixEnc(o.equipo_nombre) || '—',
      marca_modelo: `${fixEnc(o.equipo_marca) || ''} ${fixEnc(o.equipo_modelo) || ''}`.trim() || '—',
      area: fixEnc(o.area) || '—',
      tipo: fixEnc(o.tipo_mantenimiento) || '—',
      atencion: fixEnc(o.tipo_atencion) || '—',
      falla: fixEnc(o.falla_reportada) || '—',
      fecha: fechaISO(o.fecha),
      tecnico: fixEnc(o.tecnico_nombre) || '—',
      estado: o.estado,
      prioridad: o.prioridad,
      origen: o.origen,
      indice_salud: o.indice_salud ?? null,
      probabilidad_falla: o.probabilidad_falla ?? null,
    })) })
  } catch (e) {
    res.status(502).json({ detail: 'Error leyendo órdenes', error: e.code ?? String(e) })
  }
})

// Mantenimientos próximos/vencidos + señales predictivas
app.get(['/api/mantenimientos/proximos', '/api/preventivos/proximos'], auth, async (_, res) => {
  const pool = getPool()
  if (!pool) return res.json({ equipos: [], predictivo: [] })
  try {
    const [eq] = await pool.query(
      `SELECT inventario, serie, nombre, marca, modelo, area, criticidad,
              fecha_proximo_mantenimiento, fecha_ultimo_mantenimiento
       FROM equipos
       WHERE fecha_proximo_mantenimiento IS NOT NULL OR fecha_ultimo_mantenimiento IS NOT NULL
       ORDER BY COALESCE(fecha_proximo_mantenimiento, fecha_ultimo_mantenimiento) ASC
       LIMIT 200`
    )
    // Cadencia de mantenimiento preventivo por criticidad (días) cuando no hay fecha próxima registrada
    const CADENCIA = { critica: 90, critico: 90, alta: 180, alto: 180, media: 270, medio: 270, baja: 365, bajo: 365 }
    const hoy = new Date()
    const equipos = eq.map(e => {
      let f = e.fecha_proximo_mantenimiento ? new Date(e.fecha_proximo_mantenimiento) : null
      let estimado = false
      if (!f && e.fecha_ultimo_mantenimiento) {
        const dcad = CADENCIA[(e.criticidad || '').toLowerCase()] ?? 365
        f = new Date(new Date(e.fecha_ultimo_mantenimiento).getTime() + dcad * 86400000)
        estimado = true
      }
      const dias = f ? Math.round((f - hoy) / 86400000) : null
      return {
        id: e.inventario || e.serie,
        nombre: fixEnc(e.nombre), marca: fixEnc(e.marca), modelo: fixEnc(e.modelo),
        area: fixEnc(e.area) || '—', criticidad: e.criticidad,
        proximo_mant: f ? f.toISOString().slice(0, 10) : '—',
        dias_restantes: dias,
        estimado,
        situacion: dias === null ? 'sin fecha' : dias < 0 ? 'vencido' : dias <= 30 ? 'proximo' : 'al dia',
      }
    })
    const [pred] = await pool.query(
      `SELECT numero_orden, equipo_nombre, area, indice_salud, probabilidad_falla,
              componente_riesgo, ventana_recomendada
       FROM ordenes_servicio
       WHERE probabilidad_falla IS NOT NULL
       ORDER BY probabilidad_falla DESC LIMIT 30`
    )
    const predictivo = pred.map(p => ({
      orden: p.numero_orden,
      equipo: fixEnc(p.equipo_nombre) || '—',
      area: fixEnc(p.area) || '—',
      indice_salud: p.indice_salud ?? null,
      probabilidad_falla: p.probabilidad_falla ?? null,
      componente_riesgo: fixEnc(p.componente_riesgo) || '—',
      ventana_dias: p.ventana_recomendada ?? null,
    }))
    res.json({ total: equipos.length, equipos, predictivo })
  } catch (e) {
    res.status(502).json({ detail: 'Error leyendo mantenimientos', error: e.code ?? String(e) })
  }
})

// Solo admins ven tokens API
app.get('/api/tokens', auth, requireRole('admin'), (_, res) => {
  res.json({
    tokens: [
      { id: 'sk-ant-001', label: 'Claude Code CLI',      created: '2026-05-01', last_used: '2026-05-29', calls: 2847, active: true  },
      { id: 'sk-ant-002', label: 'SIGAH Backend Agent',  created: '2026-04-15', last_used: '2026-05-28', calls: 912,  active: true  },
      { id: 'sk-ant-003', label: 'Portal Análisis Demo', created: '2026-03-10', last_used: '2026-04-02', calls: 148,  active: false },
    ],
    monthly_spend_usd: 18.42,
    tokens_used_this_month: 1_840_000,
  })
})

// === Inventario real: lee la MySQL de producción (solo lectura) ===
// Si SIGAH_DB_HOST no está configurado o la DB no responde, cae a datos mock.
let dbPool = null
function getPool() {
  if (dbPool) return dbPool
  if (!process.env.SIGAH_DB_HOST) return null
  dbPool = mysql.createPool({
    host: process.env.SIGAH_DB_HOST,
    port: Number(process.env.SIGAH_DB_PORT ?? 3306),
    user: process.env.SIGAH_DB_USER,
    password: process.env.SIGAH_DB_PASS,
    database: process.env.SIGAH_DB_NAME,
    charset: 'utf8mb4',
    connectionLimit: 4,
    waitForConnections: true,
  })
  return dbPool
}

const fechaISO = d => (d ? new Date(d).toISOString().slice(0, 10) : '—')
const ESTADOS_VALIDOS = new Set(['operativo', 'alerta', 'mantenimiento', 'critico', 'baja'])

// Los textos están doble-codificados en la DB (mojibake "Ã©"). Revierte una capa.
function fixEnc(s) {
  if (typeof s !== 'string' || !/[-ÿ]/.test(s)) return s
  const r = Buffer.from(s, 'latin1').toString('utf8')
  return r.includes('�') ? s : r
}

function mapEquipo(r) {
  return {
    id: r.inventario || r.serie || ('EQ-' + String(r.id).padStart(4, '0')),
    nombre: fixEnc(r.nombre), marca: fixEnc(r.marca), modelo: fixEnc(r.modelo), serie: r.serie,
    area: fixEnc(r.area || r.piso) || 'Sin área',
    estado: ESTADOS_VALIDOS.has(r.estado) ? r.estado : 'operativo',
    criticidad: ['alta', 'media', 'baja'].includes(r.criticidad) ? r.criticidad : 'media',
    ultimo_mant: fechaISO(r.fecha_ultimo_mantenimiento),
    proximo_mant: fechaISO(r.fecha_proximo_mantenimiento),
    responsable: fixEnc(r.proveedor_servicio) || '—',
    ubicacion: fixEnc(r.ubicacion || r.piso) || '—',
    fecha_alta: fechaISO(r.fecha_instalacion || r.fecha_compra),
    valor_mxn: 0,
  }
}

app.get('/api/equipos', auth, async (_, res) => {
  const pool = getPool()
  if (!pool) return res.json({ fuente: 'mock', equipos: [] })
  try {
    const [rows] = await pool.query(
      `SELECT id, serie, inventario, nombre, marca, modelo, ubicacion, piso, area,
              estado, criticidad, fecha_instalacion, fecha_ultimo_mantenimiento,
              fecha_proximo_mantenimiento, proveedor_servicio, fecha_compra
       FROM equipos ORDER BY id`
    )
    res.json({ fuente: 'mysql', total: rows.length, equipos: rows.map(mapEquipo) })
  } catch (e) {
    res.status(502).json({ detail: 'No se pudo leer la base de datos', error: e.code ?? String(e) })
  }
})

// === Cerebro: sesiones de trabajo de Claude Code ===
// Lee ~/.claude/projects/ del equipo donde corre el backend.
const HOSTNAME = process.env.EQUIPO_NOMBRE ?? os.hostname()

function leerSesiones() {
  const base = path.join(os.homedir(), '.claude', 'projects')
  if (!fs.existsSync(base)) return []
  const sesiones = []
  for (const dir of fs.readdirSync(base)) {
    if (!/SIGAB|SIGAH/i.test(dir)) continue
    const proyecto = dir.replace(/^-mnt-c-Users-[^-]+-Desktop-Bioingeneria-/, '').replace(/-/g, ' ').trim()
    const dirPath = path.join(base, dir)
    let archivos
    try { archivos = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl')) } catch { continue }
    for (const file of archivos) {
      const full = path.join(dirPath, file)
      let stat
      try { stat = fs.statSync(full) } catch { continue }
      sesiones.push({
        id: file.replace('.jsonl', '').slice(0, 8),
        proyecto,
        titulo: primerMensaje(full),
        fecha: stat.mtime.toISOString(),
        size_kb: Math.round(stat.size / 1024),
      })
    }
  }
  return sesiones.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 40)
}

function primerMensaje(file) {
  try {
    const head = fs.readFileSync(file, { encoding: 'utf8' }).split('\n').slice(0, 60)
    for (const line of head) {
      if (!line.includes('"type":"user"')) continue
      const d = JSON.parse(line)
      let c = d.message?.content
      if (Array.isArray(c)) c = c.map(x => x.text ?? '').join(' ')
      if (typeof c === 'string' && c.trim() && !c.startsWith('<')) {
        return c.replace(/\s+/g, ' ').trim().slice(0, 90)
      }
    }
  } catch { /* noop */ }
  return 'Sesión de trabajo'
}

app.get('/api/cerebro/sesiones', auth, requireRole('admin'), (_, res) => {
  res.json({ equipo: HOSTNAME, sesiones: leerSesiones() })
})

app.listen(PORT, () => console.log(`SIGAH API v1.1.0 en http://localhost:${PORT}  [${IS_PROD ? 'prod' : 'dev'}]`))
