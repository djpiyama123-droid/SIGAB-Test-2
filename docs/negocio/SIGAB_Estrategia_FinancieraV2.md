# SIGAB: Actualización de Estrategia Financiera
## Basada en Auditoría de Modelo y Crítica NotebookLM

**Versión:** 2.0  
**Fecha:** Abril 2026  
**Contexto:** Revisión crítica de vulnerabilidades de liquidez en modelo B2G (Gobierno)

---

## 1. Diagnóstico de la Fricción de Liquidez Actual

### Problema Fundamental

El modelo financiero actual de SIGAB presenta un desajuste crítico entre flujos de caja y ciclos de pago gubernamentales:

- **Capital de trabajo disponible:** $35,000 MXN
- **Ciclo de pago IMSS documentado:** 60-90 días post-licitación
- **Inversión inicial por hospital:** $153,000 MXN (CapEx completo)
  - Infraestructura fija: $58,000 MXN
  - Software/licencias: $60,000 MXN
  - Capital de trabajo: $35,000 MXN
- **OpEx mensual:** $34,049.82 MXN

### Estructura del Problema

Cuando SIGAB cubre CapEx de hardware por adelantado (servidores Lenovo $13,500 + pantallas $8,500 + terminales Zebra $6,500), asume un rol de **revendedor de hardware** en lugar de proveedor de software. Con meta de 2-3 hospitales/mes:

- **Mes 1:** Se invierten $306,000-$459,000 MXN (2-3 setups). Capital de trabajo se agota.
- **Mes 2-4:** Sin capital circulante, no puede expandir. SIGAB espera pagos del gobierno.
- **Mes 4-5:** Primer pago del IMSS llega (60-90 días). Solo entonces recupera liquidez.

Este ciclo es **incompatible con escalamiento rápido** y crea vulnerabilidad ante retrasos de pago.

---

## 2. Análisis Comparativo: Cuatro Escenarios Financieros

| Aspecto | Modelo Actual | Estrategia 1 | Estrategia 2 | Estrategia 3 |
|--------|---------------|------------|------------|------------|
| **CapEx/Hospital** | $153,000 | $153,000 | $30,000 | Mixto |
| **Ingresos/Hospital** | $120,000/año | $120,000/año | $150,000/año | $120,000-180,000 |
| **Capital de trabajo** | $35,000 | $200,000-300,000 | $60,000 | $100,000 |
| **Break-even** | 0.8 hosp/mes | 0.8 hosp/mes | 0.3 hosp/mes | 0.5 hosp/mes |
| **Rol de SIGAB** | Revendedor+Software | Revendedor+Software | Software puro | Flexible |
| **Escalabilidad (6 meses)** | 4-6 hospitales | 6-8 hospitales | 12-15 hospitales | 8-12 hospitales |
| **Tiempo cobro** | 60-90 días | 60-90 días | 30-45 días | 45-90 días |
| **Atracción inversor** | Riesgoso | Realista | Muy fuerte | Moderadamente fuerte |

---

## 3. Flujo de Caja a 6 Meses: Proyecciones por Escenario

### Supuestos Compartidos
- Inicio con capital inicial: $200,000 MXN (para Estrategias 1 y 2)
- OpEx: $34,049.82 MXN/mes ($408,598 para 6 meses)
- Meta de despliegue: 2 hospitales/mes (conservador)
- Ciclo de pago IMSS: 75 días promedio

### Escenario A: Modelo Actual

```
Mes 1:  -$153,000 (1 setup) | Cash: $47,000
Mes 2:  -$153,000 (1 setup) + $34,050 OpEx | Cash: -$140,050 [QUIEBRA]
Mes 3:  Sin fondos. Operación congelada.
Mes 4:  Primer pago IMSS llega. Recuperación lenta.
Mes 5-6: Cautela operativa, crecimiento limitado
```

**Resultado:** Insolvencia técnica en Mes 2. Requiere crédito externo o dilución de equity.

### Escenario B: Estrategia 1 (Inversión + Línea de Crédito Revolvente)

**Supuesto:** Inversor entiende riesgos reales, aprueba $250,000 MXN de línea revolvente (además del capital).

