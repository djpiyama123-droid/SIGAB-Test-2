# 3.5 Organigrama

## Introducción

El organigrama de un proyecto de ingeniería biomédica representa la estructura de responsabilidades, líneas de comunicación y distribución de competencias técnicas necesarias para la viabilidad operacional y escalabilidad del sistema. En el caso de SIGAB (Sistema de Gestión de Activos Biomédicos), la evolución organizacional refleja la transición desde una fase piloto en ambiente hospitalario hasta una estructura comercial capaz de atender múltiples instituciones de salud en el sector público. Esta sección documenta tanto la configuración actual del equipo como la proyectada, justificando la composición de roles, responsabilidades específicas y los cálculos de costo asociados.

## Organigrama Fase Piloto

La estructura organizacional de la fase piloto se caracteriza por su modelo compacto y multi-funcional, diseñado para validar la viabilidad técnica, operacional y de aceptación del usuario en el Hospital General Regional (HGR) No. 1 del IMSS, Tijuana.

### Composición del equipo de proyecto

**Dirección Técnica:**
- **Gustavo Piyama** — Director General y CTO (Chief Technology Officer)
  - Responsabilidades: Desarrollo de la plataforma, definición de la arquitectura técnica, toma de decisiones estratégicas, coordinación general del proyecto
  - Competencias: Ingeniería de software, gestión de proyectos, arquitectura de sistemas

**Operaciones y Documentación:**
- **Fernando** — Coordinador de Operaciones
  - Responsabilidades: Logística de instalación, generación de documentación técnica, enlace operativo entre el equipo técnico y los stakeholders hospitalarios
  - Competencias: Gestión de operaciones, documentación técnica, coordinación operativa

**Capacitación y Enlace Institucional:**
- **Salvador** — Responsable de Capacitación y Enlace IMSS
  - Responsabilidades: Capacitación de usuarios finales, gestión de la relación con personal hospitalario, ejecución de pruebas de campo, recopilación de retroalimentación
  - Competencias: Capacitación técnica, gestión de cambio organizacional, relaciones institucionales

**Asesoría Académica:**
- **Esteban Ham** — Asesor Académico (Universidad Xochicalco)
  - Responsabilidades: Orientación metodológica, aseguramiento de rigor académico, validación de propuestas técnicas
  - Competencias: Investigación, metodología de evaluación técnica, asesoría académica

### Stakeholders IMSS y usuarios finales

**Personal de Ingeniería Biomédica:**
- **Carlos Oswaldo** — Jefe de Ingeniería Biomédica, HGR No. 1
  - Rol: Validación técnica, alineación con estándares biomédicos institucionales

- **Félix** — Jefe de Conservación
  - Rol: Validación de procesos de mantenimiento preventivo y correctivo

**Usuario Final Directo:**
- **Jonathan** — Técnico Biomédico
  - Rol: Interacción directa con la plataforma, retroalimentación operativa sobre usabilidad y funcionalidad

Esta estructura de 3 personas en el equipo técnico/operativo permite validar todas las dimensiones críticas del producto (técnica, operacional, institucional y académica) manteniendo la agilidad necesaria para adaptaciones rápidas basadas en la retroalimentación de campo.

## Organigrama Fase Comercial

La transición hacia una estructura comercial implica la escalabilidad del equipo para atender múltiples instituciones hospitalarias simultáneamente, manteniendo estándares de calidad en servicio e instalación. A continuación se detalla la estructura organizacional proyectada y su justificación económica.

### Estructura organizacional escalada

```
SIGAB - Estructura Comercial
├── CEO / Director General (Gustavo Piyama - Fundador)
│
├── CTO / Ingeniería ($18,000/mes)
│   └── Responsabilidades: Desarrollo de funcionalidades, mantenimiento de plataforma,
│       actualizaciones de seguridad, optimización arquitectónica
│
├── Coordinador de Operaciones ($15,000/mes)
│   ├── Instalador 1 ($13,220/mes)
│   │   └── Configuración e instalación en sitio, pruebas iniciales
│   │
│   └── Instalador 2 ($13,220/mes)
│       └── Configuración e instalación en sitio, escalabilidad de despliegues
│
├── HelpDesk / Soporte Técnico
│   └── Responsabilidades: Soporte remoto a hospitales, resolución de incidentes,
│       gestión de tickets de soporte
│
└── Ventas B2G ($15,000/mes)
    └── Responsabilidades: Relación con gobierno, participación en licitaciones
        LAASSP, negociación de contratos, desarrollo de propuestas comerciales
```

