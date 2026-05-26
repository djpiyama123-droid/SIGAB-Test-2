# Brief de rediseño — Dos artefactos SIGAH

> **Para qué sirve este archivo:** condensa todo lo que necesitas pegarle a Claude Design para regenerar dos documentos clave del proyecto, con la calidad visual del primer rediseño que ya hicimos pero esta vez con tu información real y los contenidos curados del archivo `SIGAH_Demo_Retroalimentacion_2026-05-13.docx` que recuperaste.
>
> **Cómo usarlo:** abre Claude (web, Cowork o Code), pega el bloque **PROMPT** correspondiente y al final el bloque **CONTENIDO**. Claude regenera el artefacto como widget visual, HTML o `.docx` según le pidas.

---

## Lineamientos visuales compartidos (van en ambos prompts)

> **Marca SIGAH:** azul `#006CB7` primario, azul oscuro `#00497D`, verde `#059669`, ámbar `#B45309`, rojo `#B91C1C`. Fondos claros `#F1F5F9` / `#DCEBF7`. Texto principal `#1E293B`, secundario `#64748B`.
> **Tipografía:** Inter (UI) + Source Sans Pro (datos densos). Pesos 400 y 500 solamente — nunca 700.
> **Densidad:** poco texto, mucho espacio en blanco. Cards con `border-radius` 8–12 px, bordes `0.5px` solid `#C9D6E2`. Cero gradientes, cero sombras, cero emojis. Solo iconos Tabler outline.
> **Lectura:** *Sentence case* siempre (nunca ALL CAPS ni Title Case). Body 14–16 px. Títulos 18–22 px peso 500.
> **Compatibilidad dark mode** si el destino lo soporta.

---

# Parte 1 · Documento ejecutivo para inversionistas SIGAH

## 1.1 Brief

| Campo | Valor |
|-------|-------|
| **Nombre del artefacto** | `SIGAH_Documento_Ejecutivo_Inversionistas_v2.{html,docx,widget}` |
| **Audiencia primaria** | Comité Colegiado de Inversionistas — Universidad Xochicalco |
| **Audiencia secundaria** | Ing. Carlos Ramírez Oswaldo (co-fundador propuesto) |
| **Objetivo** | Presentar SIGAH como empresa SaaS B2B con el caso de éxito SIGAH validado en HGR No.1 y solicitar la cofundación / inversión inicial |
| **Estilo** | Minimalista, escaneable, pocos números pero contundentes |
| **Extensión sugerida** | 4–5 secciones, una sola pantalla scrolleable (web) o 4 páginas (PDF/Word) |
| **Formato target** | Widget Claude Design (web) o `.html` imprimible a PDF carta |

## 1.2 Prompt para pegar en Claude Design

```
Genera un documento ejecutivo para inversionistas de SIGAH como widget visual
limpio y escaneable.

REQUISITOS DE DISEÑO:
- Paleta SIGAH (azul #006CB7, verde #059669, ámbar #B45309)
- Tipografía Inter, pesos 400 y 500 únicamente
- Layout en una columna scrolleable, ancho 680 px, sentence case
- Cards con border 0.5px solid #C9D6E2 y border-radius 8 px
- Cero gradientes, sombras o emojis. Solo iconos Tabler outline
- Poco texto, mucho aire — sin saturación de párrafos

ESTRUCTURA EN 4 SECCIONES:
1. Hero con SIGAH + tagline + destinatario (Comité + Carlos)
2. Sección 1 — Resumen ejecutivo y diagnóstico (4 problemas en cards)
3. Sección 2 — Solución tecnológica Industria 4.0 (4 pilares + tracción)
4. Sección 3 — Estudio económico y rentabilidad (3 KPIs + gráfica Chart.js + 3 resultados)
5. Sección 4 — Conclusión e impacto (figura legal + roadmap + bloque de firma)

CONTENIDO LITERAL (úsalo tal cual, no cambies números ni nombres):
[Pegar el bloque "CONTENIDO Parte 1" de abajo]
```