```
Mes 1:  -$153,000 (1 setup) | Cash: $47,000
Mes 2:  -$153,000 (1 setup) + $34,050 OpEx | Cash: -$140,050 → Usa línea
Mes 3:  -$153,000 (1 setup) + $34,050 OpEx | Línea: -$327,100 acumulado
Mes 4:  Primer pago IMSS ($120,000) llega | Líquida línea parcialmente
Mes 5:  Ingresos mensuales ($240,000 de 2 hospitales) | Línea casi saldada
Mes 6:  Operación estabilizada con margen | Cash acumulado: +$50,000
```

**Resultado:** Viable. Pero requiere credibilidad con inversor sobre "realidad del riesgo". Línea de crédito es costo de financiación (~3-5% anual).

### Escenario C: Estrategia 2 (Separación Hardware/Software)

**Cambio modelo:** Hospital compra hardware con su presupuesto. SIGAB cobra:
- Servicio de despliegue/instalación: $30,000/hospital
- Licencia on-premise anual: $120,000/hospital
- **Total: $150,000/hospital en año 1**

```
Mes 1:  -$30,000 (1 setup) + $120,000 (licencia año 1) | Cash: $290,000
Mes 2:  -$30,000 (1 setup) + $120,000 (licencia) | Cash: $440,000
Mes 3:  -$30,000 (1 setup) + $120,000 (licencia) | Cash: $590,000
Mes 4:  -$30,000 (1 setup) + $120,000 (licencia) | Cash: $740,000
Mes 5:  Ingresos se estabilizan. OpEx mínimo para mantener.
Mes 6:  Operación sin fricción de liquidez. Margen operativo: 35-40%
```

**Resultado:** Cash positivo desde Día 1. No requiere financiación externa. Escalamiento sin límite de capital de trabajo. **Empresarialmente transformador.**

### Escenario D: Estrategia 3 (Híbrido: HaaS + Software)

**Modelo:** Ofrece ambas opciones. Hospital elige según presupuesto.
- 60% de clientes: Estrategia 2 (hospital compra hardware)
- 40% de clientes: HaaS financiado por tercero (p.ej., banco, leasing)

```
Mes 1-6: Promedio ponderado entre Escenarios B y C
Flujo esperado: $300,000-500,000 a Mes 6
Flexibilidad: Captura clientes sin presupuesto de infraestructura
Riesgo: Gestión dual de dos modelos aumenta complejidad operativa
```

**Resultado:** Muy viable. Mayor penetración de mercado que Estrategia 2 pura.

---

## 4. Análisis de Viabilidad y Recomendación

### Por Qué Estrategia 2 es la Más Potente

1. **Eliminación de Fricción de Liquidez**
   - CapEx se reduce de $153K a $30K (80% reducción)
   - Capital de trabajo requerido: $60K (vs. $35K actual, pero con capacidad de 2x hospitales/mes)
   - Payback period: 3-4 meses (vs. 5-6 meses en Estrategia 1)

2. **Reposicionamiento Empresarial**
   - SIGAB pasa de "proveedor de soluciones integradas" a "software as a service con despliegue"
   - Múltiplos de valuación: SaaS (8-12x ARR) vs. Hardware resellers (1.5-3x)
   - Atracción de inversores: "Software companies scale. Hardware resellers optimize."

3. **Escalabilidad Sin Fricción**
   - Con $200K capital inicial, SIGAB puede servir 12-15 hospitales en 6 meses (sin esperar pagos)
   - Modelo Actual: 4-6 hospitales máximo antes de insolvencia

4. **Simplicidad Operativa**
   - Una línea de negocio clara: Software + Servicios
   - Hospital gestiona su cadena de abastecimiento de hardware (es su core business)
   - SIGAB se enfoca en lo que sabe hacer: software e implementación

### Por Qué Estrategia 1 es Necesaria para Inversores

Aunque Estrategia 2 es superior operacionalmente, **Estrategia 1 es la presentación correcta a inversores:**

- Muestra honestidad sobre ciclos de pago gubernamentales (60-90 días)
- Explica por qué se necesita línea de crédito revolvente
- Demuestra comprensión de riesgos B2G (no proyecciones de fantasía)
- Un inversor que ve un equipo que entiende sus riesgos tiene **más confianza** que uno que ve promesas optimistas

