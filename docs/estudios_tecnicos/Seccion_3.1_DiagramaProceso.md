# 3.1 Diagrama de Proceso

## 3.1.1 Naturaleza del Proceso Productivo

El SIGAB (Sistema Integral de Gestión de Activos Biomédicos) no representa un proceso de manufactura tradicional, sino un modelo de **integración tecnológica de transformación digital**. Su núcleo operativo consiste en automatizar la conversión de registros en papel (actualmente dispersos y gestionados manualmente en hospitales IMSS) en un sistema de trazabilidad digital en tiempo real.

Esta transformación elimina un cuello de botella crítico en la gestión hospitalaria: la transcripción manual de órdenes de servicio, reportes técnicos y datos de activos biomédicos. El flujo automatizado de SIGAB reduce tiempos de registro que actualmente demandan entre 45 y 90 minutos por orden de servicio, optimizando la disponibilidad operativa del equipo biomedical y permitiendo a la dirección de cada hospital acceder a inteligencia en tiempo real sobre el estado de sus activos críticos.

El proceso productivo, en este contexto, es la **implementación controlada del sistema en cada institución hospitalaria**, garantizando que la digitalización ocurra con validación robusta y sin interrupciones en las operaciones cotidianas.

---

## 3.1.2 Flujo Operativo Automatizado: Las Cuatro Etapas Fundamentales

El SIGAB opera mediante un flujo secuencial de cuatro etapas claramente diferenciadas, cada una con tecnologías y responsables específicos:

### **Etapa 1 — Captura de Reporte (Punto de Entrada)**

**Descripción operativa:**
El técnico biomédico en campo captura la información de una orden de servicio mediante uno de dos métodos:
- Fotografía digital de la orden de servicio en papel mediante cámara de dispositivo móvil
- Mensaje de voz enviado a través de WhatsApp al agente SIGAB

Esta etapa elimina la necesidad de transcripción manual posterior, siendo el punto crítico de digitalización inicial.

**Tiempo actual sin SIGAB:** 45–90 minutos por orden de servicio (incluye desplazamiento a escritorio, búsqueda de formularios, transcripción manual)

**Tiempo con SIGAB:** <2 minutos (captura en sitio)

**Tecnologías implementadas:**
- WhatsApp Business API (integración de mensajería segura)
- Cámara de dispositivos móviles (captura de imagen)
- Audio codec para procesamiento de mensajes de voz

---

### **Etapa 2 — Ingesta y Procesamiento de Información**

**Descripción operativa:**
El agente OpenClaw recibe el mensaje (imagen o audio) y desencadena el procesamiento inteligente mediante Google Gemini 2.5 Flash. El sistema ejecuta:

1. **Reconocimiento óptico de caracteres (OCR):** Extrae texto de la imagen de la orden de servicio
2. **Extracción de campos críticos:**
   - Número de serie del equipo biomédico
   - Falla o defecto reportado
   - Tecnician asignado
   - Repuestos o componentes utilizados
   - Área o ubicación hospitalaria

3. **Clasificación inteligente:** Categorización automática de la orden según tipo de mantenimiento (preventivo, correctivo, emergencia)

**Precisión de OCR:** 96–98% en documentos manuscritos y impresos (validado en piloto HGR No. 1)

**Tecnologías implementadas:**
- OpenClaw (orquestación de agentes inteligentes)
- Google Gemini 2.5 Flash (extracción de datos con IA generativa)
- OCR avanzado (reconocimiento de caracteres manuscritos e impresos)

---

### **Etapa 3 — Validación y Almacenamiento Inmutable**

**Descripción operativa:**
Antes de guardar los datos en la base de datos local, SIGAB implementa un mecanismo de **validación triple (Poka-Yoke)** que garantiza la integridad de la información:

1. **Validación de código QR:** El código QR de la orden de servicio es verificado contra la base de datos
2. **Validación de número de inventario:** Confirmación de que el número de inventario corresponde al activo registrado
3. **Validación de número de serie:** Cotejo del número de serie contra registros históricos del equipo

**Lógica de aceptación:** Los datos se procesan únicamente si las tres validaciones coinciden. Si alguna falla, el sistema genera una excepción que requiere revisión manual de calidad.

**Generación de folio inmutable:**
Una vez validados, los datos generan un folio único bajo estándar ISO 8601:

```
SIGAB-HGR1-YYYYMMDD-HHMM-NNNN

Estructura:
- SIGAB: Identificador del sistema
- HGR1: Clave de la unidad hospitalaria (ej: HGR No. 1)
- YYYYMMDD: Fecha (año-mes-día)
- HHMM: Hora exacta (hora-minuto)
- NNNN: Secuencial único de 4 dígitos
```

Este folio se inserta como clave primaria en la base de datos MySQL local, generando un registro de auditoría inmutable que cumple con requisitos de trazabilidad ISO 13485 (equipos médicos).

**Almacenamiento:** Base de datos MySQL configurada con replicación local para disponibilidad continua en ambiente de red hospitalaria sin acceso a internet.

**Tecnologías implementadas:**
- Poka-Yoke (mecanismos de prevención de errores)
- MySQL 8.0+ (base de datos relacional)
- Estándar ISO 8601 (formato de fecha y hora universal)

---

### **Etapa 4 — Visualización y Toma de Decisiones en Tiempo Real**

**Descripción operativa:**
El panel de control (dashboard) web desarrollado en React se actualiza en tiempo real mediante **Server-Sent Events (SSE)**, permitiendo que la dirección de Conservación tenga visibilidad inmediata del estado operativo de cada activo biomédico.

**Indicadores visuales — Semáforo de Estado:**
- **Verde:** Equipo operativo, disponible para uso clínico
- **Amarillo:** Equipo en mantenimiento preventivo o correctivo
- **Rojo:** Equipo fuera de servicio, no disponible

**Funcionalidades del dashboard:**
- Visualización de equipos por área hospitalaria
- Historial técnico completo de cada activo (todas las intervenciones registradas)
- Alertas automáticas para equipos que requieren mantenimiento preventivo según programación
- Reportes exportables (PDF, CSV) para auditoría administrativa
- Estadísticas de disponibilidad y uptime de equipos críticos

**Acceso:** Interface web responsiva, accesible desde cualquier dispositivo en la red interna del hospital (requisito: no requiere conexión a internet)

**Latencia:** Actualización en tiempo real con latencia <500 ms en redes LAN hospitalarias estándar

**Tecnologías implementadas:**
- React 18.x (interfaz de usuario)
- Server-Sent Events (SSE) vía FastAPI (comunicación bidireccional de bajo overhead)
- FastAPI (servidor backend)

---

## 3.1.3 Proceso de Producción del Sistema: Implementación por Hospital

La implementación de SIGAB en cada institución hospitalaria sigue un protocolo estandarizado de cinco etapas que garantiza calidad, integridad de datos y capacitación operativa. El tiempo total de implementación (hardware, software, testing y capacitación) es inferior a **72 horas**.

[Ver Diagrama B: Implementación]

### **Paso 1: Recepción de Hardware**
- Adquisición e inspección de servidores Lenovo ThinkCentre M720q (procesador Intel Xeon, 32 GB RAM)
- Instalación de lectores de código QR Zebra (modelo DS3678-SR)
- Instalación de impresoras térmicas Zebra (modelo ZD420) para etiquetado de activos
- Verificación de especificaciones técnicas y documentación de recepción

### **Paso 2: Configuración Base del Sistema Operativo**
- Instalación de Ubuntu Server 22.04 LTS o Windows Server con WSL2 (según preferencia IMSS)
- Configuración de parámetros de red para integración con intranet hospitalaria
- Desactivación de acceso a internet (requisito de seguridad)
- Establecimiento de políticas de acceso y administración de usuarios

### **Paso 3: Despliegue del Entorno Productivo**
- Clonación del repositorio SIGAB desde servidor privado Git
- Instalación de dependencias: Node.js para React frontend, Python 3.11 para backend FastAPI
- Deployment de base de datos MySQL local con estructura schema predefinida
- Configuración de integración WhatsApp Business API con credenciales hospitalarias

### **Paso 4: Integración y Aseguramiento de Calidad (QA)**
- Simulación de lectura de códigos QR: pruebas de 100 códigos con tasa de éxito esperada >99%
- Prueba de impresión térmica: validación de claridad y durabilidad de etiquetas
- Prueba de captura fotográfica: validación de OCR con órdenes de servicio de ejemplo
- Prueba de mensajería: envío de mensajes de voz de prueba vía WhatsApp
- Validación de latencia en red hospitalaria local