## 1.3 Contenido literal (pegar después del prompt)

### Hero / portada

- **Marca:** SIGAH
- **Tagline:** Sistema Integral de Activos Hospitalarios — Industria 4.0 hospitalaria
- **Tag superior:** `Documento ejecutivo · Inversionistas`
- **Bloque destinatario:**
  - Para: **Comité Colegiado / Inversionistas** + **Ing. Carlos Ramírez Oswaldo**
  - De: **Gustavo López Carballo** — Bioingeniero · Mayo 2026
  - Origen del piloto: **HGR No. 1 IMSS Tijuana** · Universidad Xochicalco

### Strip de 4 KPIs principales

| KPI | Label |
|-----|-------|
| `8.25/10` | Score de viabilidad validado en operación real |
| `$153K` | Inversión inicial total (MXN) |
| `~85%` | Margen contributivo por hospital cliente |
| `5,000+` | Hospitales objetivo en México |

### Sección 1 — Resumen ejecutivo y diagnóstico

**Subtítulo:** Cuatro hallazgos del estudio de campo en HGR No.1 IMSS Tijuana — cada uno cuesta dinero, vidas y reputación al hospital.

**4 cards de problemas (icono Tabler + porcentaje + 1 línea):**

| Icono | % | Texto (máx 30 palabras) |
|-------|---|------------------------|
| `ti-walk` | **85%** | del personal de enfermería pierde tiempo productivo buscando equipos vitales en cada turno. |
| `ti-emergency-bed` | **90%** | de los mantenimientos preventivos se retrasan. Los equipos operan hasta fallar — muchas veces en cirugía. |
| `ti-file-alert` | **45–90 min** | se gastan transcribiendo cada orden de servicio a mano. Bitácoras alterables, incumplimiento NOM-016 y NOM-240. |
| `ti-chart-bar-off` | **0 KPIs** | directivos sin métricas en tiempo real, imposibilitando la justificación de presupuestos de refacciones. |

**Callout del pivote (fondo verde claro):**

> **El pivote:** Pasamos de un servidor físico en un hospital a una plataforma SaaS multi-tenant que atiende a muchos hospitales, cada uno viendo solo su propia información.

### Sección 2 — Solución tecnológica Industria 4.0

**Subtítulo:** Cuatro pilares que separan a SIGAH del software hospitalario convencional.

**4 cards de pilares (icono Tabler + título + 1–2 líneas):**

| Icono | Título | Texto |
|-------|--------|-------|
| `ti-building-hospital` | Multi-tenant nativo | Una sola plataforma en la nube. Cada hospital ve solo sus datos — aislamiento absoluto a nivel base de datos y backend. |
| `ti-cpu` | Edge Nodes locales | Hardware ligero en cada hospital para impresión, escaneo QR y operación parcial offline. Sin dependencia 24/7 de internet. |
| `ti-sparkles` | IA híbrida | Modelos comerciales (Gemini Flash + Claude Sonnet) para razonamiento. Diagnóstico, lectura de etiquetas, copilot para conservación. |
| `ti-chart-arrows` | Mantenimiento predictivo | La IA anticipa fallas y agenda la intervención en la ventana óptima. El ingeniero biomédico valida y firma. |

**Strip de tracción (5 mini-KPIs):**

`Tracción validada — HGR No. 1 IMSS Tijuana`

| 778 | 244 | 99.5% | 11 | 19 |
|-----|-----|-------|----|----|
| Equipos administrados | Órdenes de servicio | Operatividad | Zonas mapeadas | Tablas en producción |

### Sección 3 — Estudio económico y rentabilidad

**Subtítulo:** Tres números que definen el modelo. SaaS B2B recurrente, escala lineal por hospital.

**3 cards de cifras económicas:**

