# Skill: Análisis Financiero OpEx y Punto de Equilibrio SIGAB

## Goal
Construir la tabla de punto de equilibrio financiero del sistema SIGAB y validar matemáticamente la viabilidad del gasto operativo mensual (OpEx) proyectado en $34,049.82 MXN, contrastándolo justificadamente contra el salario mínimo fronterizo vigente en 2026 de $440.87 MXN diarios. El análisis debe demostrar que el costo total de SIGAB es inferior al costo de UN ingeniero biomédico dedicado a tareas manuales equivalentes.

## Instructions

1. **Construcción de la Tabla OpEx Mensual**
   Desglosa el OpEx de $34,049.82 MXN en las siguientes categorías. Si alguna cifra no se proporciona, estimarla con base en precios de mercado mexicano 2026 y marcarlo como `[estimado]`:
   - Infraestructura de servidor on-premise (Lenovo ThinkCentre M720q, amortización 36 meses)
   - Electricidad: servidor 15W × 730 h/mes × tarifa CFE industrial Tijuana
   - Licencias de software: MySQL Community (gratis), React (MIT), FastAPI (MIT) → $0
   - Internet empresarial hospitalario (si aplica, o LAN interna sin costo adicional)
   - Soporte técnico y mantenimiento (horas bioingeniería × tarifa horaria)
   - Contingencia (10% del subtotal)
   - **TOTAL: $34,049.82 MXN/mes**

2. **Benchmark contra Salario Mínimo Fronterizo 2026**
   - Salario mínimo fronterizo 2026: **$440.87 MXN/día** (zona libre de la frontera norte, CONASAMI)
   - Calcular: $440.87 × 30 días = salario mensual bruto de un trabajador a SMF
   - Calcular: costo total empleador = SMF × 1.35 (IMSS + INFONAVIT + SAR ≈ 35% carga social)
   - Mostrar cuántos trabajadores a SMF equivale el OpEx de SIGAB
   - **Argumento central**: SIGAB gestiona el inventario completo 24/7 al costo equivalente de N.N trabajadores a SMF, mientras un equipo humano equivalente requeriría al menos 3-5 personas + errores humanos + ausentismo

3. **Tabla de Punto de Equilibrio**
   Calcular el breakeven en número de equipos gestionados:
   - **Costo unitario por equipo/mes**: `$34,049.82 / N_equipos`
   - Para N = 50, 100, 200, 500, 1000 equipos: mostrar costo unitario
   - **Comparativa**: costo de gestión manual por equipo/mes (horas técnico × tarifa)
   - **Punto de equilibrio**: número de equipos donde SIGAB supera económicamente la gestión manual
   - Incluir columna: "Ahorro acumulado anual" para cada nivel de inventario

4. **Escenario HGR No.1 IMSS Tijuana**
   - Inventario estimado: ~800-1,200 equipos biomédicos activos
   - Calcular OpEx por equipo/mes para ese rango
   - Proyección de ahorro a 3 años vs gestión tradicional
   - Incluir: reducción de pérdidas por equipo no localizado (referencia: costo diario de equipo fuera de servicio no detectado en UCI = estimado $2,500-$8,000 MXN por evento evitado)

5. **Formato de Entregables**
   - Tabla principal en Markdown (columnas: Concepto | Costo Mensual MXN | % del Total | Notas)
   - Tabla de punto de equilibrio (columnas: N Equipos | Costo/Equipo/Mes | Gestión Manual | Ahorro Mensual | Ahorro Anual)
   - Gráfica de texto ASCII mostrando la curva de costo decreciente por economía de escala
   - Párrafo ejecutivo de 100 palabras para presentación a directivos IMSS

## Examples

**Input esperado:**
```
OpEx mensual: $34,049.82 MXN
SMF diario 2026: $440.87 MXN
Hospital: HGR No.1 IMSS, inventario ~1,000 equipos
Carga social IMSS: 35%
```

**Output esperado (fragmento tabla):**

| Concepto | Costo Mensual MXN | % Total |
|----------|-------------------|---------|
| Amortización servidor M720q (36m) | $1,388.89 | 4.1% |
| Electricidad (15W × 730h × $2.85/kWh) | $31.27 | 0.1% |
| Soporte bioingeniería (10h × $800/h) | $8,000.00 | 23.5% |
| [demás ítems...] | ... | ... |
| **TOTAL** | **$34,049.82** | 100% |

**Punto de equilibrio (fragmento):**

| Equipos | Costo SIGAB/equipo/mes | Gestión Manual/equipo/mes | Ahorro Mensual |
|---------|------------------------|--------------------------|----------------|
| 100 | $340.50 | $850.00 | $50,950 |
| 500 | $68.10 | $850.00 | $390,950 |
| 1,000 | $34.05 | $850.00 | $815,950 |

## Constraints

- NUNCA inventar cifras de costos. Si no se proporcionan, marcar explícitamente como `[estimado]` y justificar la fuente (INEGI, CONASAMI, CFE tarifa industrial).
- Usar **pesos mexicanos (MXN)** exclusivamente. No convertir a USD salvo que se solicite.
- El SMF de $440.87 MXN/día es un DATO FIJO — no modificar ni "actualizar" sin instrucción explícita.
- El OpEx de $34,049.82 MXN/mes es un DATO FIJO.
- Todas las fórmulas deben ser transparentes y auditables (mostrar operación matemática explícita).
- El argumento financiero debe ser CONSERVADOR (favorable hacia SIGAB sin exagerar el ahorro).
- Cumplir con terminología contable mexicana: OpEx, CAPEX, carga social, IMSS, INFONAVIT, SAR.
- No incluir análisis de ingresos ni modelo de negocio SaaS — SIGAB es on-premise sin licencias variables.
