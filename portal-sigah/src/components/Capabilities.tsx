import {
  IconDatabase, IconRoute, IconClipboardList, IconCalendarStats,
  IconChartBar, IconShieldLock, IconRobot, IconDeviceMobile,
  IconCloudComputing, IconQrcode, IconReportAnalytics, IconWifiOff,
} from '@tabler/icons-react'

const CAPABILITIES = [
  { icon: <IconDatabase size={20} />,        title: 'Inventario digital centralizado', body: 'Registro único de cada equipo: marca, modelo, número de serie, ubicación, fotografías y documentos. Una sola fuente de verdad accesible 24/7.' },
  { icon: <IconQrcode size={20} />,          title: 'Identificación física por activo', body: 'Cada equipo y cable se etiqueta con QR / código de barras grado clínico, ligado a su expediente digital con un escaneo.' },
  { icon: <IconRoute size={20} />,           title: 'Trazabilidad y custodia',          body: 'Historial completo del activo: movimientos, mantenimientos, reparaciones y responsables. Auditable de extremo a extremo.' },
  { icon: <IconClipboardList size={20} />,   title: 'Órdenes de servicio',              body: 'Levantamiento y seguimiento de órdenes correctivas con estado, técnico asignado y fechas. Cero papel.' },
  { icon: <IconCalendarStats size={20} />,   title: 'Mantenimiento preventivo',         body: 'Calendario de preventivos con alertas automáticas para extender la vida útil del equipo y reducir fallas inesperadas.' },
  { icon: <IconChartBar size={20} />,        title: 'Tablero de indicadores (KPIs)',    body: 'Visualización ejecutiva para la Dirección: equipos operativos, en mantenimiento, críticos y valor del parque tecnológico.' },
  { icon: <IconReportAnalytics size={20} />, title: 'Reportes regulatorios',            body: 'Generación de reportes y evidencia para cumplimiento NOM-016 / NOM-240 e ISO-13485, con exportación a PDF/Excel.' },
  { icon: <IconRobot size={20} />,           title: 'Copiloto e IA predictiva',         body: 'Asistente con IA local (sin costo de tokens externos) para consultas, alertas tempranas y apoyo a la toma de decisiones.' },
  { icon: <IconShieldLock size={20} />,      title: 'Seguridad y control de acceso',    body: 'Acceso por roles, datos cifrados y resguardo conforme a la LFPDPPP. Cada usuario ve únicamente lo que le corresponde.' },
]

const HOW = [
  { icon: <IconCloudComputing size={18} />, title: 'Nube + Edge', body: 'Plataforma en la nube con opción de servidor local (Edge) en quirófano y urgencias.' },
  { icon: <IconWifiOff size={18} />,        title: 'Opera sin internet', body: 'El Plan A sigue funcionando aunque caiga la red, con sincronización asíncrona.' },
  { icon: <IconDeviceMobile size={18} />,   title: 'Cualquier dispositivo', body: 'Desde computadora, tableta o celular del personal técnico y clínico.' },
  { icon: <IconRobot size={18} />,          title: 'IA local', body: 'Modelos de IA on-premise: privacidad total y sin costo por consulta.' },
]

export default function Capabilities() {
  return (
    <section id="capacidades" className="py-20 px-6 bg-bg-principal">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
            QUÉ HACE
          </p>
          <h2 className="font-sans font-medium text-3xl text-slate-900">
            Una plataforma para todo el ciclo de vida del equipo médico
          </h2>
          <p className="font-data font-normal text-lg text-slate-600 mt-4 max-w-3xl leading-relaxed">
            SIGAH digitaliza y automatiza la gestión del parque tecnológico hospitalario, desde la adquisición
            del equipo hasta su baja, sustituyendo hojas de cálculo y registros en papel.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {CAPABILITIES.map(c => (
            <div key={c.title} className="bg-white rounded-xl card-border p-6 transition-all duration-200 hover:-translate-y-0.5">
              <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-alt text-sigah-blue mb-4">
                {c.icon}
              </span>
              <h3 className="font-sans font-medium text-base text-slate-900 mb-2">{c.title}</h3>
              <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-6">
            CÓMO LO HACE — TECNOLOGÍA INDUSTRIA 4.0
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW.map(h => (
              <div key={h.title} className="bg-white rounded-xl card-border p-5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sigah-blue-dark text-white mb-3">
                  {h.icon}
                </span>
                <h3 className="font-sans font-medium text-sm text-slate-800 mb-1">{h.title}</h3>
                <p className="font-data font-normal text-sm text-slate-500 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