| Label | Número grande | Descripción corta |
|-------|---------------|-------------------|
| Setup fee único | **$15–25K** | MXN por hospital al inicio — incluye Edge Node + instalación + capacitación. |
| Mensualidad | **$3.5–5K** | MXN por hospital, recurrente. Cubre plataforma, IA, soporte, actualizaciones. |
| Inversión inicial | **$153K** | MXN una sola vez — constitución, infraestructura, capital de trabajo. |

**Gráfica Chart.js — proyección 12 meses:**

- Tipo: barras agrupadas + línea
- Eje X: M1…M12
- Serie 1 (barra azul `#185FA5`): Ingreso mensual MXN = `hospitales[i] * 4000 + (setup 20K si i==0 o hospitales[i] > hospitales[i-1])`
- Serie 2 (barra gris `#B4B2A9`): Costo operativo MXN = `1500 + hospitales[i] * 400`
- Serie 3 (línea verde `#0F6E56`, eje Y derecho): Hospitales activos
- Datos hospitales por mes: `[1,1,2,2,3,3,4,5,5,6,6,7]`

**3 cards de resultados financieros (fondo verde claro):**

| `+$493K` | `32.58%` | `Mes 4–5` |
|----------|----------|-----------|
| VPN proyectada (MXN) | TIR | Punto de equilibrio |

### Sección 4 — Conclusión e impacto

**Subtítulo:** Estructura corporativa y regulatoria definida. Hoja de ruta a 24 semanas.

**3 cards de estructura:**

| Label | Valor | Descripción |
|-------|-------|-------------|
| Figura legal | **S. de R.L. de C.V.** | Socios fundadores: Gustavo y Carlos. RESICO PM mientras ingresos ≤ $35M anuales. |
| Normativa | **NOM-016 · NOM-240 · ISO 13485 · IEC 60601** | Cumplimiento desde el día uno. Trazabilidad encadenada SHA-256. |
| Cliente ancla | **HGR No.1 IMSS** | Caso de éxito documentado. Tijuana como base de operaciones. |

**Roadmap horizontal (7 fases en una fila):**

| Fase 0 | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 | Fase 6 |
|--------|--------|--------|--------|--------|--------|--------|
| Fundación | Multi-tenancy BD | Aislamiento backend | SuperAdmin | Nube + Edge | Formatos | Comercial |

**Bloque de cierre (fondo azul claro, centrado):**

> ### Documento listo para ejecución
> SIGAH evoluciona el éxito validado de SIGAH en HGR No.1 hacia una empresa SaaS escalable, regulada y rentable.
> Próximo paso: confirmar co-fundación y constituir la S. de R.L. de C.V.

**Bloque de firma (dos columnas):**

| _____________________________ | _____________________________ |
|-------------------------------|-------------------------------|
| **Gustavo López Carballo** | **Ing. Carlos Ramírez Oswaldo** |
| CEO · Bioingeniero · Universidad Xochicalco | Co-fundador · Subjefe de Conservación, HGR No.1 IMSS |

**Footer:** SIGAH · Documento ejecutivo confidencial · Universidad Xochicalco · Evaluación final 2026

---

# Parte 2 · Guía de demo + retroalimentación SIGAH

## 2.1 Brief

| Campo | Valor |
|-------|-------|
| **Nombre del artefacto** | `SIGAH_Demo_Retroalimentacion_v2.{docx,html,widget}` |
| **Audiencia** | Ing. Carlos Oswaldo + Jefe de Servicio + equipo técnico del Depto. de Conservación del hospital cliente |
| **Objetivo** | Estructurar la sesión de demo (Parte A) y la encuesta de necesidades (Parte B) para validar SIGAH antes del onboarding de cada hospital |
| **Diferencias vs versión SIGAH anterior** | (1) Refleja la arquitectura multi-tenant. (2) Incluye módulos nuevos (SuperAdmin, predictivo, facturación SaaS). (3) Adapta preguntas para contexto SaaS / multi-hospital. (4) Diseño más limpio, menos saturado. |
| **Formato target** | `.docx` editable para que el facilitador lo imprima y lo llene en la sesión, o widget interactivo si se llena digitalmente |