### Justificación de roles y costos mensuales

**CTO / Ingeniería: $18,000 MXN/mes**
- Justificación: Mantener y escalar una plataforma de ingeniería médica con estándares ISO, requisitos de seguridad crítica y actualizaciones continuas requiere un profesional senior con experiencia en arquitectura de sistemas y cumplimiento regulatorio.

**Coordinador de Operaciones: $15,000 MXN/mes**
- Justificación: Supervisión de despliegues en múltiples sitios, logística de instalación, coordinación con hospitales y gestión de cronogramas.

**Instalador 1 y 2: $13,220 MXN/mes c/u**
- Justificación: Cada instalador permite ejecutar despliegues simultáneos en diferentes instituciones, asegurando cronogramas ajustados a los requerimientos hospitalarios. El costo es competitivo con los salarios del sector biomédico en México.

**HelpDesk / Soporte Técnico**
- Estructura: Iniciada con soporte remoto centralizado; escalable a dedicación tiempo completo según volumen de instituciones atendidas.
- Justificación: Garantizar disponibilidad 24/5 es crítico para minimizar impacto operativo en instituciones que dependen de SIGAB para gestión de activos biomédicos.

**Ventas B2G: $15,000 MXN/mes**
- Justificación: El modelo de negocio con sector público (LAASSP - Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público) requiere especialización en procesos licitatorios, cumplimiento regulatorio y relaciones gubernamentales.

### Costo total de nómina

**Presupuesto mensual de recursos humanos: $74,440 MXN**
- Desglose: CTO ($18,000) + Operaciones ($15,000) + Instalador 1 ($13,220) + Instalador 2 ($13,220) + Ventas B2G ($15,000) = $74,440 MXN/mes
- Nota: El CEO/Fundador se considera como aportación de capital humano en etapa de validación comercial.

## Evolución Organizacional: De Piloto a Comercial

La transición de la estructura piloto a la comercial se ejecuta en fases:

### Fase 1: Validación (Actual - Meses 1-6)
- Equipo: 3 personas técnicas + asesor académico
- Objetivo: Validar viabilidad técnica y aceptación del usuario
- Métrica de éxito: Sistema operativo en HGR No. 1 con retroalimentación positiva

### Fase 2: Escalabilidad (Meses 6-12)
- Adiciones: Segundo instalador, especialista en ventas
- Objetivo: Preparar capacidad de despliegues múltiples
- Métrica de éxito: Capacidad demostrada de instalación en 2-3 instituciones adicionales

### Fase 3: Comercial (Meses 12+)
- Estructura completa según sección anterior
- Objetivo: Crecimiento sostenible con múltiples clientes institucionales
- Métrica de éxito: Operación en 5+ instituciones, margen operativo positivo

## Referencias a Organigramas Visuales

Los organigramas detallados con líneas de comunicación, responsabilidades específicas y relaciones internas se encuentran en el archivo adjunto: **SIGAB_Organigramas.html**, que incluye representaciones interactivas de:
- Estructura de fase piloto con stakeholders IMSS
- Estructura comercial escalada con líneas de reporte
- Matriz de responsabilidades (RACI) para decisiones técnicas y operacionales

---

**Conclusión**

La estructura organizacional de SIGAB está diseñada para mantener flexibilidad y agilidad en la fase piloto mientras se construye la capacidad operativa necesaria para un modelo comercial sostenible. La transición está calibrada a los hitos de validación del producto y a la capacidad del mercado institucional, asegurando que cada adición de recursos está justificada por demanda y viabilidad financiera.
