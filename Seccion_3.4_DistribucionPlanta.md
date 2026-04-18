# 3.4 Distribución de Planta

## 3.4.1 Importancia de la Distribución de Planta

La distribución de planta es un elemento crítico en la operación eficiente de cualquier instalación de manufactura o integración de tecnología. Una distribución adecuada optimiza el flujo de materiales, reduce tiempos de espera, minimiza movimientos innecesarios y mejora la coordinación entre áreas funcionales. En el contexto de SIGAB, donde se integran sistemas computacionales complejos con componentes de hardware médico de alta precisión, una distribución estratégica del taller es fundamental para asegurar la calidad del producto, cumplir con estándares de validación regulatoria (IQ/OQ/PQ) y garantizar tiempos de entrega competitivos.

## 3.4.2 Ubicación del Taller de Integración

El taller central de integración de SIGAB se ubica en **Tijuana, Baja California**, posición estratégica que ofrece múltiples ventajas:

- **Proximidad al mercado meta**: Acceso directo a hospitales IMSS de Baja California y Sonora, principales mercados objetivo de la solución.
- **Infraestructura logística**: Cercano a puertos y corredores internacionales, facilitando importación de componentes y distribución hacia el norte del territorio nacional.
- **Capital humano**: Disponibilidad de profesionales especializados en tecnología, ingeniería y manufactura en la región fronteriza.
- **Sostenibilidad operativa**: Reducción de costos de transporte hacia los sitios de implementación y menor huella de carbono en la cadena de suministro.

## 3.4.3 Descripción de Áreas Funcionales

El taller se organiza en cuatro áreas funcionales interconectadas que conforman el flujo completo de integración:

### Área 1: Recepción y Almacén

Responsable de la recepción, verificación y almacenamiento de todos los componentes que conforman los kits hospitalarios de SIGAB.

**Funciones principales:**
- Recepción de servidores Lenovo ThinkCentre M720q con especificaciones validadas
- Control de entrada de impresoras térmicas Zebra ZD411, escáneres QR, monitores LED de 24", UPS de 1.5 kVA y switches Cat6
- Verificación de documentación de proveedores y conformidad de componentes
- Almacenamiento organizado de refacciones, cables, documentación y accesorios
- Expedición de kits completos hacia la siguiente estación de trabajo

**Métrica de rendimiento**: Procesamiento de 4-5 kits por semana en esta fase (duración: <4 horas por kit).

### Área 2: Mesa de Configuración

Centro de instalación y hardening de software, donde se configura la pila tecnológica completa de SIGAB en cada servidor.

**Funciones principales:**
- Instalación de Ubuntu Server 24.04 o WSL2 según especificación del cliente
- Hardening de seguridad: configuración de firewalls, cifrado de disco, autenticación de dos factores
- Instalación y configuración de Docker para orquestación de contenedores
- Despliegue de microservicios: backend FastAPI, frontend React, base de datos MySQL
- Validación de conectividad de red y preparación de puertos
- Documentación de configuración específica de cada instalación

**Métrica de rendimiento**: 4 horas de configuración por servidor (tiempo crítico en el flujo).

### Área 3: QA/Pruebas

Laboratorio especializado donde se valida la funcionalidad completa del sistema integrado antes del envío al hospital.

**Funciones principales:**
- Simulación del flujo operativo completo: ingreso de activos, escaneo QR, consultas en la plataforma
- Pruebas de impresión de códigos QR con la impresora Zebra, incluida validación de resolución y legibilidad
- Validación de protocolos Poka-Yoke (a prueba de errores) para prevención de duplicados y anomalías
- Ejecución de protocolo IQ (Installation Qualification): verificación de instalación correcta
- Ejecución de protocolo OQ (Operational Qualification): validación de funcionalidad operativa
- Ejecución de protocolo PQ (Performance Qualification): pruebas bajo carga y casos de uso reales
- Generación de reporte de validación para archivo regulatorio del hospital

**Métrica de rendimiento**: 16 horas de pruebas exhaustivas por kit (incluye documentación de resultados).

### Área 4: Oficinas Administrativas

Centro de coordinación, gestión de relaciones comerciales y documentación de proyectos.

**Funciones principales:**
- Coordinación con hospitales IMSS para alineación de cronogramas e instalación in situ
- Gestión de especificaciones personalizadas según necesidades hospitalarias
- Mantenimiento de base de datos de clientes y seguimiento post-implementación
- Capacitación remota a personal hospitalario vía sesiones online
- Gestión de garantía, mantenimiento preventivo y soporte técnico
- Archivo de documentación regulatoria y reportes de validación

## 3.4.4 Flujo de Trabajo y Secuencias Operativas

El taller sigue un flujo secuencial optimizado que garantiza la calidad y trazabilidad de cada kit:

```
RECEPCIÓN
    ↓
(Verificación de componentes y documentos)
    ↓
CONFIGURACIÓN (Mesa de Configuración)
    ↓
(Instalación SO, hardening, despliegue de microservicios: 4 hrs)
    ↓
DESPLIEGUE SIGAB
    ↓
(Validación de servicios, conectividad, integraciones: 6 hrs)
    ↓
QA/PRUEBAS
    ↓
(IQ/OQ/PQ, pruebas Poka-Yoke, validación impresora: 16 hrs)
    ↓
COORDINACIÓN INSTALACIÓN
    ↓
(Contacto con hospital, programación, documentación: 24 hrs administrativos)
    ↓
DESPACHO PARA INSTALACIÓN IN SITU
    ↓
(Fin del proceso de integración en taller)
```

**Tiempo total de integración en taller**: Menos de 72 horas desde la recepción inicial hasta la validación final del kit.

El flujo asegura que:
- No hay cuellos de botella: cada área comienza su trabajo apenas la anterior termina
- La trazabilidad es completa: cada kit tiene un identificador y sigue un expediente
- La calidad se valida en múltiples puntos: entrada de componentes, durante integración y en QA
- La documentación regulatoria se genera de forma integrada al proceso

## 3.4.5 Capacidad Instalada

Con la distribución actual del taller y considerando el flujo de 72 horas por kit:

- **Procesamiento mensual**: 20 kits completamente integrados y validados
- **Flujo máximo diario**: Hasta 3 kits en proceso simultáneo (en diferentes fases del flujo)
- **Personal requerido**: 
  - 2 técnicos en Recepción y Almacén
  - 2 especialistas en Mesa de Configuración
  - 2 ingenieros de QA/Pruebas
  - 1 coordinador administrativo
- **Inversión en equipamiento**: Servidores de prueba, instrumentos de medición (lector QR de referencia), equipos de red, estaciones de trabajo con monitores duales

Esta capacidad permite escalabilidad gradual: conforme la demanda hospitalaria crece, es posible abrir un segundo turno o replicar el modelo del taller en otra ubicación geográfica (p. ej., Guadalajara, CDMX) sin alterar la estructura operativa actual.

## 3.4.6 Documentación del Layout

La distribución física del taller se detalla en el plano técnico incluido como **Anexo 3.4.1**, que muestra:
- Ubicación exacta de cada área funcional
- Rutas de flujo de materiales entre estaciones
- Puntos de almacenamiento y acceso a servicios (energía, red, aire acondicionado)
- Espacios de capacitación y coordinación
- Cumplimiento de normas de seguridad industrial e higiene

El layout optimiza la movilidad del personal, minimiza cruzamientos de flujos y facilita la supervisión del progreso de integración desde una perspectiva centralizada.