## 2.2 Prompt para pegar en Claude Design

```
Genera la guía de demo + retroalimentación SIGAH como documento ejecutivo
limpio. Es un formulario de campo para que el facilitador (Gustavo) lo lleve
impreso a la sesión con cada nuevo hospital cliente.

REQUISITOS DE DISEÑO:
- Paleta SIGAH (azul #006CB7, verde #059669, ámbar #B45309)
- Tipografía Inter 14 px body / 20 px títulos peso 500
- Layout tamaño carta vertical, margen 1"
- Cards con borde 0.5px y fondo blanco
- Cero saturación: campos de respuesta amplios, una pregunta por bloque
- Encabezado tripartita parametrizable (logo hospital | nombre | fecha)
- Pie con marca SIGAH y normativa aplicable

ESTRUCTURA (7 secciones):
0. Portada con metadatos de la sesión
1. Parte A — Demo en vivo (5 bloques con pausa de comprobación)
2. Parte B sección 1 — Operación actual (5 preguntas abiertas)
3. Parte B sección 2 — Primera impresión (2 preguntas + escala Likert)
4. Parte B sección 3 — Lo que falta (6 preguntas abiertas)
5. Parte B sección 4 — Priorización (clasificación esencial/útil/prescindible)
6. Parte B sección 5 — Escalabilidad SaaS multi-tenant (6 preguntas)
7. Compromisos + firmas

CONTENIDO LITERAL: [pegar bloque "CONTENIDO Parte 2" de abajo]
```

## 2.3 Contenido literal (pegar después del prompt)

### Portada

- **Título principal:** SIGAH v1.0 — Guía de demo y estudio de necesidades
- **Subtítulo:** Sesión con Departamento de Conservación — `[Nombre del hospital cliente]`
- **Tabla de metadatos (4 filas):**

| Fecha | `[Día] de [mes] de 202_` |
| Hospital | `[Nombre + Unidad médica]` |
| Participantes | `Ing. _____________ (Subjefe de Conservación)` + `Ing. _____________ (Jefe de Servicio)` + otros |
| Propósito | Recorrido guiado por SIGAH + estudio de necesidades para personalización del onboarding |
| Estructura | PARTE A — Demo en vivo SIGAH (30–40 min) · PARTE B — Estudio de necesidades (40 min) |

**Bloque "Instrucciones para el facilitador" (5 viñetas, fondo gris claro):**

1. Durante la DEMO: mostrar el flujo completo `login → equipos → orden → dashboard → copilot → predictivo`. Dejar que observen antes de explicar.
2. Hacer pausa de comprobación después de cada módulo para calibrar relevancia real.
3. En la PARTE B: registrar respuestas textuales. Las palabras exactas del usuario son datos de mercado.
4. Si mencionan un problema que SIGAH ya resuelve, NO interrumpir — anotarlo y aclararlo al cierre.
5. El objetivo NO es vender SIGAH, sino entender las necesidades reales antes del onboarding.

### Parte A — Demo en vivo de SIGAH (5 bloques)

Para cada bloque: número + título + lo que se muestra (≤30 palabras) + **pausa de comprobación**.