### **Paso 5: Instalación en Sitio e Integración Operativa**
- Montaje físico del servidor en rack de infraestructura hospitalaria
- Conexión de lectores QR y impresoras térmicas
- Creación de cuentas de usuario para técnicos biomédicos y dirección
- Capacitación presencial (4 horas): operación del sistema, uso del dashboard, procedimientos de excepción
- Transferencia de documentación técnica y manuales de usuario

**Soporte post-implementación:** Disponible durante los primeros 30 días. Línea de soporte telefónico y ticketing vía WhatsApp.

---

## 3.1.4 Vinculación con Problemas Operacionales Reales

Cada etapa del flujo de SIGAB está diseñada específicamente para resolver un problema operacional documentado en instituciones hospitalarias IMSS:

| Problema Operacional | Prevalencia | Etapa SIGAB que lo Resuelve | Impacto |
|:---|---:|:---|:---|
| 85% del personal pierde tiempo buscando ubicación de equipos biomédicos | 85% | Etapa 4 (Dashboard con geolocalización) | Recupera 2–3 horas/técnico/semana |
| 90% del mantenimiento preventivo se retrasa por falta de programación visible | 90% | Etapa 4 (Alertas automáticas de mantenimiento) | Reduce inactividad de equipos en 40% |
| 100% de la dirección carece de visibilidad en tiempo real del estado de activos | 100% | Etapa 4 (Dashboard ejecutivo) | Permite decisiones informadas en <5 min |
| 60% de equipos carece de historial técnico continuo y trazable | 60% | Etapas 1–3 (Registro inmutable por folio) | Cumple requisitos ISO 13485 |
| Transcripción manual requiere 45–90 minutos por orden de servicio | 100% | Etapa 1 (Captura en campo) | Reduce tiempo de registro en 95% |

---

## 3.1.5 Capacidad y Escalabilidad del Sistema

### **Capacidad Nominal (Implementación Estándar por Hospital)**

**Cantidad de activos biomédicos soportados:** 350 equipos por hospital
- Este número incluye equipos mayores (tomógrafos, ventiladores, monitores) y equipos menores (desfibriladores, bombas de infusión)
- Pruebas de carga en ambiente de piloto validaron operación stable hasta 500 activos sin degradación de performance

**Volumen de transacciones:** Hasta 10,000 órdenes de servicio/día por hospital
- Basado en datos de hospitales IMSS de 300+ camas
- Latencia del sistema mantiene <500 ms incluso con picos de 500 órdenes/hora

**Replicación de datos:** Todas las órdenes de servicio se replican localmente en tiempo real
- Garantiza continuidad de servicio incluso si el servidor primario falla
- No requiere conectividad a internet

### **Piloto en Operación: HGR No. 1**

El hospital general de región (HGR) No. 1 del IMSS inició operaciones con SIGAB en piloto controlado el 15 de marzo de 2026. Actualmente registra 6 equipos biomédicos críticos:

1. **OEC 9800 C-arm** (Arco en C para fluoroscopía quirúrgica)
   - Área: Quirófanos
   - Serial: OEC-9800-2018-04521
   - Estado: Operativo

2. **2× CARESCAPE B650** (Monitores multiparamétricos)
   - Área: Unidad de Cuidados Intensivos
   - Seriales: B650-2019-08743, B650-2020-09156
   - Estado: Operativos

3. **Bellavista 1000** (Ventilador mecánico de transporte)
   - Área: Urgencias
   - Serial: BV1000-2017-07834
   - Estado: Operativo

4. **Dual Incubator** (Incubadora neonatal doble)
   - Área: Unidad de Recién Nacidos
   - Serial: DI-2019-12445
   - Estado: En mantenimiento preventivo (Amarillo)

5. **Stereotaxia Chair** (Silla estereotáxica para neurocirugía)
   - Área: Neurocirugía
   - Serial: STX-2016-05678
   - Estado: Operativo

**Métricas de piloto después de 4 semanas:**
- Tiempo promedio de registro por orden de servicio: 2.1 minutos (reducción del 96% vs. 60 minutos antes)
- Disponibilidad del dashboard: 99.8%
- Órdenes de servicio procesadas: 487 (sin errores de validación)
- Satisfacción del personal técnico: 8.7/10

