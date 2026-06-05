export type EstadoEquipo = 'operativo' | 'alerta' | 'mantenimiento' | 'critico' | 'baja'

export interface EquipoBiomedico {
  id: string
  nombre: string
  marca: string
  modelo: string
  area: string
  ubicacion: string
  estado: EstadoEquipo
  proximo_mant: string
  valor_mxn: number
}

export const equiposBiomedicos: EquipoBiomedico[] = [
  { id: 'EQ-001', nombre: 'Arco en C (rayos X móvil)', marca: 'GE',             modelo: 'OEC 9800',        area: 'Quirófano',      ubicacion: 'Quirófano 2do piso', estado: 'operativo',     proximo_mant: '2026-07-15', valor_mxn: 2800000 },
  { id: 'EQ-002', nombre: 'Monitor de signos vitales', marca: 'GE',             modelo: 'CARESCAPE B650',  area: 'Quirófano',      ubicacion: 'Quirófano 2do piso', estado: 'operativo',     proximo_mant: '2026-06-20', valor_mxn: 185000 },
  { id: 'EQ-003', nombre: 'Monitor de signos vitales', marca: 'GE',             modelo: 'CARESCAPE B650',  area: 'Quirófano',      ubicacion: 'Quirófano 2do piso', estado: 'mantenimiento', proximo_mant: '2026-06-05', valor_mxn: 185000 },
  { id: 'EQ-004', nombre: 'Ventilador Neo-Ped-Adulto', marca: 'Vyaire Medical', modelo: 'Bellavista 1000', area: 'UCIN',           ubicacion: 'UCIN',               estado: 'operativo',     proximo_mant: '2026-08-01', valor_mxn: 950000 },
  { id: 'EQ-005', nombre: 'Incubadora dual',           marca: 'Dräger',         modelo: 'Caleo',           area: 'UCIN',           ubicacion: 'UCIN',               estado: 'alerta',        proximo_mant: '2026-06-10', valor_mxn: 420000 },
  { id: 'EQ-006', nombre: 'Silla de estereotaxia',     marca: 'N/D',            modelo: 'N/D',             area: 'Clínica de Mama', ubicacion: 'Clínica de Mama',   estado: 'baja',          proximo_mant: 'N/D',        valor_mxn: 0 },
]

export interface ResumenInventario {
  total: number
  operativos: number
  alertas: number
  mantenimiento: number
  criticos: number
  bajas: number
  areas: number
  valor_total: number
}

export function resumenInventario(equipos: EquipoBiomedico[]): ResumenInventario {
  const count = (estado: EstadoEquipo) => equipos.filter(e => e.estado === estado).length
  return {
    total: equipos.length,
    operativos: count('operativo'),
    alertas: count('alerta'),
    mantenimiento: count('mantenimiento'),
    criticos: count('critico'),
    bajas: count('baja'),
    areas: new Set(equipos.map(e => e.area)).size,
    valor_total: equipos.reduce((s, e) => s + (e.valor_mxn || 0), 0),
  }
}