| # | Bloque | Lo que se muestra | Pausa de comprobación |
|---|--------|-------------------|------------------------|
| 1 | Acceso y panel de control multi-tenant | Login con matrícula → dashboard del hospital → KPIs en tiempo real. | ¿Estos indicadores son los que quisieran ver al llegar cada mañana? ¿Falta o sobra algún número? |
| 2 | Inventario biomédico parametrizable | Ficha técnica del equipo + QR + historial + datos institucionales del hospital. | ¿Esta ficha tiene los datos que el IMSS les pide registrar? ¿Hay campos que faltan o que sobran? |
| 3 | Órdenes de servicio y mantenimiento | Reporte de falla → OS correctivo → OS preventivo (rutina + evidencia fotográfica). | ¿El flujo registro → asignación → atención → cierre refleja como trabajan? ¿Tienen pasos adicionales? |
| 4 | Cumplimiento regulatorio NOM-016 / NOM-240 | Trazabilidad encadenada SHA-256 + tecnovigilancia + reportes COFEPRIS automáticos. | ¿Tienen auditorías donde necesiten mostrar este tipo de registros? ¿Los formatos generados se parecen a los que el IMSS solicita? |
| 5 | IA híbrida, copilot y mantenimiento predictivo | Diagnóstico de falla con IA + lectura de etiquetas + predicción de fallas (con validación humana). | ¿Qué tipo de reportes les piden con más frecuencia que hoy elaboran manualmente? ¿Confiarían en una sugerencia de IA si el ingeniero biomédico la valida? |

### Parte B — Estudio de necesidades

Cada pregunta queda como:

> **PXX.** Pregunta en negrita
> *Objetivo: [una línea]*
> [4 líneas en blanco para respuesta]

#### Sección 1 — Operación actual del departamento (5 preguntas)

| P# | Pregunta | Objetivo |
|----|----------|----------|
| P1 | ¿Cómo registran hoy una orden de servicio cuando les reportan un equipo dañado? ¿Papel, Excel, WhatsApp, correo? | Diagnóstico del flujo actual y nivel de digitalización previo. |
| P2 | ¿Cuántos equipos biomédicos activos atiende el área en esta unidad? ¿Tienen un inventario actualizado hoy? | Dimensionamiento del parque de equipos. |
| P3 | ¿Cuántas órdenes de servicio (correctivo + preventivo) generan aproximadamente en un mes? | Volumen de trabajo para dimensionar el uso del sistema. |
| P4 | ¿Cuál es el mayor problema o cuello de botella del día a día en conservación que hoy nadie ha resuelto? | El problema #1 que SIGAH debe resolver. |
| P5 | ¿Qué información buscan primero cuando les llega el reporte de un equipo en falla? | Datos críticos que deben estar a la mano en la ficha del equipo. |

#### Sección 2 — Primera impresión tras la demo (2 abiertas + escala Likert)

**Abiertas:**

| P6 | ¿Qué fue lo que más les llamó la atención de la demo — positivo o negativo? | Primera reacción cualitativa de alto valor. |
| P7 | ¿Hay alguna función que vieron y dijeron "esto nunca lo usaríamos" o "no aplica para nosotros"? ¿Cuál y por qué? | Identificar módulos con baja utilidad para este contexto. |

**Escala Likert (1=No / 5=Totalmente):**

| Afirmación | 1 2 3 4 5 |
|------------|-----------|
| Lo que vi en la demo resuelve problemas reales que tenemos en el área. | ○ ○ ○ ○ ○ |
| El sistema se ve suficientemente sencillo para que un técnico lo use sin curva de aprendizaje larga. | ○ ○ ○ ○ ○ |
| Usaría SIGAH en mi rutina diaria si estuviera disponible mañana. | ○ ○ ○ ○ ○ |
| Los módulos NOM-240 y NOM-016 nos serían útiles en auditorías. | ○ ○ ○ ○ ○ |
| SIGAH parece más completo que lo que usamos hoy para gestión biomédica. | ○ ○ ○ ○ ○ |
| Me gustaría que el sistema funcionara en mi celular además de la computadora. | ○ ○ ○ ○ ○ |
| La IA híbrida (copilot + predictivo) para consultar manuales y anticipar fallas me sería útil. | ○ ○ ○ ○ ○ |
| Estaría dispuesto a participar en una prueba piloto formal de SIGAH durante 30 días. | ○ ○ ○ ○ ○ |
| Que SIGAH sea multi-tenant (en la nube, varios hospitales) no me genera preocupación de privacidad. | ○ ○ ○ ○ ○ |

