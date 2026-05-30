// Base de datos de equipos biomédicos — HGR No. 1 IMSS Tijuana (datos demo)
export type EstadoEquipo = 'operativo' | 'alerta' | 'mantenimiento' | 'critico' | 'baja'
export type Criticidad = 'alta' | 'media' | 'baja'

export interface EquipoBiomedico {
  id: string
  nombre: string
  marca: string
  modelo: string
  serie: string
  area: string
  estado: EstadoEquipo
  criticidad: Criticidad
  ultimo_mant: string
  proximo_mant: string
  responsable: string
  ubicacion: string
  fecha_alta: string
  valor_mxn: number
}

export const equiposBiomedicos: EquipoBiomedico[] = [
  { id: 'EQ-001', nombre: 'Ventilador mecánico',       marca: 'Dräger',   modelo: 'Evita V500',     serie: 'DRG-V500-2841', area: 'UCI',            estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-10', proximo_mant: '2026-08-10', responsable: 'Ing. García',  ubicacion: 'UCI-Cama 3',     fecha_alta: '2023-02-14', valor_mxn: 680000 },
  { id: 'EQ-002', nombre: 'Desfibrilador',             marca: 'Zoll',     modelo: 'M Series',       serie: 'ZOL-MS-1192',   area: 'Urgencias',      estado: 'alerta',       criticidad: 'alta',  ultimo_mant: '2026-03-15', proximo_mant: '2026-06-01', responsable: 'Sistema',      ubicacion: 'Urgencias-Triage',fecha_alta: '2022-09-01', valor_mxn: 195000 },
  { id: 'EQ-003', nombre: 'Monitor de signos vitales', marca: 'Mindray',  modelo: 'MEC-1200',       serie: 'MDR-1200-554',  area: 'Hospitalización',estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-04-20', proximo_mant: '2026-07-20', responsable: 'Dr. Soto',     ubicacion: 'Piso 2-Hab 210', fecha_alta: '2024-01-10', valor_mxn: 88000 },
  { id: 'EQ-004', nombre: 'Bomba de infusión',         marca: 'B.Braun',  modelo: 'Perfusor Space', serie: 'BBR-PS-7781',   area: 'Quirófano',      estado: 'mantenimiento',criticidad: 'alta',  ultimo_mant: '2026-05-28', proximo_mant: '2026-08-28', responsable: 'Ing. García',  ubicacion: 'Quirófano 1',    fecha_alta: '2023-06-22', valor_mxn: 62000 },
  { id: 'EQ-005', nombre: 'Electrocardiógrafo',        marca: 'GE',       modelo: 'MAC 5500',       serie: 'GE-MAC-3320',   area: 'Cardiología',    estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-05-01', proximo_mant: '2026-08-01', responsable: 'Dr. Reyes',    ubicacion: 'Cardio-Consul 4',fecha_alta: '2022-11-30', valor_mxn: 120000 },
  { id: 'EQ-006', nombre: 'Analizador de gases',       marca: 'Abbott',   modelo: 'i-STAT Alinity', serie: 'ABT-IST-9087',  area: 'Laboratorio',    estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-04-05', proximo_mant: '2026-07-05', responsable: 'QFB Luna',     ubicacion: 'Lab Central',    fecha_alta: '2024-03-18', valor_mxn: 210000 },
  { id: 'EQ-007', nombre: 'Cama hospitalaria eléctrica',marca: 'Stryker', modelo: 'InTouch',        serie: 'STK-IT-4412',   area: 'Hospitalización',estado: 'critico',      criticidad: 'baja',  ultimo_mant: '2026-02-10', proximo_mant: '2026-05-10', responsable: 'Mantto.',      ubicacion: 'Piso 3-Hab 305', fecha_alta: '2021-05-05', valor_mxn: 145000 },
  { id: 'EQ-008', nombre: 'Máquina de anestesia',      marca: 'Dräger',   modelo: 'Fabius Tiro',    serie: 'DRG-FT-2210',   area: 'Quirófano',      estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-12', proximo_mant: '2026-08-12', responsable: 'Ing. García',  ubicacion: 'Quirófano 2',    fecha_alta: '2023-01-20', valor_mxn: 920000 },
  { id: 'EQ-009', nombre: 'Ultrasonido portátil',      marca: 'Philips',  modelo: 'Lumify',         serie: 'PHI-LM-6654',   area: 'Imagenología',   estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-04-28', proximo_mant: '2026-07-28', responsable: 'Dr. Vega',     ubicacion: 'Rayos X-Sala 1', fecha_alta: '2024-07-01', valor_mxn: 340000 },
  { id: 'EQ-010', nombre: 'Incubadora neonatal',       marca: 'GE',       modelo: 'Giraffe',        serie: 'GE-GIR-1130',   area: 'Neonatología',   estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-08', proximo_mant: '2026-08-08', responsable: 'Enf. Mora',    ubicacion: 'UCIN-Cuna 2',    fecha_alta: '2022-04-15', valor_mxn: 530000 },
  { id: 'EQ-011', nombre: 'Oxímetro de pulso',         marca: 'Masimo',   modelo: 'Radical-7',      serie: 'MAS-R7-8841',   area: 'UCI',            estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-05-15', proximo_mant: '2026-08-15', responsable: 'Sistema',      ubicacion: 'UCI-Cama 1',     fecha_alta: '2023-09-12', valor_mxn: 48000 },
  { id: 'EQ-012', nombre: 'Bomba de jeringa',          marca: 'B.Braun',  modelo: 'Perfusor compact',serie: 'BBR-PC-3398',  area: 'Pediatría',      estado: 'alerta',       criticidad: 'media', ultimo_mant: '2026-03-22', proximo_mant: '2026-06-22', responsable: 'Ing. García',  ubicacion: 'Pediatría-Hab 4',fecha_alta: '2023-11-05', valor_mxn: 39000 },
  { id: 'EQ-013', nombre: 'Lámpara quirúrgica',        marca: 'Trumpf',   modelo: 'TruLight 5000',  serie: 'TRM-TL-2256',   area: 'Quirófano',      estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-04-18', proximo_mant: '2026-07-18', responsable: 'Mantto.',      ubicacion: 'Quirófano 3',    fecha_alta: '2022-08-09', valor_mxn: 280000 },
  { id: 'EQ-014', nombre: 'Electrobisturí',            marca: 'Medtronic',modelo: 'Valleylab FT10', serie: 'MDT-FT-7741',   area: 'Quirófano',      estado: 'mantenimiento',criticidad: 'alta',  ultimo_mant: '2026-05-25', proximo_mant: '2026-08-25', responsable: 'Ing. García',  ubicacion: 'Quirófano 1',    fecha_alta: '2023-03-27', valor_mxn: 165000 },
  { id: 'EQ-015', nombre: 'Monitor multiparámetros',   marca: 'Mindray',  modelo: 'BeneVision N12', serie: 'MDR-N12-9912',  area: 'UCI',            estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-03', proximo_mant: '2026-08-03', responsable: 'Dr. Soto',     ubicacion: 'UCI-Cama 4',     fecha_alta: '2024-02-19', valor_mxn: 175000 },
  { id: 'EQ-016', nombre: 'Aspirador de secreciones',  marca: 'Laerdal',  modelo: 'LSU',            serie: 'LRD-LSU-4420',  area: 'Urgencias',      estado: 'operativo',    criticidad: 'baja',  ultimo_mant: '2026-04-11', proximo_mant: '2026-07-11', responsable: 'Mantto.',      ubicacion: 'Urgencias-Box 2',fecha_alta: '2023-07-14', valor_mxn: 28000 },
  { id: 'EQ-017', nombre: 'Centrífuga de laboratorio', marca: 'Thermo',   modelo: 'Sorvall ST8',    serie: 'THR-ST8-1187',  area: 'Laboratorio',    estado: 'operativo',    criticidad: 'baja',  ultimo_mant: '2026-03-30', proximo_mant: '2026-06-30', responsable: 'QFB Luna',     ubicacion: 'Lab Central',    fecha_alta: '2022-12-01', valor_mxn: 72000 },
  { id: 'EQ-018', nombre: 'Rayos X fijo',              marca: 'Siemens',  modelo: 'Multix Impact',  serie: 'SIE-MI-3340',   area: 'Imagenología',   estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-06', proximo_mant: '2026-11-06', responsable: 'Téc. Ríos',    ubicacion: 'Rayos X-Sala 2', fecha_alta: '2021-10-20', valor_mxn: 1850000 },
  { id: 'EQ-019', nombre: 'Tomógrafo',                 marca: 'GE',       modelo: 'Revolution CT',  serie: 'GE-CT-0091',    area: 'Imagenología',   estado: 'alerta',       criticidad: 'alta',  ultimo_mant: '2026-02-28', proximo_mant: '2026-06-15', responsable: 'Téc. Ríos',    ubicacion: 'Tomografía',     fecha_alta: '2022-06-30', valor_mxn: 12500000 },
  { id: 'EQ-020', nombre: 'Esterilizador de vapor',    marca: 'Tuttnauer',modelo: '3870EA',         serie: 'TUT-38-5567',   area: 'CEYE',           estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-09', proximo_mant: '2026-08-09', responsable: 'Mantto.',      ubicacion: 'CEYE',           fecha_alta: '2023-04-08', valor_mxn: 420000 },
  { id: 'EQ-021', nombre: 'Cuna de calor radiante',    marca: 'GE',       modelo: 'Panda Warmer',   serie: 'GE-PW-2231',    area: 'Neonatología',   estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-04-25', proximo_mant: '2026-07-25', responsable: 'Enf. Mora',    ubicacion: 'UCIN-Cuna 5',    fecha_alta: '2023-08-17', valor_mxn: 310000 },
  { id: 'EQ-022', nombre: 'Hemodializadora',           marca: 'Fresenius',modelo: '4008S',          serie: 'FRE-40-8890',   area: 'Hemodiálisis',   estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-11', proximo_mant: '2026-08-11', responsable: 'Ing. García',  ubicacion: 'Hemodiálisis-1', fecha_alta: '2022-03-03', valor_mxn: 590000 },
  { id: 'EQ-023', nombre: 'Monitor fetal',             marca: 'Philips',  modelo: 'Avalon FM30',    serie: 'PHI-FM-1142',   area: 'Toco-Cirugía',   estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-04-14', proximo_mant: '2026-07-14', responsable: 'Dr. Vega',     ubicacion: 'Tococirugía-1',  fecha_alta: '2024-05-22', valor_mxn: 135000 },
  { id: 'EQ-024', nombre: 'Bomba de infusión',         marca: 'B.Braun',  modelo: 'Infusomat Space',serie: 'BBR-IS-6634',   area: 'Oncología',      estado: 'critico',      criticidad: 'alta',  ultimo_mant: '2026-01-15', proximo_mant: '2026-04-15', responsable: 'Sistema',      ubicacion: 'Oncología-Sala', fecha_alta: '2021-12-11', valor_mxn: 64000 },
  { id: 'EQ-025', nombre: 'Ventilador de transporte',  marca: 'Hamilton', modelo: 'T1',             serie: 'HAM-T1-7720',   area: 'Urgencias',      estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-02', proximo_mant: '2026-08-02', responsable: 'Ing. García',  ubicacion: 'Urgencias-Box 1',fecha_alta: '2023-10-09', valor_mxn: 410000 },
  { id: 'EQ-026', nombre: 'Microscopio quirúrgico',    marca: 'Leica',    modelo: 'M530 OHX',       serie: 'LEI-M5-3301',   area: 'Quirófano',      estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-04-22', proximo_mant: '2026-07-22', responsable: 'Mantto.',      ubicacion: 'Quirófano 4',    fecha_alta: '2022-07-28', valor_mxn: 980000 },
  { id: 'EQ-027', nombre: 'Báscula con estadímetro',   marca: 'Seca',     modelo: '700',            serie: 'SEC-700-9981',  area: 'Consulta externa',estado: 'operativo',   criticidad: 'baja',  ultimo_mant: '2026-03-18', proximo_mant: '2026-09-18', responsable: 'Enf. Mora',    ubicacion: 'Consulta-Mod 3', fecha_alta: '2024-08-30', valor_mxn: 18000 },
  { id: 'EQ-028', nombre: 'Refrigerador de vacunas',   marca: 'Haier',    modelo: 'HBC-120',        serie: 'HAI-HBC-2240',  area: 'Vacunación',     estado: 'alerta',       criticidad: 'alta',  ultimo_mant: '2026-03-25', proximo_mant: '2026-06-25', responsable: 'Enf. Mora',    ubicacion: 'Módulo vacunas', fecha_alta: '2023-05-19', valor_mxn: 54000 },
  { id: 'EQ-029', nombre: 'Monitor de signos vitales', marca: 'Mindray',  modelo: 'uMEC 12',        serie: 'MDR-U12-4419',  area: 'Recuperación',   estado: 'operativo',    criticidad: 'media', ultimo_mant: '2026-05-07', proximo_mant: '2026-08-07', responsable: 'Dr. Soto',     ubicacion: 'Recuperación-2', fecha_alta: '2024-04-11', valor_mxn: 92000 },
  { id: 'EQ-030', nombre: 'Desfibrilador / DEA',       marca: 'Philips',  modelo: 'HeartStart FRx', serie: 'PHI-HS-1098',   area: 'Hospitalización',estado: 'operativo',    criticidad: 'alta',  ultimo_mant: '2026-05-13', proximo_mant: '2026-08-13', responsable: 'Sistema',      ubicacion: 'Piso 1-Pasillo', fecha_alta: '2023-12-20', valor_mxn: 38000 },
]

export const areasHospital = [
  'UCI', 'Urgencias', 'Quirófano', 'Hospitalización', 'Cardiología', 'Laboratorio',
  'Imagenología', 'Neonatología', 'Pediatría', 'CEYE', 'Hemodiálisis', 'Toco-Cirugía',
  'Oncología', 'Consulta externa', 'Vacunación', 'Recuperación',
]

export function resumenInventario(equipos: EquipoBiomedico[]) {
  return {
    total: equipos.length,
    operativos:     equipos.filter(e => e.estado === 'operativo').length,
    alertas:        equipos.filter(e => e.estado === 'alerta').length,
    mantenimiento:  equipos.filter(e => e.estado === 'mantenimiento').length,
    criticos:       equipos.filter(e => e.estado === 'critico').length,
    valor_total:    equipos.reduce((s, e) => s + e.valor_mxn, 0),
    areas:          new Set(equipos.map(e => e.area)).size,
  }
}
