import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import type { MonthlyData } from '../data/financialData'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
)

interface Props {
  data: MonthlyData[]
}

export default function FinancialProjection({ data }: Props) {
  const labels     = data.map(d => d.label)
  const ingresos   = data.map(d => d.ingresos)
  const costos     = data.map(d => d.costos)
  const hospitales = data.map(d => d.hospitales)

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Ingresos totales (MXN)',
        data: ingresos,
        backgroundColor: '#185FA5',
        borderRadius: 0,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Costos operativos (MXN)',
        data: costos,
        backgroundColor: '#B4B2A9',
        borderRadius: 0,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Hospitales activos',
        data: hospitales,
        borderColor: '#0F6E56',
        backgroundColor: '#0F6E56',
        pointBackgroundColor: '#0F6E56',
        yAxisID: 'yRight',
        tension: 0.35,
        pointRadius: 4,
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'Inter', size: 12 },
          color: '#475569',
          padding: 20,
          boxWidth: 12,
        },
      },
      title: { display: false },
      tooltip: {
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Source Sans 3', size: 12 },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const label: string = ctx.dataset?.label ?? ''
            const y: number = ctx.parsed?.y ?? 0
            if (label.includes('Hospitales')) {
              return ` ${y} hospital${y !== 1 ? 'es' : ''}`
            }
            return ` $${y.toLocaleString('es-MX')} MXN`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#E2EAF1' },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' },
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        grid: { color: '#E2EAF1' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#64748B',
          callback: (value: number | string) =>
            `$${Number(value).toLocaleString('es-MX')}`,
        },
        title: {
          display: true,
          text: 'Pesos (MXN)',
          font: { family: 'Inter', size: 11 },
          color: '#94A3B8',
        },
      },
      yRight: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#0F6E56',
          stepSize: 2,
        },
        title: {
          display: true,
          text: 'Hospitales activos',
          font: { family: 'Inter', size: 11 },
          color: '#0F6E56',
        },
      },
    },
  }

  return (
    <section id="proyeccion" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            PROYECCIÓN FINANCIERA
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900 mb-4">
            Ciclo inicial de ingresos — Mes 1 a Mes 12
          </h2>
          <p className="font-data font-normal text-base text-slate-500 max-w-2xl leading-relaxed">
            A partir del Mes 3, el Setup Fee de nuevos hospitales proporciona el capital de trabajo para amortizar el desarrollo y mantener flujo de caja positivo sin financiamiento externo.
          </p>
        </div>

        <div className="p-6 bg-bg-principal rounded-[8px] card-border mb-8">
          <div className="relative" style={{ height: '420px' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Chart type="bar" data={chartData as any} options={options} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-[8px] card-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-principal border-b border-border">
                {['Mes', 'Hospitales', 'Ingresos', 'Costos', 'Flujo neto'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-data font-medium text-slate-500 uppercase text-xs tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const neto = row.ingresos - row.costos
                return (
                  <tr
                    key={row.label}
                    className={`border-b border-border last:border-b-0 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-bg-principal/40'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono font-normal text-slate-500 text-xs">
                      {row.label}
                    </td>
                    <td className="px-4 py-2.5 font-data font-normal text-slate-600 text-sm">
                      {row.hospitales}
                    </td>
                    <td className="px-4 py-2.5 font-data font-normal text-slate-700 text-sm">
                      ${row.ingresos.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-2.5 font-data font-normal text-slate-500 text-sm">
                      ${row.costos.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-2.5 font-data font-normal text-esmeralda text-sm">
                      ${neto.toLocaleString('es-MX')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
