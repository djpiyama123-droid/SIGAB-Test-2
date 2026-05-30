export interface PilotEquipment {
  equipo: string
  marca: string
  modelo: string
  serie: string
  ubicacion: string
}

export const pilotInventory: PilotEquipment[] = [
  {
    equipo: 'Arco en C (rayos X móvil)',
    marca: 'GE',
    modelo: 'OEC 9800',
    serie: '82-0751',
    ubicacion: 'Quirófano 2do piso',
  },
  {
    equipo: 'Monitor de signos vitales',
    marca: 'GE',
    modelo: 'CARESCAPE B650',
    serie: 'SK416381232HA',
    ubicacion: 'Quirófano 2do piso',
  },
  {
    equipo: 'Monitor de signos vitales',
    marca: 'GE',
    modelo: 'CARESCAPE B650',
    serie: 'STF244011695A',
    ubicacion: 'Quirófano 2do piso',
  },
  {
    equipo: 'Ventilador Neo-Ped-Adulto',
    marca: 'Vyaire Medical',
    modelo: 'Bellavista 1000',
    serie: 'MB203775',
    ubicacion: 'UCIN',
  },
  {
    equipo: 'Incubadora dual',
    marca: 'N/D',
    modelo: 'N/D',
    serie: 'N/D',
    ubicacion: 'UCIN',
  },
  {
    equipo: 'Silla de estereotaxia',
    marca: 'N/D',
    modelo: 'N/D',
    serie: 'N/D',
    ubicacion: 'Clínica de Mama',
  },
]
