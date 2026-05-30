export interface MonthlyData {
  label: string
  hospitales: number
  ingresos: number
  costos: number
}

export const financialData: MonthlyData[] = [
  { label: 'M1',  hospitales: 1,  ingresos: 4000,  costos: 1200  },
  { label: 'M2',  hospitales: 1,  ingresos: 4000,  costos: 1200  },
  { label: 'M3',  hospitales: 2,  ingresos: 28000, costos: 2400  },
  { label: 'M4',  hospitales: 2,  ingresos: 8000,  costos: 2400  },
  { label: 'M5',  hospitales: 3,  ingresos: 32000, costos: 3600  },
  { label: 'M6',  hospitales: 4,  ingresos: 36000, costos: 4800  },
  { label: 'M7',  hospitales: 5,  ingresos: 40000, costos: 6000  },
  { label: 'M8',  hospitales: 6,  ingresos: 44000, costos: 7200  },
  { label: 'M9',  hospitales: 8,  ingresos: 72000, costos: 9600  },
  { label: 'M10', hospitales: 9,  ingresos: 56000, costos: 10800 },
  { label: 'M11', hospitales: 11, ingresos: 84000, costos: 13200 },
  { label: 'M12', hospitales: 12, ingresos: 68000, costos: 14400 },
]
