# 4.4 Estado de Resultados Pro-Forma

## 4.4.1 Estructura (plantilla Prof. Piña)

Se aplica la estructura estándar de Estado de Resultados Pro-Forma:

```
(+) Ingresos
(−) Costo de ventas (variable)
(=) Utilidad bruta
(−) Gastos operativos fijos
(−) Depreciación + Amortización
(=) EBIT (Utilidad operativa)
(−) ISR 30 %
(=) Utilidad neta
(+) Depreciación (no-cash)
(=) Flujo de caja operativo
```

---

## 4.4.2 Proyección a 5 años (MXN)

| Concepto | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
|---|---:|---:|---:|---:|---:|
| (+) Ingresos | 450,000 | 1,135,680 | 2,122,099 | 3,442,084 | 5,130,999 |
| (−) Costo de ventas (variable 40 %) | (180,000) | (454,272) | (848,840) | (1,376,834) | (2,052,400) |
| **(=) Utilidad bruta** | **270,000** | **681,408** | **1,273,259** | **2,065,250** | **3,078,600** |
| Margen bruto | 60.0 % | 60.0 % | 60.0 % | 60.0 % | 60.0 % |
| (−) Gastos operativos fijos | (240,000) | (480,000) | (720,000) | (1,000,000) | (1,300,000) |
| (−) Depreciación + Amortización | (76,000) | (76,000) | (76,000) | (76,000) | (76,000) |
| **(=) EBIT** | **(46,000)** | **125,408** | **477,260** | **989,250** | **1,702,600** |
| (−) ISR 30 % (solo si EBIT > 0) | 0 | (37,622) | (143,178) | (296,775) | (510,780) |
| **(=) Utilidad neta** | **(46,000)** | **87,786** | **334,082** | **692,475** | **1,191,820** |
| Margen neto | −10.2 % | 7.7 % | 15.7 % | 20.1 % | 23.2 % |
| (+) Depreciación (no-cash) | 76,000 | 76,000 | 76,000 | 76,000 | 76,000 |
| **(=) Flujo de caja operativo** | **30,000** | **163,786** | **410,082** | **768,475** | **1,267,820** |

---

## 4.4.3 Supuestos clave

| Supuesto | Valor | Justificación |
|---|---:|---|
| Despliegue por hospital | $30,000 | Instalación + capacitación (4 semanas) |
| Licencia anual por hospital | $120,000 | Soporte L2, actualizaciones, IA Copilot |
| Crecimiento de tarifas (inflación) | 4 % / año | IPC México últimos 5 años |
| Churn anual | 5 % | Bajo por lock-in normativo NOM-016 |
| Hospitales nuevos por año | 3, 5, 7, 9, 11 | Ramp-up post-piloto IMSS |
| Costo variable | 40 % ingresos | Soporte L1, visitas técnicas |
| ISR | 30 % | Tasa LISR México |

---

## 4.4.4 Observaciones por año

**Año 1 — Pérdida controlada.**
La utilidad neta es negativa (−$46 k) por dos razones: (a) solo hay 3 hospitales activos, insuficientes para cubrir totalmente los costos fijos iniciales; (b) la depreciación comienza a impactar desde el día uno. El **flujo de caja sigue siendo positivo** ($30 k) porque la depreciación es no-monetaria. Esto confirma que la empresa no quiebra en Año 1.

**Año 2 — Ruptura a rentabilidad.**
Con 7.85 hospitales activos (3 nuevos + 5 que renuevan con 5 % de churn), los ingresos casi se triplican. El EBIT pasa a positivo y comienza a pagarse ISR.

**Año 3 — Consolidación operativa.**
Margen neto supera 15 %. Los ingresos por licencia recurrente superan los ingresos por despliegue de nuevos contratos, señal inequívoca de un modelo de negocio SaaS sostenible.

**Años 4-5 — Apalancamiento operativo.**
Los costos fijos crecen un 30 % anual mientras los ingresos crecen entre 49-62 % anual. El margen neto escala a 23.2 % al final del horizonte, cercano al benchmark de empresas SaaS maduras (25-30 %).

---

## 4.4.5 Escudo fiscal de la depreciación

La depreciación y amortización ($76,000 anuales) funcionan como un escudo fiscal que reduce el ISR pagado. Valor presente del escudo fiscal a TMAR 18 %:

$$
VP_{escudo} = 76{,}000 \times 0.30 \times \frac{1 - (1.18)^{-5}}{0.18} = \$71{,}287
$$

Es decir, la capitalización del desarrollo intangible y la adquisición de activo fijo aportan ~$71 k de valor presente adicional al proyecto por vía fiscal.

---

## 4.4.6 Conversión a flujos para VPN/TIR

Los flujos de caja operativos serán insumo directo para el cálculo de VPN, TMAR y TIR en la sección 4.5:

| Año | Flujo de caja operativo |
|---|---:|
| 0 | ($850,000) — Inversión inicial |
| 1 | $30,000 |
| 2 | $163,786 |
| 3 | $410,082 |
| 4 | $768,475 |
| 5 | $1,267,820 |

Total de flujos positivos: **$2,640,163** sobre inversión de $850,000 → retorno nominal del 3.1× en 5 años.