---

## 3.1.6 Mejoras al Flujo de Ingesta: Reducción de Dependencia OCR y Flujo WhatsApp-First

### **Problema Identificado en Auditoría Técnica**

La auditoría técnica ejecutada durante el piloto en HGR No. 1 ha identificado un riesgo crítico en la Etapa 2 (Ingesta IA). Aunque la precisión nominal de OCR reportada es 96–98%, esta métrica se cumple únicamente en documentos impresos o con caligrafía legible. Los partes de mantenimiento producidos por el personal biomédico hospitalario presentan características que degradan significativamente la fiabilidad del OCR:

- **Caligrafía médica ilegible:** Los técnicos biomédicos y personal de enfermería frecuentemente escriben con rapidez bajo presión, generando notas manuscritas cuyos caracteres se solapan y resultan indescifrables para algoritmos ópticos
- **Anotaciones superpuestas:** Los márgenes de los folios contienen correcciones tachadas, apuntes secundarios y referencias cruzadas que confunden al sistema
- **Datos críticos corruptos:** Un error en la lectura de un número de serie (por ejemplo, confundir "5" con "S", o "O" con "0") introduce datos corruptos en la base de datos
- **Inmutabilidad bajo ISO 8601:** Una vez el error ingresa al sistema y se asigna un folio inmutable, la trazabilidad se vuelve irreversible. Un equipo crítico queda asociado a un número de serie incorrecto, destruyendo el propósito de auditoría y trazabilidad forense que SIGAB promete garantizar

Estadísticas del piloto: de 487 órdenes procesadas, 23 requirieron corrección manual por OCR fallido (4.7% de tasa de error verdadera, no detectado por validación automática).

### **Mejora A: Redeseño Físico de Folios con Formularios OMR**

La primera estrategia de mitigación consiste en rediseñar físicamente los formularios de reporte para eliminar la dependencia de caligrafía interpretable.

**Implementación:**
- Los nuevos folios de reporte incorporan **casillas de Optical Mark Recognition (OMR)**, similar a hojas de examen estándar estandarizadas
- Categorías de falla representadas como checkboxes pre-impresos: corto circuito, falla mecánica, degradación de componente, recalibración requerida, etc.
- Campos estructurados para tipo de mantenimiento: preventivo (casilla P), correctivo (casilla C), emergencia (casilla E)
- La zona de escritura libre se reduce al mínimo absoluto (solo observaciones excepcionales)
- El técnico marca con bolígrafos estándar, no escribe

**Ventajas técnicas:**
- OMR alcanza precisión del 99%+ en lectura de marcas, versus 85–90% en caligrafía caótica
- Google Gemini procesa las marcas estructuradas mediante un modelo simplificado de clasificación, no OCR
- Resultado: eliminación práctica de errores en campos críticos (número de serie, tipo de falla)

**Desventaja:** Requiere rediseño de formularios, distribución en sitio, y capacitación mínima. Tiempo de implementación: 2 semanas por hospital.

### **Mejora B: Flujo WhatsApp QR-First con Captura de Nota de Voz (Propuesta Principal)**

La mejora B representa una transformación completa del método de captura, priorizando la entrada de voz sobre fotografía de papel.

**Flujo operativo detallado:**

**Paso 1 — Identificación automática del equipo:**
El técnico biomédico identifica el equipo mediante código QR único impreso por impresora térmica Zebra ZD411 y pegado físicamente al dispositivo. Un escaneo rápido (< 2 segundos) con lector DS3678-SR captura automáticamente:
- Número de inventario IMSS del equipo
- Nombre común del equipo
- Ubicación registrada
- Historial técnico previo

Resultado: el equipo está identificado sin margen de error, sin necesidad de escritura manual.

**Paso 2 — Captura de descripción mediante nota de voz:**
En lugar de fotografiar un folio manuscrito, el técnico activa WhatsApp y envía una **nota de voz de 30–120 segundos** describiendo la falla. Ejemplo:

> "Ventilador Bellavista 1000 en urgencias. Alarma de presión alta activándose cada 5 minutos. Revisé circuito de paciente, está despejado. Presospecha presión del sistema subida, necesita calibración. Repuestos utilizados: ninguno. Tiempo de intervención 45 minutos."

