export interface ServicePlan {
  id: 'A' | 'B'
  name: string
  subtitle: string
  description: string
  price: string
  priceNote: string
  highlight: boolean
}

export interface PlanFeature {
  feature: string
  planA: boolean | string
  planB: boolean | string
}

export const servicePlans: ServicePlan[] = [
  {
    id: 'A',
    name: 'Plan A',
    subtitle: 'Modelo híbrido con servidor local',
    description:
      'Servidor físico local (Lenovo ThinkCentre M720q Tiny) como Edge Node. Operación autónoma sin acceso WAN, con sincronización asíncrona hacia el servidor central. Ideal para quirófanos y urgencias.',
    price: '$20,000 implementación + $4,000 / mes',
    priceNote: 'MXN · incluye servidor local, soporte SLA y actualizaciones',
    highlight: true,
  },
  {
    id: 'B',
    name: 'Plan B',
    subtitle: 'Inventariado físico único',
    description:
      'Solución diagnóstica para instituciones con gestión administrativa deficiente. Auditoría física completa, depuración de base de datos y estandarización de activos como línea base para escalar al Plan A.',
    price: 'Pago único',
    priceNote: 'MXN · cotización según número de activos a inventariar',
    highlight: false,
  },
]

export const planFeatures: PlanFeature[] = [
  { feature: 'Inventario de activos biomédicos',   planA: true,                  planB: true              },
  { feature: 'Identificación QR/código de barras', planA: 'Zebra grado clínico', planB: 'Etiquetas básicas'},
  { feature: 'Trazabilidad y custodia de activos', planA: true,                  planB: true              },
  { feature: 'Órdenes de trabajo preventivo',      planA: true,                  planB: false             },
  { feature: 'Servidor local en sitio',            planA: true,                  planB: false             },
  { feature: 'Operación sin conexión WAN',         planA: true,                  planB: false             },
  { feature: 'Motor de IA predictiva',             planA: 'OpenClaw + Gemini',   planB: false             },
  { feature: 'Bot de alertas Telegram/WhatsApp',   planA: true,                  planB: false             },
  { feature: 'Reportes regulatorios (COFEPRIS)',   planA: true,                  planB: false             },
  { feature: 'Actualizaciones del sistema',        planA: true,                  planB: false             },
  { feature: 'Soporte técnico',                    planA: 'SLA continuo',        planB: 'Post-entrega'    },
]
