# SIGAB — Reporte de Validación de Datos (NotebookLM)
## Fecha: 10 de abril de 2026 — Día 1 del Plan de Trabajo

---

## CONSULTA 1: Validación de Números del Estudio Técnico

### 1) CapEx Total: $153,000 MXN — CORRECTO
- Inversión Fija (tangibles): $58,000
- Inversión Diferida: $60,000
- Capital de Trabajo: $35,000

### 2) OpEx Mensual: $34,049.82 MXN — CORRECTO
- Mano de obra directa: $26,400
- Tokens IA (Google Gemini): $1,500
- Hosting/servicios: $1,449.82
- Difusión: $1,700
- Depreciación: $3,000

### 3) Lenovo ThinkCentre M720q a $15,000 — REQUIERE CORRECCIÓN
- **NotebookLM indica:** El servidor está cotizado en **$13,500 MXN** (reacondicionado Grado A) o incluso **$8,000 MXN** (optimizado)
- **Acción:** Verificar cotización actual y actualizar en el documento

### 4) Zebra ZD411 a $8,500 — PARCIALMENTE INCORRECTO
- **NotebookLM indica:** Los $8,500 corresponden al **paquete completo** (Impresora Térmica Zebra ZD220/ZD411 + Escáner QR inalámbrico 2D)
- La impresora Zebra por sí sola: **$5,790 - $7,000 MXN** según modelo
- **Acción:** Desglosar correctamente en la tabla de maquinaria

### 5) Total Inversión Fija Tangible: $58,000 MXN — CORRECTO
- La suma de todos los activos físicos cuadra perfectamente

### 6) Equipos Biomédicos en Piloto HGR No. 1 — 6 EQUIPOS REGISTRADOS
1. Arco en C (General Electric OEC 9800)
2. Monitor de Signos Vitales (GE CARESCAPE B650 - Serie SK416381232HA)
3. Monitor de Signos Vitales (GE CARESCAPE B650 - Serie STF244011695A)
4. Ventilador Neo-Ped-Adulto (Vyaire Bellavista 1000)
5. Incubadora Dual
6. Silla de Estereotaxia

**Nota importante:** El servidor tiene capacidad para gestionar los **350 activos biomédicos en promedio** que posee cada clínica, y puede escalar hasta **10,000 peticiones diarias sin latencia**.

---

## CONSULTA 2: Datos de Mercado y Financieros

### 1) TAM / SAM / SOM

| Métrica | Valor | Detalle |
|---------|-------|---------|
| **TAM** | $2,200 - $3,600 millones MXN/año | Unidades médicas con +50 camas (IMSS, ISSSTE, IMSS-Bienestar, privados) |
| **SAM** | $360 - $590 millones MXN/año | HGR, HGZ y UMAE del IMSS |
| **SOM** | $14.4 millones MXN | 8-12 hospitales piloto en BC y Sonora (primeros 2 años) |

### 2) Hospitales IMSS
- **Nacional:** +250 HGR/HGZ (~270 HGR + 25 UMAEs)
- **Baja California y Sonora (mercado meta):** 8-12 hospitales piloto

### 3) Modelo de Negocio Exacto

| Concepto | Precio |
|----------|--------|
| **Setup Inicial (HaaS)** | $45,000 - $60,000 MXN/hospital (fijado en **$60,000** para pro-forma) |
| **Licencia Anual (SaaS On-Premise)** | $80,000 - $120,000 MXN/año (fijado en **$120,000** para pro-forma) |
| **Precio promedio ponderado (Setup + Licencia Año 1)** | **$180,000 MXN/hospital** |

### 4) Punto de Equilibrio
- **0.8 hospitales/mes** — con cerrar 1 hospital mensual, el proyecto ya cubre costos fijos y genera utilidades netas

### 5) Datos de Encuestas de Campo

| Hallazgo | Porcentaje | Grupo |
|----------|-----------|-------|
| Tiempo perdido buscando equipos o reportando fallas | **85%** | Enfermería |
| Mantenimientos preventivos retrasados | **90%** | Ingeniería Biomédica |
| Sin dashboard en tiempo real para auditar inventario | **100%** | Jefaturas/Directivos |
| Equipos sin historial técnico continuo | **60%** | Hospitales regionales |

### 6) Score de Viabilidad: 8.25 / 10

| Criterio | Peso | Calificación | Puntos |
|----------|------|-------------|--------|
| Acceso a equipos médicos reales | 25% | 10 | 2.50 |
| Acceso a usuarios finales | 20% | 10 | 2.00 |
| Seguridad y confidencialidad | 15% | 9 | 1.35 |
| Disponibilidad de internet y tecnología | 15% | 7 | 1.05 |
| Costos de operación | 15% | 5 | 0.75 |
| Facilidad administrativa | 10% | 6 | 0.60 |
| **TOTAL** | **100%** | | **8.25** |

---

## CORRECCIONES PENDIENTES PARA EL DOCUMENTO

1. **ThinkCentre M720q:** Actualizar precio de $15,000 a $13,500 MXN (o verificar cotización actual)
2. **Zebra ZD411:** Desglosar que los $8,500 son el paquete (impresora + escáner), no solo la impresora
3. **Pantalla LED:** NotebookLM menciona "Pantalla LED de 55 pulgadas" en un punto — verificar si es 24" o 55"
4. Asegurarse de que todos los números del documento inversionista coincidan con esta validación

---

## GAPS IDENTIFICADOS (Información faltante)

- [ ] Fotos del hardware real en HGR No. 1 (Salvador + Fernando — sábado 12)
- [ ] Layout/plano del taller de integración (Gustavo — domingo 13)
- [ ] Organigramas en formato final para el documento (YA GENERADOS — archivo HTML)
- [ ] Diagrama de flujo en formato insertable para Word (YA GENERADO — archivo HTML)
- [ ] Cotizaciones actualizadas de hardware (verificar precios abril 2026)
- [ ] Video backup de la demo (Fernando — 19 abril)