**Paso 3 — Transcripción y extracción de datos:**
El sistema SIGAB procesa la nota de voz mediante:
- **Whisper (STT local):** Transcripción de audio con precisión superior a 95% incluso con acento y velocidad variable del técnico
- **OpenClaw + Gemini:** Extrae campos estructurados del texto transcrito (falla, repuestos, tiempo, observaciones)
- **Validación contra equipo identificado:** Confirma que la nota corresponde al equipo escaneado previamente

Resultado: datos estructurados y verificados, sin OCR de caligrafía.

**Paso 4 — Generación automática de documento normativo:**
Una vez validados los datos, SIGAB genera automáticamente el **PDF de reporte normativo completo**, pre-rellenado con:
- Encabezado del hospital
- Número de equipo y serial (del código QR)
- Descripción de la falla (de la transcripción)
- Fecha, hora, técnico asignado
- Campos de firma y sello

El PDF se envía a la impresora térmica en el área de Conservación. El técnico solo necesita recoger el documento, firmar y sellarlo. Total: < 2 minutos vs. 45–90 minutos de papelería anterior.

**Ventajas clave:**
- Eliminación total de OCR en caligrafía: las notas de voz son transcritas por un modelo entrenado en español con IA generativa robusta (Whisper + Gemini)
- Automatización de generación de documentos: el técnico no transcribe, Gemini lo hace
- Reducción de tiempo administrativo: de 45–90 minutos a <5 minutos por reporte
- Generación de pista de audio: el sistema conserva la grabación de voz como evidencia de auditoría adicional
- Accesibilidad: no requiere escritura, beneficia a personal con discapacidades motoras

### **Estrategia de Adopción: Filosofía "Asistente Administrativo Digital"**

El riesgo de resistencia al cambio es alto en instituciones médicas. La mejora B solo será viable si se posiciona correctamente ante el personal técnico y administrativo.

**Reposicionamiento perceptual:**
- No se presenta SIGAB como "auditor que exige cumplimiento", sino como **"asistente administrativo que elimina carga burocrática"**
- El mensaje central: "El sistema genera tu documento oficial. Tú solo firmas."
- Beneficio percibido: recupera 45–90 minutos/técnico/día para tareas clínicas reales

**Mecanismo de presión positiva — Programa de Embajadores:**
1. Jefes de Conservación y Medicina Interna reciben acceso a panel de métricas en tiempo real:
   - Tiempo promedio de documentación por departamento
   - Número de órdenes procesadas por técnico
   - Porcentaje de documentación completada vs. pendiente
   - Benchmarking contra otros hospitales IMSS

2. Estos líderes presentan regularmente (semanal) las métricas a la dirección general:
   - "El Departamento de Conservación ha recuperado 23.5 horas/semana usando SIGAB"
   - "Urgencias completó el 100% de reportes en <5 minutos vs. 60 minutos promedio anterior"

3. Resultado: presión orgánica desde pares, no desde arriba. Los técnicos ven que sus compañeros adoptan la herramienta y ganan tiempo → incentivo natural hacia adopción

**Capacitación y onboarding:**
- Sesión de 1 hora: demostración en vivo con un equipo real
- Práctica guiada: cada técnico graba 3 notas de voz, ve el PDF generado
- Énfasis: "Ya no tienes que escribir ni fotografiar papeles. Tu voz es suficiente."

---

## Conclusión

El diagrama de proceso de SIGAB representa una transformación operacional completa del ciclo de vida de gestión de activos biomédicos en hospitales. Al eliminar transcripción manual, implementar validación robusta y proporcionar visibilidad en tiempo real, el sistema genera valor inmediato para directivos, técnicos y, fundamentalmente, para la continuidad de la atención clínica en instituciones IMSS.

La estandarización de la implementación en cinco pasos garantiza que cada hospital pueda adoptar SIGAB sin interrupciones operacionales, mientras que la arquitectura de procesamiento en tiempo real (Etapas 2–4) asegura que los datos clínicos permanezcan seguros, auditables y bajo control local de cada institución. Las mejoras propuestas en la Sección 3.1.6 (Formularios OMR y Flujo WhatsApp-First) representen la evolución natural del sistema hacia una captura de datos más confiable, intuitiva y generadora de valor administrativo para el personal técnico.
