# 4.3 Punto de Equilibrio

## 4.3.1 Definición

El punto de equilibrio (break-even point, BE) es el nivel de ventas en el cual los ingresos totales igualan los costos totales (fijos + variables), de forma que la utilidad operativa es cero. Expresado en fórmula:

$$
\text{BE (hospitales)} = \frac{\text{Costos fijos} + \text{Dep + Amort}}{\text{Precio}_{hosp/año} - \text{Costo variable}_{hosp/año}}
$$

---

## 4.3.2 Parámetros base (Año 1)

| Concepto | Valor |
|---|---:|
| Ingreso promedio por hospital-año (Año 1) | $150,000 |
| Costo variable por hospital-año (40 %) | $60,000 |
| **Margen de contribución por hospital** | **$90,000** |
| Margen de contribución (%) | 60 % |
| Costos fijos totales Año 1 (OpEx + Dep/Amort) | $316,000 |

**Cálculo:**

$$
BE_{año 1} = \frac{316{,}000}{90{,}000} = 3.51 \text{ hospitales}
$$

$$
BE_{pesos} = \frac{316{,}000}{0.60} = 526{,}666 \text{ MXN}
$$

---

## 4.3.3 Lectura del Año 1

- Para cubrir los costos fijos del Año 1 se requieren **3.51 hospitales activos**.
- El plan contempla **3 hospitales en Año 1**, lo que coloca a la empresa ligeramente por debajo del BE.
- **Margen de seguridad Año 1:** −14.6 % (déficit pequeño). La pérdida operativa esperada del Año 1 es de aproximadamente $46,000.
- Este déficit es intencional y responde a una estrategia de penetración: absorber una pérdida mínima en Año 1 para captar el cliente de referencia (IMSS HGR No. 1 Tijuana) que destraba la cadena de referencias hospitalarias.

---

## 4.3.4 Punto de equilibrio año por año

| Año | Hospitales requeridos (BE) | Hospitales reales | ¿Cubre BE? |
|---|---:|---:|---|
| Año 1 | 3.51 | 3.00 | Casi (déficit -0.51) |
| Año 2 | 6.41 | 7.85 | Sí (excedente +1.44) |
| Año 3 | 9.13 | 14.60 | Sí (excedente +5.47) |
| Año 4 | 12.11 | 23.25 | Sí (excedente +11.14) |
| Año 5 | 15.11 | 33.80 | Sí (excedente +18.69) |

A partir del Año 2 la empresa rebasa el punto de equilibrio con un margen creciente, evidencia clara de **apalancamiento operativo**: los costos fijos crecen linealmente mientras los ingresos crecen geométricamente por la acumulación de clientes de licencia recurrente.

---

## 4.3.5 Representación gráfica (conceptual)

```
Ingresos / Costos ($mm)
  ^
 5.13 |                                    ●  Ingresos totales
      |                                 ╱
      |                              ╱
      |                           ╱
 3.35 |                       ━━━━   Costos totales
      |                   ╱
 2.12 |               ●
      |           ╱         BE ≈ 3.51 hosp
 1.14 |       ●  ━━
 0.42 | ● BE
 0.45 |●
      +────────────────────────────→ Año
       1      2      3      4      5
```

El punto de cruce entre ingresos y costos totales ocurre en el **tercer trimestre del Año 1**, coincidiendo con el primer ciclo de cobro de licencia completo.

---

## 4.3.6 Análisis de sensibilidad del BE

| Escenario | % variable | Fijos Año 1 | BE (hosp) |
|---|---:|---:|---:|
| Base | 40 % | $316,000 | 3.51 |
| Optimista (eficiencia soporte) | 30 % | $316,000 | 3.01 |
| Pesimista (más visitas técnicas) | 50 % | $316,000 | 4.21 |
| Base + 1 contratación extra | 40 % | $416,000 | 4.62 |

El BE es **más sensible a cambios en el costo variable que a incrementos moderados de costos fijos**, lo que refuerza la necesidad de optimizar el soporte técnico (OpenClaw + IA local reducen carga de mesa de ayuda).

---

## 4.3.7 Conclusión

- **Año 1:** operación cercana al punto de equilibrio, con pérdida controlada de $46 k. Aceptable dado el objetivo de captar el cliente ancla IMSS.
- **Años 2–5:** la empresa supera holgadamente el punto de equilibrio y genera utilidad creciente gracias al apalancamiento operativo del modelo Asset-Light.
- **Riesgo principal:** que el ramp-up comercial se retrase (por retrasos burocráticos IMSS), moviendo el BE al Año 2. El capital de trabajo de $350 k está dimensionado para absorber esta contingencia.
