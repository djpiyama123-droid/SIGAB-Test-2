# 3.2 Maquinaria y Equipo

## Introducción

La selección estratégica de maquinaria y equipo constituye un factor crítico en la viabilidad técnica y financiera de proyectos de tecnología hospitalaria. Para SIGAB, plataforma on-premise de gestión de activos biomédicos con capacidades de inteligencia artificial, la infraestructura de cómputo, red y etiquetado debe satisfacer simultáneamente tres requisitos fundamentales: (1) robustez operativa en entornos clínicos de alta demanda, (2) cumplimiento de normativas de seguridad hospitalaria e esterilización, y (3) escalabilidad desde pilotos locales hacia implementaciones multi-clínica.

La inversión total en maquinaria y equipo asignada al proyecto corresponde a **$58,000 MXN**, clasificada como inversión fija tangible. Esta suma refleja un balance entre equipamiento de producción (servidor, kit de etiquetado, infraestructura de red) y provisiones para contingencias operativas, garantizando la sostenibilidad técnica del sistema durante la fase de evaluación III y posterior escalamiento.

---

## Tabla de Maquinaria y Equipo

| Equipo | Especificación | Precio Unitario | Cantidad | Subtotal |
|--------|---------------|-----------------|----------|----------|
| **Servidor** | Lenovo ThinkCentre M720q (reacondicionado Grado A), Intel i5-8500T, 16GB RAM, 512GB SSD | $13,500 MXN | 1 | $13,500 |
| **Kit Etiquetado** | Paquete completo: Impresora Térmica Zebra (ZD220/ZD411) + Escáner QR inalámbrico 2D | $8,500 MXN | 1 | $8,500 |
| **Etiquetas RFID** | Tags autoclave 134°C, resistentes a esterilización hospitalaria | $3,000 MXN | 1 lote | $3,000 |
| **Monitor LED** | Monitor 24" para dashboard de gestión en tiempo real | $3,500 MXN | 1 | $3,500 |
| **UPS/No-break** | Sistema de respaldo 1.5 kVA para continuidad operativa del servidor | $4,500 MXN | 1 | $4,500 |
| **Switch de Red** | Switch Cat6 para red LAN aislada (arquitectura on-premise sin internet) | $2,000 MXN | 1 | $2,000 |
| **Cableado y Conectores** | Cableado Cat6, conectores RJ45, organizadores de red | $2,500 MXN | 1 lote | $2,500 |
| **Rack/Gabinete** | Gabinete de pared para alojamiento de servidor y switch | $3,000 MXN | 1 | $3,000 |
| **Herramientas de Instalación** | Kit de herramientas para instalación y configuración in situ | $2,500 MXN | 1 | $2,500 |
| **Equipo de Cómputo Adicional** | Laptop para configuración en campo y herramientas administrativas | — | 1 | — |
| | | | | |
| **SUBTOTAL ESPECIFICADO** | | | | **$43,000** |
| **Contingencias y Equipo Adicional** | Reserva para optimizaciones, licencias de software y provisiones de emergencia | | | **$15,000** |
| **TOTAL INVERSIÓN FIJA TANGIBLE** | | | | **$58,000 MXN** |

---

## Justificación Técnica de Equipamiento Principal

### Servidor: Lenovo ThinkCentre M720q (Intel i5-8500T)

El servidor reacondicionado Grado A seleccionado proporciona la base computacional para la plataforma SIGAB. Con procesador Intel i5-8500T, 16 GB de RAM y almacenamiento SSD de 512 GB, esta arquitectura soporta:

- **Gestión de activos**: Capacidad de administrar hasta 350 activos biomédicos por unidad clínica
- **Escalabilidad de consultas**: Procesamiento de 10,000 peticiones diarias sin degradación de latencia
- **Virtualización**: Soporte para máquinas virtuales de análisis de inteligencia artificial
- **Redundancia**: Compatible con sistemas de respaldo y replicación de datos

La selección de equipo reacondicionado Grado A (recertificado con garantía comercial) optimiza la relación costo-beneficio sin comprometer confiabilidad operativa, aspecto crítico en ambientes hospitalarios donde los fallos de infraestructura impactan directamente la disponibilidad de sistemas de gestión.

### Kit de Etiquetado: Impresora Térmica Zebra + Escáner QR Inalámbrico

El kit de etiquetado ($8,500 MXN) constituye un paquete integrado que comprende:

- **Impresora Térmica Zebra (ZD220/ZD411)**: Impresión de códigos QR y códigos de barras de alta resolución, compatible con etiquetas hospitalarias estándar y etiquetas RFID especializadas
- **Escáner QR Inalámbrico 2D**: Captura móvil de identificadores de activos, permitiendo el registro y localización en tiempo real desde cualquier punto de la clínica

Esta combinación facilita la trazabilidad end-to-end de equipos biomédicos, esencial para cumplir con normativas IMSS de auditoría y control de activos.

### Etiquetas RFID con Resistencia a Autoclave (134°C)

Las etiquetas RFID seleccionadas ($3,000 MXN/lote) presentan especificaciones críticas para operación en entornos hospitalarios:

- **Resistencia térmica**: Diseño de tags que soportan esterilización en autoclave a 134°C, permitiendo el seguimiento de equipos a través de ciclos completos de desinfección
- **Protección química**: Compatibilidad con químicos desinfectantes de uso hospitalario
- **Durabilidad**: Adherencia robusta a superficies metálicas de equipos biomédicos

Esta capacidad de esterilización diferencia a SIGAB de sistemas genéricos de gestión de activos, proporcionando trazabilidad en el ciclo completo de decontaminación equipal.

