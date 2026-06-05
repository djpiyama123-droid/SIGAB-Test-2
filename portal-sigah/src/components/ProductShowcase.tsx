import { useState } from 'react'

/* ─── Sidebar compartido ─────────────────────────────────── */
function Sidebar({ active }: { active: string }) {
  const items = [
    { label: 'Dashboard',      icon: '▦' },
    { label: 'Inventario',     icon: '≡' },
    { label: 'Órdenes',        icon: '✓' },
    { label: 'Mantenimiento',  icon: '⚙' },
    { label: 'Monitor',        icon: '◉' },
    { label: 'Reportes',       icon: '⊞' },
  ]
  return (
    <div className="flex flex-col bg-[#003D6B] text-white w-14 min-h-full items-center py-3 gap-1 flex-shrink-0">
      <div className="text-[8px] font-bold text-white/80 mb-3 tracking-widest">SB</div>
      {items.map(i => (
        <div
          key={i.label}
          title={i.label}
          className={`w-9 h-9 flex items-center justify-center rounded text-sm cursor-default ${
            i.label === active ? 'bg-[#006CB7] text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          {i.icon}
        </div>
      ))}
    </div>
  )
}

/* ─── Badge de estado ────────────────────────────────────── */
function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Operativo':   'bg-green-100 text-green-700',
    'En proceso':  'bg-amber-100 text-amber-700',
    'Abierta':     'bg-red-100 text-red-700',
    'Cerrada':     'bg-slate-100 text-slate-500',
    'Programado':  'bg-blue-100 text-blue-700',
    'Crítico':     'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

/* ─── Pantalla 1: Dashboard KPIs ────────────────────────── */
function MockDashboard() {
  const kpis = [
    { label: 'Equipos operativos',    value: '521', sub: '94.2% disponibilidad',    color: 'text-green-600',  bg: 'bg-green-50',  dot: 'bg-green-500' },
    { label: 'En mantenimiento',      value: '87',  sub: '12 programados hoy',      color: 'text-amber-600',  bg: 'bg-amber-50',  dot: 'bg-amber-500' },
    { label: 'Críticos / fuera',      value: '12',  sub: 'Requieren atención',       color: 'text-red-600',    bg: 'bg-red-50',    dot: 'bg-red-500'   },
    { label: 'Valor del parque',      value: '$8.25M', sub: 'MXN · Activo Fijo',    color: 'text-[#006CB7]',  bg: 'bg-blue-50',   dot: 'bg-[#006CB7]' },
  ]
  const bars = [
    { mes: 'Ene', h: 55 }, { mes: 'Feb', h: 70 }, { mes: 'Mar', h: 48 },
    { mes: 'Abr', h: 82 }, { mes: 'May', h: 63 }, { mes: 'Jun', h: 90 },
  ]
  const rows = [
    { folio: 'ORD-26-0244', equipo: 'Ventilador Maquet Servo-i',  estado: 'En proceso' },
    { folio: 'ORD-26-0243', equipo: 'Monitor Hamilton G5',        estado: 'Programado' },
    { folio: 'ORD-26-0242', equipo: 'Desfibrilador Zoll R',       estado: 'Abierta'    },
    { folio: 'ORD-26-0241', equipo: 'Bomba Baxter 6201',          estado: 'Cerrada'    },
  ]
  return (
    <div className="flex h-full">
      <Sidebar active="Dashboard" />
      <div className="flex-1 bg-[#F1F5F9] p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[13px] font-semibold text-slate-900">Dashboard</h1>
            <p className="text-[9px] text-slate-400">HGR No. 1 IMSS Tijuana · 01 Jun 2026</p>
          </div>
          <button className="px-2 py-1 bg-[#006CB7] text-white text-[9px] rounded-md font-medium">Actualizar</button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {kpis.map(k => (
            <div key={k.label} className={`${k.bg} rounded-lg p-2.5 border border-white/60`}>
              <div className="flex items-center gap-1 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${k.dot}`} />
                <span className="text-[8px] text-slate-500 leading-none">{k.label}</span>
              </div>
              <p className={`text-lg font-bold leading-none ${k.color}`}>{k.value}</p>
              <p className="text-[7px] text-slate-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + table */}
        <div className="grid grid-cols-5 gap-2">
          {/* Bar chart */}
          <div className="col-span-3 bg-white rounded-lg p-3 border border-[#E2E8F0]">
            <p className="text-[9px] font-medium text-slate-600 mb-2">Órdenes por mes</p>
            <div className="flex items-end gap-1.5 h-16">
              {bars.map(b => (
                <div key={b.mes} className="flex flex-col items-center flex-1 gap-0.5">
                  <div
                    className="w-full bg-[#006CB7]/80 rounded-t"
                    style={{ height: `${Math.round(b.h * 0.52)}px` }}
                  />
                  <span className="text-[7px] text-slate-400">{b.mes}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut placeholder */}
          <div className="col-span-2 bg-white rounded-lg p-3 border border-[#E2E8F0] flex flex-col items-center justify-center">
            <p className="text-[9px] font-medium text-slate-600 mb-2">Estado del parque</p>
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="5" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="5"
                  strokeDasharray="85 15" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="5"
                  strokeDasharray="14 86" strokeDashoffset="-85" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="5"
                  strokeDasharray="1 99" strokeDashoffset="-99" />
              </svg>
            </div>
            <div className="flex gap-2 mt-1.5">
              {[['#10B981','Op.'],['#F59E0B','Mant.'],['#EF4444','Crít.']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                  <span className="text-[7px] text-slate-400">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent orders table */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] mt-2">
          <div className="px-3 py-2 border-b border-[#E2E8F0]">
            <p className="text-[9px] font-medium text-slate-600">Últimas órdenes</p>
          </div>
          <table className="w-full text-[8px]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                {['Folio','Equipo','Estado'].map(h => (
                  <th key={h} className="px-3 py-1.5 text-left text-slate-400 font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.folio} className="border-b border-[#E2E8F0]/50 last:border-0">
                  <td className="px-3 py-1.5 font-mono text-slate-500">{r.folio}</td>
                  <td className="px-3 py-1.5 text-slate-700">{r.equipo}</td>
                  <td className="px-3 py-1.5"><Badge status={r.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Pantalla 2: Lista de órdenes ──────────────────────── */
function MockOrdenes() {
  const rows = [
    { folio: 'ORD-26-0244', equipo: 'Ventilador Maquet Servo-i',  tipo: 'Correctivo', tecnico: 'Ing. Torres',    prio: 'Alta',    estado: 'En proceso' },
    { folio: 'ORD-26-0243', equipo: 'Monitor Hamilton G5',        tipo: 'Preventivo', tecnico: 'Ing. López',     prio: 'Media',   estado: 'Programado' },
    { folio: 'ORD-26-0242', equipo: 'Desfibrilador Zoll R',       tipo: 'Correctivo', tecnico: 'Ing. García',    prio: 'Crítica', estado: 'Abierta'    },
    { folio: 'ORD-26-0241', equipo: 'Bomba Baxter 6201',          tipo: 'Preventivo', tecnico: 'Ing. Martínez',  prio: 'Baja',    estado: 'Cerrada'    },
    { folio: 'ORD-26-0240', equipo: 'Ecógrafo GE Logiq P9',       tipo: 'Calibración',tecnico: 'Ing. Torres',    prio: 'Media',   estado: 'Cerrada'    },
    { folio: 'ORD-26-0239', equipo: 'Electrobisturí Valleylab',   tipo: 'Correctivo', tecnico: 'Ing. Rodríguez', prio: 'Alta',    estado: 'En proceso' },
  ]
  const prioColor: Record<string, string> = {
    'Crítica': 'text-red-600 font-semibold',
    'Alta':    'text-amber-600 font-medium',
    'Media':   'text-slate-600',
    'Baja':    'text-slate-400',
  }
  return (
    <div className="flex h-full">
      <Sidebar active="Órdenes" />
      <div className="flex-1 bg-[#F1F5F9] p-4 overflow-hidden flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[13px] font-semibold text-slate-900">Órdenes de servicio</h1>
          <button className="px-2 py-1 bg-[#006CB7] text-white text-[9px] rounded-md font-medium">+ Nueva orden</button>
        </div>

        {/* Chips */}
        <div className="flex gap-2">
          {[['Abiertas','8','bg-red-50 text-red-600'],['En proceso','24','bg-amber-50 text-amber-600'],['Cerradas','212','bg-green-50 text-green-600'],['Total','244','bg-blue-50 text-[#006CB7]']].map(([l,v,c]) => (
            <div key={l} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-medium ${c}`}>
              <span>{l}</span><span className="font-bold">{v}</span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 h-7 bg-white border border-[#E2E8F0] rounded-md flex items-center px-2 gap-1">
            <span className="text-slate-300 text-[10px]">⌕</span>
            <span className="text-[8px] text-slate-300">Buscar folio o equipo…</span>
          </div>
          {['Estado ▾','Tipo ▾','Técnico ▾'].map(f => (
            <div key={f} className="h-7 px-2 bg-white border border-[#E2E8F0] rounded-md flex items-center text-[8px] text-slate-400 whitespace-nowrap">{f}</div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] flex-1 overflow-hidden">
          <table className="w-full text-[8px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-slate-50">
                {['Folio','Equipo','Tipo','Técnico','Prioridad','Estado'].map(h => (
                  <th key={h} className="px-2 py-2 text-left text-slate-400 font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.folio} className="border-b border-[#E2E8F0]/50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-2 py-2 font-mono text-[#006CB7]">{r.folio}</td>
                  <td className="px-2 py-2 text-slate-700 max-w-[100px] truncate">{r.equipo}</td>
                  <td className="px-2 py-2 text-slate-500">{r.tipo}</td>
                  <td className="px-2 py-2 text-slate-500">{r.tecnico}</td>
                  <td className={`px-2 py-2 ${prioColor[r.prio]}`}>{r.prio}</td>
                  <td className="px-2 py-2"><Badge status={r.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[7px] text-slate-400">Mostrando 1–6 de 244 órdenes</span>
            <div className="flex gap-1">
              {['‹','1','2','3','›'].map(p => (
                <div key={p} className={`w-5 h-5 flex items-center justify-center text-[7px] rounded ${p==='1'?'bg-[#006CB7] text-white':'text-slate-400 border border-[#E2E8F0]'}`}>{p}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Pantalla 3: Ficha de equipo ───────────────────────── */
function MockFicha() {
  const historial = [
    { fecha: '15 May 2026', tipo: 'Preventivo', tecnico: 'Ing. Torres',    estado: 'Cerrada'   },
    { fecha: '02 Mar 2026', tipo: 'Correctivo', tecnico: 'Ing. García',    estado: 'Cerrada'   },
    { fecha: '10 Ene 2026', tipo: 'Preventivo', tecnico: 'Ing. López',     estado: 'Cerrada'   },
    { fecha: '05 Nov 2025', tipo: 'Correctivo', tecnico: 'Ing. Rodríguez', estado: 'Cerrada'   },
    { fecha: '20 Sep 2025', tipo: 'Preventivo', tecnico: 'Ing. Torres',    estado: 'Cerrada'   },
  ]
  return (
    <div className="flex h-full">
      <Sidebar active="Inventario" />
      <div className="flex-1 bg-[#F1F5F9] p-4 overflow-hidden flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button className="text-[10px] text-slate-400 border border-[#E2E8F0] bg-white rounded px-1.5 py-0.5">← Volver</button>
          <div className="flex-1">
            <h1 className="text-[13px] font-semibold text-slate-900">Ventilador Mecánico Maquet Servo-i</h1>
            <p className="text-[8px] text-slate-400">UCI Cama 4 · No. Serie: SRV-2019-08841</p>
          </div>
          <Badge status="Operativo" />
          <button className="px-2 py-1 text-[8px] border border-[#E2E8F0] bg-white rounded-md text-slate-500">Editar</button>
          <button className="px-2 py-1 bg-[#006CB7] text-white text-[9px] rounded-md font-medium">Nueva orden</button>
        </div>

        <div className="flex gap-3 flex-1 overflow-hidden">
          {/* Left: info + QR */}
          <div className="w-52 flex flex-col gap-2">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex flex-col gap-1.5">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Datos del equipo</p>
              {[
                ['Marca / Modelo', 'Maquet · Servo-i'],
                ['No. Serie', 'SRV-2019-08841'],
                ['Ubicación', 'UCI Cama 4'],
                ['Adquisición', '14 Mar 2019'],
                ['Garantía', '14 Mar 2025'],
                ['Valor', '$320,000 MXN'],
                ['Clasificación', 'Clase IIa'],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-[7px] text-slate-400 block">{k}</span>
                  <span className="text-[9px] text-slate-800 font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* QR */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex flex-col items-center gap-1.5">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Código QR</p>
              <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center border border-[#E2E8F0]">
                {/* QR grid placeholder */}
                <svg viewBox="0 0 21 21" className="w-12 h-12">
                  {[0,1,2,3,4,5,6].flatMap(r =>
                    [0,1,2,3,4,5,6].map(c => {
                      const border = (r<3&&c<3)||(r<3&&c>3)||(r>3&&c<3)
                      const inner = (r===1&&c===1)||(r===1&&c===5)||(r===5&&c===1)
                      const noise = Math.sin(r*7+c*13)*0.5+0.5 > 0.5
                      const fill = border || inner || noise ? '#1E293B' : 'transparent'
                      return <rect key={`${r}-${c}`} x={c*3} y={r*3} width={2.5} height={2.5} fill={fill} />
                    })
                  )}
                </svg>
              </div>
              <p className="text-[7px] text-slate-400 text-center">Escanear para acceder al expediente</p>
            </div>
          </div>

          {/* Right: history + photos */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {/* History */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex-1 overflow-hidden">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Historial de servicios</p>
              <div className="flex flex-col gap-2">
                {historial.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${h.tipo==='Correctivo'?'bg-amber-400':'bg-blue-400'}`} />
                      {i < historial.length-1 && <div className="w-px h-5 bg-[#E2E8F0]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-medium text-slate-700">{h.tipo}</span>
                        <Badge status={h.estado} />
                      </div>
                      <span className="text-[7px] text-slate-400">{h.fecha} · {h.tecnico}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-3">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Fotografías</p>
              <div className="flex gap-2">
                {['Frente','Placa serial','Detalle'].map(label => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="w-16 h-12 bg-slate-100 rounded border border-[#E2E8F0] flex items-center justify-center">
                      <span className="text-slate-300 text-lg">⬜</span>
                    </div>
                    <span className="text-[7px] text-slate-400">{label}</span>
                  </div>
                ))}
                <div className="w-16 h-12 bg-slate-50 rounded border border-dashed border-[#E2E8F0] flex items-center justify-center cursor-pointer">
                  <span className="text-slate-300 text-sm">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Componente principal ───────────────────────────────── */
const TABS = [
  { id: 'dashboard', label: 'Dashboard KPIs',      screen: <MockDashboard /> },
  { id: 'ordenes',   label: 'Órdenes de servicio', screen: <MockOrdenes />   },
  { id: 'ficha',     label: 'Ficha de equipo',     screen: <MockFicha />     },
]

export default function ProductShowcase() {
  const [active, setActive] = useState(0)

  return (
    <section id="producto" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            ASÍ SE VE SIGAB
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900 mb-4">
            La aplicación que el hospital usa todos los días
          </h2>
          <p className="font-data font-normal text-base text-slate-500 leading-relaxed">
            SIGAB digitaliza cada equipo, orden de servicio y mantenimiento —
            visible desde cualquier dispositivo, dentro y fuera de red.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActive(i)}
              className={`px-3 sm:px-4 py-2 rounded-xl font-sans font-medium text-xs sm:text-sm transition-all duration-150 ${
                active === i
                  ? 'bg-sigah-blue text-white'
                  : 'bg-bg-alt text-slate-500 hover:text-sigah-blue'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browser frame */}
        <div className="rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 4px 32px rgba(0,108,183,0.10)' }}>
          {/* Chrome bar */}
          <div className="bg-white border-b border-border px-4 py-2.5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-amber-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
            </div>
            <div className="flex-1 bg-[#F1F5F9] rounded-md px-3 py-1 text-xs text-slate-400 font-mono">
              app.sigab.mx/{TABS[active].id}
            </div>
          </div>

          {/* Screen content — en móvil mantiene proporción y se desliza horizontalmente */}
          <div className="h-[420px] sm:h-[480px] overflow-x-auto overflow-y-hidden">
            <div className="min-w-[700px] h-full">
              {TABS[active].screen}
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Interfaz de demostración · Datos del piloto HGR No. 1 IMSS Tijuana
        </p>
      </div>
    </section>
  )
}
