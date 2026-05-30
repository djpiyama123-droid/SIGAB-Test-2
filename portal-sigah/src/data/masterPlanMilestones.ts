export type MilestoneStatus = 'completed' | 'active' | 'upcoming'

export interface Milestone {
  phase: number
  period: string
  title: string
  description: string
  status: MilestoneStatus
}

export const masterPlanMilestones: Milestone[] = [
  {
    phase: 0,
    period: 'May — Jun 2026',
    title: 'Constitución legal de SIGAH',
    description:
      'Constitución formal de la S. de R.L. de C.V., resolución fiscal ante el SAT y migración completa del repositorio bajo la identidad de marca SIGAH.',
    status: 'active',
  },
  {
    phase: 1,
    period: 'Jun 2026',
    title: 'Base de datos multi-inquilino',
    description:
      'Creación del esquema multi-tenant en MySQL con columna tenant_id en las 20 tablas de dominio. Backfill de 778 equipos y 244 órdenes de servicio del HGR No. 1 (tenant_id = 1).',
    status: 'upcoming',
  },
  {
    phase: 2,
    period: 'Jul 2026',
    title: 'Blindaje de endpoints FastAPI',
    description:
      'Modificación de todos los endpoints para filtrar consultas mediante tenant_id recuperado del token JWT, impidiendo fugas de información entre hospitales.',
    status: 'upcoming',
  },
  {
    phase: 3,
    period: 'Jul — Ago 2026',
    title: 'Panel SuperAdmin y gestión de licencias',
    description:
      'Desarrollo del panel de administración global para control de licencias hospitalarias, suspensión y activación de suscripciones mensuales.',
    status: 'upcoming',
  },
  {
    phase: 4,
    period: 'Ago 2026',
    title: 'Convenio académico IMSS — Universidad Xochicalco',
    description:
      'Firma del convenio formal entre el IMSS y la Universidad Xochicalco para el inicio del programa piloto oficial en la Clínica 1 de Tijuana.',
    status: 'upcoming',
  },
  {
    phase: 5,
    period: 'Q1 2027',
    title: 'Primer contrato comercial IMSS (LAASSP)',
    description:
      'Consolidación del primer contrato por adjudicación directa bajo el marco regulatorio de la Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público.',
    status: 'upcoming',
  },
  {
    phase: 6,
    period: 'Q4 2027',
    title: 'Expansión a 3 HGR adicionales',
    description:
      'Implementación en tres Hospitales Generales Regionales adicionales en los estados de Baja California y Sonora.',
    status: 'upcoming',
  },
  {
    phase: 7,
    period: '2028',
    title: 'Licitación pública nacional IMSS',
    description:
      'Participación y adjudicación de la primera licitación pública nacional del IMSS para despliegue centralizado del sistema de gestión de activos biomédicos a nivel país.',
    status: 'upcoming',
  },
]
