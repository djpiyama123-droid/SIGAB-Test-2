# 4.2 Inversión Inicial en Activo Fijo y Preoperativos

## 4.2.1 Composición de la inversión

| Concepto | Monto (MXN) | % del total | Descripción |
|---|---:|---:|---|
| Activo fijo tangible | $80,000 | 9.4 % | 1 Lenovo ThinkCentre M720q + monitor, teclado, mobiliario para oficina operativa |
| Activo intangible | $300,000 | 35.3 % | Capitalización de 8 meses de desarrollo de software (backend FastAPI, frontend React, IA local) |
| Capital de trabajo | $350,000 | 41.2 % | 12 meses de OpEx mínimo bajo escenario conservador |
| Gastos preoperativos | $120,000 | 14.1 % | SAT, IMPI, notario, constitución SA de CV, marca registrada |
| **INVERSIÓN INICIAL TOTAL** | **$850,000** | **100 %** | |

---

## 4.2.2 Justificación por rubro

**Activo fijo tangible ($80,000).**
Asset-Light implica que el hardware productivo (servidores on-premise) lo adquiere cada hospital con su propio presupuesto de inversión. SIGAB solamente necesita un equipo propio de despliegue y desarrollo: 1 micro-servidor de referencia para pruebas + equipos de trabajo. No se requiere centro de datos propio.

**Activo intangible ($300,000).**
Representa el desarrollo del software capitalizado. Incluye 8 meses de trabajo a valor de mercado para diseñar y construir: backend FastAPI con 9 módulos, frontend React con 12 páginas, IA local (Ollama + Gemma) integrada, esquema MySQL con auditoría NOM-016, integración WhatsApp para el flujo OpenClaw.

**Capital de trabajo ($350,000).**
Cubre 12 meses de OpEx mínimo. El ciclo de pago IMSS documentado es de 60-90 días, por lo que se requiere una reserva de liquidez para absorber los desfases entre la prestación del servicio y el cobro efectivo del primer contrato público.

**Gastos preoperativos ($120,000).**
Constitución de la sociedad (SA de CV simplificada), registro de marca ante el IMPI, permisos sanitarios COFEPRIS para productos de software médico clase I, gastos notariales y legales iniciales.

---

## 4.2.3 Depreciación y amortización

| Concepto | Monto anual | Método | Notas |
|---|---:|---|---|
| Depreciación activo fijo tangible | $16,000 | Línea recta 5 años | Tasa fiscal promedio 20 % |
| Amortización activo intangible | $60,000 | Línea recta 5 años | Software desarrollado internamente |
| **Total Dep + Amort anual** | **$76,000** | | |

Esta partida es relevante porque:
- Es un **gasto no monetario** que reduce la base gravable del ISR.
- Se suma de regreso al flujo de caja operativo (escudo fiscal).
- Impacta directamente en el punto de equilibrio y en la proyección Pro-Forma.

---

## 4.2.4 Fuentes de financiamiento propuestas

| Fuente | Monto (MXN) | % | Observaciones |
|---|---:|---:|---|
| Aporte fundadores (equity inicial) | $150,000 | 17.6 % | Cash-in propio |
| Inversión ángel / seed | $500,000 | 58.8 % | Ronda seed con equity del 15-20 % |
| Crédito PyME revolvente (stand-by) | $200,000 | 23.5 % | Línea de crédito para absorber retrasos IMSS |
| **Total** | **$850,000** | **100 %** | |

Esta estructura se alinea con la recomendación del documento de estrategia financiera V2: **Estrategia 1 (financiamiento honesto) como puente hacia Estrategia 2 (Asset-Light con cash positivo desde el mes 4)**.

---

## 4.2.5 Observaciones metodológicas

- La inversión inicial **no incluye hardware hospitalario**, que es adquirido directamente por cada hospital (Estrategia 2 del documento de estrategia financiera).
- Los $850,000 representan el capital necesario para arrancar la empresa, no el costo por implementación.
- Cada hospital nuevo genera ingresos de $150,000 en Año 1 ($30,000 despliegue + $120,000 licencia) sin consumir CapEx adicional de SIGAB.