#### Sección 3 — Lo que falta — necesidades no cubiertas (6 preguntas)

| P8 | ¿Hay algún tipo de registro que usan hoy y que NO vieron en la demo? | Detección de gaps funcionales críticos. |
| P9 | ¿Qué campos o datos necesitarían agregar a una Orden de Servicio que no apareció en la demo? | Campos faltantes en el formulario central. |
| P10 | ¿Los reportes que genere SIGAH les servirían directamente para entregarlos al IMSS o a la Dirección sin modificarlos? ¿Qué les faltaría? | Suficiencia de reportes para uso institucional. |
| P11 | ¿Trabajan con proveedores externos o con el taller central del IMSS para algunas reparaciones? ¿SIGAH debería registrar esa interacción? | Necesidad de módulo de proveedores / taller externo. |
| P12 | ¿Manejan refacciones, consumibles o herramientas en el área? ¿Les sería útil llevar ese inventario dentro de SIGAH? | Posible módulo de inventario de partes y consumibles. |
| P13 | ¿Necesitan registrar cuando prestan o trasladan un equipo a otro servicio del hospital? | Módulo de préstamos y traslados de equipos. |

#### Sección 4 — Priorización de lo que vieron (tabla + abierta)

**Tabla de clasificación** — para cada módulo: **Esencial · Útil · Prescindible**

| Módulo / función | Esencial | Útil | Prescindible |
|------------------|:--------:|:----:|:------------:|
| Autenticación con roles (Administrador / Técnico / Visualizador) | ○ | ○ | ○ |
| Dashboard con KPIs en tiempo real | ○ | ○ | ○ |
| Ficha técnica digital de cada equipo con historial completo | ○ | ○ | ○ |
| Registro digital de órdenes de servicio correctivas | ○ | ○ | ○ |
| Calendario automático de mantenimiento preventivo | ○ | ○ | ○ |
| Alertas automáticas por equipo vencido o falla crítica | ○ | ○ | ○ |
| Módulo de tecnovigilancia NOM-240 | ○ | ○ | ○ |
| Trazabilidad NOM-016 (audit trail encadenado SHA-256) | ○ | ○ | ○ |
| Copilot IA híbrido (Gemini + Claude) para consultar manuales | ○ | ○ | ○ |
| **Mantenimiento predictivo (IA anticipa fallas)** ← nuevo SIGAH | ○ | ○ | ○ |
| Exportación de reportes en PDF y Excel | ○ | ○ | ○ |
| Agente de WhatsApp para registrar órdenes desde el celular | ○ | ○ | ○ |
| **Selector de hospital en la UI (si manejan varias unidades)** ← nuevo SIGAH | ○ | ○ | ○ |
| **Panel SuperAdmin SIGAH (para administración global)** ← nuevo SIGAH | ○ | ○ | ○ |

**Pregunta abierta:**

| P14 | Si tuvieran que elegir SOLO 3 funciones de las que vieron para arrancar con SIGAH mañana, ¿cuáles serían y por qué? | Backlog priorizado por el cliente — las 3 funciones de mayor valor. |

#### Sección 5 — Escalabilidad y replicabilidad hospitalaria (6 preguntas, **adaptadas a SaaS multi-tenant**)