### Infraestructura de Red: Switch, Cableado y Seguridad

La inversión en infraestructura de red ($2,000 + $2,500 + $3,000 = $7,500 MXN) materializa la arquitectura de seguridad on-premise de SIGAB:

- **Red LAN Aislada**: El switch Cat6 dedicado establece una red local sin conexión a internet, eliminando riesgos de exfiltración de datos médicos
- **Cableado Estructurado Cat6**: Soporte para velocidades de 10 Gbps, proporcionando ancho de banda suficiente para futuras expansiones
- **Gabinete de Pared**: Alojamiento seguro y organizado de componentes de red, facilitando mantenimiento preventivo

Esta arquitectura de red aislada cumple con principios de ciberseguridad hospitalaria recomendados por normativas internacionales (HIPAA, NOM-004-SSA3-2012).

### Sistema de Respaldo: UPS 1.5 kVA

El no-break seleccionado ($4,500 MXN) garantiza la disponibilidad continua del servidor ante interrupciones en el suministro eléctrico. En entornos hospitalarios, donde la continuidad operativa es crítica, un sistema de respaldo de 1.5 kVA proporciona un margen de aproximadamente 10-15 minutos para apagado controlado del servidor, preservando la integridad de datos en transacción.

---

## Equipos Biomédicos Registrados en Piloto HGR No. 1

El sistema SIGAB ha sido validado inicialmente con los siguientes equipos biomédicos en el Hospital General Regional No. 1:

| # | Equipo Biomédico | Modelo/Referencia | Estado |
|---|------------------|-------------------|--------|
| 1 | Arco en C | General Electric OEC 9800 | Registrado |
| 2 | Monitor de Signos Vitales | GE CARESCAPE B650 (Serie SK416381232HA) | Registrado |
| 3 | Monitor de Signos Vitales | GE CARESCAPE B650 (Serie STF244011695A) | Registrado |
| 4 | Ventilador Neo-Pediátrico-Adulto | Vyaire Bellavista 1000 | Registrado |
| 5 | Incubadora Dual | [Especificación pendiente] | Registrado |
| 6 | Silla de Estereotaxia | [Especificación pendiente] | Registrado |

Estos equipos constituyen el catálogo base de validación técnica para la plataforma, demostrando compatibilidad con múltiples fabricantes (General Electric, Vyaire) y categorías de dispositivos biomédicos (imagenología, monitoreo, ventilación, mantenimiento de viabilidad neonatal, neurocirugía).

---

## Criterios de Selección de Equipamiento

La maquinaria y equipo seleccionados para SIGAB fueron evaluados bajo los siguientes criterios:

### 1. Costo-Beneficio
- Equipos reacondicionados certificados (servidor ThinkCentre) reducen inversión capital sin comprometer especificaciones operativas
- Paquetes integrados (kit Zebra) optimizan funcionalidad por peso de inversión
- Relación inversa: equipamiento debe maximizar capacidades de gestión de activos por unidad monetaria invertida

### 2. Disponibilidad en Mercado Local
- Todos los componentes son proveedores establecidos en México (ThinkCentre, Zebra, componentes de red estándar)
- Cadenas de suministro verificadas con plazos de entrega documentados
- Garantías comerciales y servicio técnico disponibles en territorio nacional

### 3. Compatibilidad Hospitalaria
- Cumplimiento con normativas IMSS de seguridad, esterilización y trazabilidad
- Integración con infraestructura existente de hospitales (redes, sistemas eléctricos, espacios físicos)
- Escalabilidad desde clínicas pequeñas (especialidades) hacia complejos hospitalarios multi-departamentales

### 4. Robustez Operativa
- Equipamiento debe soportar ambientes de alta humedad, temperatura fluctuante y vibración característica de entornos hospitalarios
- Durabilidad comprobada en ámbitos clínicos (etiquetas RFID de esterilización, servidores ThinkCentre con antecedentes IMSS)
- Mantenibilidad: disponibilidad de piezas de reemplazo y documentación técnica

### 5. Seguridad de Datos
- Arquitectura on-premise con red aislada previene acceso no autorizado a datos médicos
- Almacenamiento SSD en servidor facilita encriptación de datos sensibles
- Cumplimiento con regulaciones de protección de información hospitalaria (LGPD, NOM-004)

---

## Notas Complementarias

### Fotografías y Documentación
Las fotografías del hardware instalado (servidor, kit de etiquetado, infraestructura de red) serán incluidas como anexo visual del Documento Inversionista. La captura de imágenes está programada para el **sábado 12 de abril de 2026**, posterior a la conclusión de pruebas de integración en campo. Estas fotografías documentarán:

- Servidor y gabinete instalados in situ en HGR No. 1
- Impresora térmica Zebra y escáner QR en operación
- Etiquetas RFID adhesionadas en equipos biomédicos piloto
- Infraestructura de red y sistema UPS

### Contingencias y Equipamiento Adicional
La asignación de $15,000 MXN para contingencias y equipo adicional responde a:

- Necesidades emergentes identificadas durante validación técnica
- Ampliación de capacidades de almacenamiento o computación según escalamiento de piloto
- Licencias de software, herramientas de administración remota, o sistemas de respaldo adicionales
- Provisión de equipos de reemplazo ante fallos imprevistos durante fase de evaluación

Esta reserva presupuestal es característica de proyectos piloto en entornos hospitalarios, donde la identificación completa de requerimientos técnicos ocurre iterativamente durante operación.

---

**Documento Referencia**: Evaluación III - Estudio Técnico, Proyecto SIGAB  
**Institución**: Universidad Xochicalco, Campus Tijuana  
**Fecha de Elaboración**: Abril de 2026
