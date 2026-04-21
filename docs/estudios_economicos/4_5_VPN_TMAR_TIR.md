# 4.5 VPN, TMAR y TIR

## 4.5.1 Determinación de la TMAR

La **Tasa Mínima Aceptable de Rendimiento (TMAR)** es el piso mínimo de rentabilidad exigida al proyecto. Se construye como:

$$
\text{TMAR} = \text{Tasa libre de riesgo} + \text{Prima de riesgo}
$$

| Componente | Valor | Fuente |
|---|---:|---|
| Tasa libre de riesgo (CETES 28 días) | 9.25 % | Banxico — abril 2026 |
| Prima de riesgo | 8.75 % | Rango "nuevo mercado" 8-15 % según PDF Prof. Piña |
| **TMAR** | **18.00 %** | Piso mínimo de rentabilidad exigida al proyecto SIGAB |

**Justificación de la prima de 8.75 %.**
SIGAB entra en la categoría **"nuevo mercado"** (HealthTech B2G en México tiene baja penetración de software on-premise auditado). Se elige el extremo bajo del rango (8-15 %) por las siguientes ventajas atenuantes:
- El software es una extensión natural del flujo normativo NOM-016 existente (reduce riesgo de adopción).
- El cliente ancla (HGR No. 1 Tijuana) ya validó el prototipo en fase de pruebas.
- La operación 100 % on-premise elimina el riesgo de compliance con la LFPDPPP.

---

## 4.5.2 Cálculo del VPN

$$
\text{VPN} = -\text{Inversión}_0 + \sum_{n=1}^{5} \frac{\text{Flujo}_n}{(1 + \text{TMAR})^n}
$$

### Tabla de descuento (TMAR = 18 %)

| Año | Flujo de caja | Factor (1+TMAR)ⁿ | Valor Presente | VP Acumulado |
|---|---:|---:|---:|---:|
| 0 | ($850,000) | 1.0000 | ($850,000) | ($850,000) |
| 1 | $30,000 | 1.1800 | $25,424 | ($824,576) |
| 2 | $163,786 | 1.3924 | $117,628 | ($706,948) |
| 3 | $410,082 | 1.6430 | $249,588 | ($457,360) |
| 4 | $768,475 | 1.9388 | $396,371 | ($60,989) |
| 5 | $1,267,820 | 2.2878 | $554,176 | **$493,187** |

$$
\boxed{\text{VPN} = +\$493{,}187 \text{ MXN}}
$$

El VPN es claramente **positivo**. El proyecto genera $493 k de valor presente por encima de lo que rentaría colocar los $850 k a la TMAR del 18 %.

**Payback descontado:** entre el Año 4 y Año 5 (el VP acumulado cruza el cero durante el Año 5).

---

## 4.5.3 Cálculo de la TIR

La **Tasa Interna de Retorno (TIR)** es la tasa de descuento que hace VPN = 0. Calculada numéricamente (función `IRR` de Excel) sobre los flujos:

$$
\text{TIR} = 32.58 \%
$$

### Regla de decisión (PDF Prof. Piña)

| Criterio | Resultado |
|---|---|
| VPN > 0 | Sí (+$493,187) — **Aceptar** |
| TIR > TMAR | Sí (32.58 % > 18.00 %) — **Aceptar** |
| **DECISIÓN** | **INVERTIR** |

La TIR supera la TMAR por **14.58 puntos porcentuales**, un margen holgado que da robustez al proyecto ante desviaciones de supuestos.

---

## 4.5.4 Análisis de sensibilidad

### Sensibilidad del VPN ante la tasa de descuento

| Tasa de descuento | VPN | Decisión |
|---:|---:|---|
| 5 % | $1,306,970 | Aceptar |
| 10 % | $932,828 | Aceptar |
| 15 % | $639,276 | Aceptar |
| **18 % (TMAR)** | **$493,187** | **Aceptar** |
| 20 % | $406,164 | Aceptar |
| 25 % | $212,870 | Aceptar |
| 30 % | $57,350 | Aceptar marginal |
| 32.58 % (TIR) | $0 | Indiferente |
| 35 % | ($72,341) | Rechazar |

**Lectura:** el proyecto soporta incrementos de la prima de riesgo hasta aproximadamente **14.6 puntos porcentuales** antes de volverse no-rentable. Esto da un amplio margen de tolerancia a escenarios pesimistas de cobranza o ramp-up comercial.

---

## 4.5.5 Sensibilidad a variables operativas

### ¿Qué pasa si el ramp-up se retrasa 1 año?

Si los hospitales nuevos por año son 2, 3, 5, 7, 9 (en lugar de 3, 5, 7, 9, 11):
- VPN ≈ +$180,000 (positivo pero menor)
- TIR ≈ 23 % (sigue > TMAR)
- **Decisión:** aún se invierte

### ¿Qué pasa si los costos fijos suben 25 %?

- VPN ≈ +$280,000
- TIR ≈ 26 %
- **Decisión:** aún se invierte

### ¿Qué pasa si el churn sube de 5 % a 15 %?

- VPN ≈ +$220,000
- TIR ≈ 25 %
- **Decisión:** aún se invierte (pero requiere acción comercial inmediata)

---

## 4.5.6 Múltiplos y ratios complementarios

| Métrica | Valor | Benchmark sector |
|---|---:|---:|
| **ROI total (5 años)** | 210 % | 150-250 % (SaaS temprano) |
| **Múltiplo CAC/LTV (estimado)** | 1:8 | Saludable > 1:3 |
| **Margen neto Año 5** | 23.2 % | 20-30 % SaaS maduro |
| **Crecimiento ingresos Año 2/1** | +152 % | 100-200 % temprano |
| **Cash flow positivo desde** | Año 1 | Excelente (no quema caja) |

---

## 4.5.7 Conclusión ejecutiva

El análisis financiero indica con claridad que **el proyecto SIGAB es viable e invertible**:

- **VPN positivo** de $493,187 MXN a TMAR del 18 %.
- **TIR del 32.58 %**, que supera la TMAR por 14.6 puntos.
- **Flujo de caja positivo desde el Año 1**, sin etapas de cash-burn.
- **Sensibilidades favorables**: el proyecto resiste deterioros moderados en cualquier variable operativa individual.

La regla de decisión formal del PDF del Prof. Piña (VPN > 0 ∧ TIR > TMAR) se cumple holgadamente en el escenario base y en la mayoría de los escenarios de sensibilidad, por lo que se **recomienda ejecutar la inversión inicial de $850,000 MXN**.

---

### Referencias
- PDF de clase: `TMAR_VPN_TIR.pdf` — Prof. Piña, Taller de Emprendimiento 2026.
- PDF de clase: `EDO_RESULTADOS_PROFORMA.pdf` — Prof. Piña.
- Documento base: `SIGAB_Estrategia_FinancieraV2.md`.
- Modelo financiero: `SIGAB_Modelo_Financiero.xlsx`.