**Estructura de pitch:**
> "Nuestro modelo actual requiere $200-300K de línea de crédito revolvente debido a ciclos de pago IMSS de 60-90 días. Sin embargo, estamos implementando separación hardware/software que eliminará esta fricción y permitirá escalamiento sin financiación externa a partir de Mes 4."

---

## 5. Impacto en el Pitch de Inversión

### Cambio de Narrativa

| Elemento | Antes | Después |
|----------|-------|---------|
| **Proposición** | "Solución integrada para hospitales" | "Plataforma de software + servicios de despliegue" |
| **Ventaja competitiva** | Integración punto-a-punto | Modelo capital-light + escalabilidad SaaS |
| **Riesgo presentado** | Subestimado | Realista (60-90 días de pago) |
| **Financiación solicitada** | $200-300K para capital de trabajo | $250K línea revolvente + presupuesto operativo |
| **Proyección 12 meses** | 8 clientes, $960K revenue | 15-18 clientes, $1.8-2.1M revenue |
| **Margen operativo** | 20-25% | 35-40% (sin CapEx de hardware) |

### Mensajes Clave para Inversores

1. **Honestidad de riesgos**: "Gobierno paga en 60-90 días. Necesitamos línea de crédito revolvente."
2. **Evolución operativa**: "En Mes 4, pasamos a modelo de software puro. A partir de entonces, escalamos sin fricción de liquidez."
3. **Múltiples de valuación**: "Posicionamos SIGAB como empresa de software, no reseller. Valuación target: 10x ARR (vs. 2x para modelos de hardware)."
4. **Ejecución disciplinada**: "Ofrecemos ambos modelos (HaaS + Software) para máxima penetración, pero con Estrategia 2 como core."

---

## 6. Plan de Implementación (30-60 días)

### Fase 1: Comunicación con Clientes (Semanas 1-2)
- Presentar modelo de hardware por cuenta de hospital (requiere presupuesto propio)
- Para hospitales sin presupuesto: ofrecer HaaS (Estrategia 3)
- Renegociar acuerdos existentes bajo nuevo modelo

### Fase 2: Refinamiento Operativo (Semanas 2-4)
- Separar presupuestos: despliegue/instalación vs. licencia anual
- Documentar SLA de instalación ($30K por hospital, 4 semanas)
- Crear paquete de documentación para que hospitales compren hardware

### Fase 3: Modelado Financiero Refinado (Semanas 3-4)
- Proyectar ingresos bajo modelo híbrido (60% Estrategia 2 + 40% Estrategia 3)
- Ajustar presupuesto operativo para servicios de despliegue
- Calcular IRR y payback realista

### Fase 4: Presentación a Inversores (Semana 5-6)
- Pitch Estrategia 1: Necesidad de línea de crédito + riesgos realistas
- Roadmap Estrategia 2: Transición a modelo capital-light
- Proyecciones conservadoras + sensibilidad a retrasos de pago

---

## 7. Conclusiones

**SIGAB enfrenta una decisión arquitectónica:** continuar como proveedor de soluciones integradas (hardware + software) o evolucionar hacia empresa de software puro.

**La evidencia apunta a Estrategia 2:** Separación hardware/software es la que maximiza:
- Escalabilidad sin fricción de liquidez
- Margen operativo
- Atracción de inversores (múltiplos SaaS)
- Enfoque empresarial

**Para inversores de corto plazo (Mes 0-6),** Estrategia 1 (línea de crédito revolvente) es el puente necesario mientras se implementa Estrategia 2.

**Recomendación final:** Presentar a inversores una **"hoja de ruta de transición"** que combine:
- Estrategia 1 (inversión + línea de crédito): Meses 0-3
- Migración a Estrategia 2: Meses 3-6
- Operación optimizada: Mes 6+

Esto demuestra tanto realismo como visión estratégica.

---

**Documento elaborado con base en:**
- Auditoría de modelo financiero actual (validado)
- Crítica de audio NotebookLM sobre ciclos de pago B2G
- Benchmarking de empresas SaaS en sector salud
- Análisis de capital de trabajo para modelos híbridos