| P15 | El flujo que vieron (registro → asignación → atención → cierre) ¿refleja exactamente cómo funciona su proceso? ¿Tienen pasos o excepciones que el sistema no contempla? | Validación del modelo del sistema. |
| P16 | Si SIGAH se contratara como servicio en la nube para varios hospitales del IMSS, ¿qué información o configuración debería poder cambiar cada hospital por su cuenta sin depender de SIGAH? | Nivel de auto-servicio que requiere el modelo SaaS. |
| P17 | ¿Cuántos ingenieros o técnicos usarían SIGAH en esta unidad? ¿Todos tienen acceso a computadora o celular durante su turno? | Dimensionamiento de usuarios y dispositivos. |
| P18 | ¿El personal de otras áreas (enfermería, quirófano, imagenología) tiene equipos que conservación atiende? ¿Deberían reportar fallas directamente en SIGAH? | Expansión horizontal de usuarios. |
| P19 | ¿Existe algún sistema digital que ya usen (Excel, sistema IMSS, SAP) con el que SIGAH debería intercambiar datos? | Requerimientos de integración. |
| P20 | Para que la Dirección del Hospital o el IMSS autorice SIGAH oficialmente, ¿qué tendría que cumplir? (seguridad, certificaciones, validaciones, integraciones) | Requisitos institucionales para adopción formal. |

#### Sección 6 — Seguridad, confianza y modelo SaaS (3 preguntas, **adaptadas**)

| P21 | SIGAH se opera en la nube (Hetzner, fuera del hospital) pero con aislamiento absoluto por hospital y un Edge Node local para operar sin internet. ¿Les genera confianza ese esquema o preferirían algo distinto? | Percepción de la arquitectura híbrida cloud + edge. |
| P22 | ¿Qué tan importante es para el área que quede registrado quién hizo cada cambio en el sistema, con firma electrónica? | Valoración del audit trail. |
| P23 | ¿Hay información de los equipos que consideran sensible y que no debería ser visible para todos los usuarios? ¿Cómo controlarían esa visibilidad? | Confidencialidad y control de acceso granular. |

#### Sección 7 — Visión, valor y modelo de negocio (4 preguntas, **adaptadas**)

| P24 | Si SIGAH funcionara al 100%, ¿cuánto tiempo al día o a la semana les ahorraría en labores administrativas? | Cuantificación del valor generado — argumento de adopción. |
| P25 | ¿Cuál sería el argumento más fuerte para convencer a la Dirección del Hospital de implementar SIGAH? | Propuesta de valor desde la perspectiva del usuario. |
| P26 | Si SIGAH se ofreciera como suscripción mensual al hospital (no software propio), ¿qué rango de inversión les parecería razonable y qué se debería incluir? | Validación del modelo SaaS (Setup Fee + mensualidad). |
| P27 | Si tuvieran que describir el SIGAH ideal en 3 palabras, ¿cuáles serían? + ¿Hay algo más que quieran mencionar? | Visión del producto deseado + espacio abierto. |

### Compromisos y siguientes pasos (tabla en blanco)

| Acción acordada | Responsable | Fecha límite |
|-----------------|-------------|--------------|
| | | |
| | | |
| | | |
| | | |
| | | |

### Firmas de conformidad (3 columnas)

| _____________________ | _____________________ | _____________________ |
|----------------------|----------------------|----------------------|
| Ing. Carlos Ramírez Oswaldo | `[Nombre del jefe de servicio]` | Gustavo López Carballo |
| Subjefe de Conservación | Jefe de Servicio | SIGAH — Desarrollador / CEO |

**Footer del documento:** SIGAH · Sistema Integral de Activos Hospitalarios · NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · `[Página X de N]`

---

## Cómo usar este brief

1. Abre Claude (web, Cowork o Claude Code).
2. Para el **documento ejecutivo**: pega el prompt de la sección 1.2 + todo el contenido de la sección 1.3. Pide salida como widget visual o `.html` listo para imprimir a PDF carta.
3. Para la **guía de demo**: pega el prompt de la sección 2.2 + todo el contenido de la sección 2.3. Pide salida como `.docx` editable.
4. Cuando Claude regenere, valida que los números económicos (`$153K`, `+$493K`, `32.58%`, `8.25/10`) salgan exactos y que el sentence case se respete.
5. Versiona el resultado con sufijo `_v2` para preservar el anterior como referencia histórica.

---

_v1.0 — 17 de mayo de 2026 · Mantenedor: Gustavo López Carballo · Actualizar cuando cambien los números económicos o se agreguen módulos a SIGAH._
