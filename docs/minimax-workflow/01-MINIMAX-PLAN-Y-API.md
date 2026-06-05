# MiniMax para SIGAH / SIGAB — Plan, API y Estrategia

**Fecha:** 1 de junio de 2026
**Autor:** Agente de investigación (SIGAH)
**Tipo de cambio usado en este documento:** **1 USD = 17.5 MXN** (referencia junio 2026; ajustar al tipo real del día de compra)

---

## TL;DR — Recomendación ejecutiva

1. **Son DOS productos distintos y se facturan por separado:**
   - **Suscripción Token Plan (Plus/Max/Ultra)** = herramienta de **DESARROLLO**. Usa una llave **`sk-cp-...`** (Coding Plan) por OAuth y alimenta a **MiniMax Code** (IDE/CLI) y a clientes tipo OpenClaw / Claude Code / Cline. Te da agentes concurrentes y un *pool* mensual de tokens. **Cuando se agota el pool, las llamadas con esa llave se detienen** hasta renovar.
   - **API Pay-as-You-Go** = el **cerebro del PRODUCTO en producción**. Usa una llave **`sk-api-...`**, factura por token real contra saldo, endpoint **OpenAI-compatible** en `https://api.minimax.io/v1`. **No** se descuenta del pool de la suscripción (es otra bolsa de dinero). *Excepción:* los "Créditos" prepagados sí pueden cubrir el desborde del plan, pero la API de producción debe ir con `sk-api` para no quedar limitada por el plan.

2. **Plan recomendado HOY (1 hospital piloto + desarrollo multi-agente activo):** **Empezar en MAX ($44/mo con 12% off).** Da 4-5 agentes concurrentes y ~5.1B tokens/mes, suficiente para desarrollar SIGAH con multi-agente sin estrangularte. Plus (3-4 agentes) se queda corto en cuanto corres 2-3 agentes + tú mismo programando.

3. **Plan a FUTURO (SaaS multi-tenant, varios hospitales):** **Mantener la suscripción Max/Ultra SOLO para desarrollo**, y mover **producción a Pay-as-You-Go (`sk-api`)** con M3 estándar (≤512k). La suscripción NO debe ser el motor de producción multi-tenant: no escala por diseño (se "apaga" al agotar el pool) y mezcla costos de dev con costos de cliente. Producción = pago por token, presupuestado por hospital.

4. **Costo de operar la edición Cloud por hospital vía API M3:** estimado **~3.7–7.4 USD/mes por hospital** (≈ **65–130 MXN/mes**) con supuestos conservadores de Copilot + OpenClaw. Frente a un ticket inicial de ~$100,000 MXN, el costo de IA en la nube es **<0.15% del precio de venta inicial** y plenamente absorbible en cualquier mensualidad de servicio. **El margen no es el problema; el riesgo regulatorio sí.**

5. **Riesgo principal — residencia de datos:** MiniMax es empresa **china**; la API internacional opera bajo marco de Singapur (PDPA) pero el procesamiento puede tocar servidores en China. Para datos clínicos y para sostener el sello **"on-premise / los datos nunca salen del hospital"**, **NO enviar datos identificables de pacientes a MiniMax Cloud**: de-identificar/anonimizar antes de salir, o reservar lo clínico sensible al modelo local. MiniMax Cloud para SIGAB debe tratarse como cerebro **operativo** (activos, refacciones, bitácoras, lenguaje natural), no como bóveda de PHI.

---

## 1. La distinción clave: Suscripción (desarrollo) vs API (producción)

Esta es la confusión más cara de cometer, así que la dejamos explícita.

| Concepto | Token Plan / Suscripción (Plus/Max/Ultra) | API Pay-as-You-Go |
|---|---|---|
| **Para qué sirve** | DESARROLLO: correr MiniMax Code y agentes (IDE/CLI), construir y mantener SIGAH | PRODUCCIÓN: integrar M3 como cerebro del producto SIGAB |
| **Tipo de llave** | `sk-cp-...` (Coding Plan), por OAuth | `sk-api-...` (Open Platform API Key) |
| **Cómo se factura** | Cuota mensual fija + *pool* de tokens; al agotarse, **las llamadas se detienen** hasta renovar | Por token consumido real, contra saldo de la cuenta |
| **Agentes concurrentes** | Sí, es el valor central (3-7 según plan) | No aplica el concepto; tú controlas concurrencia y RPM |
| **Dónde se usa** | MiniMax Code (Desktop/Web) + OpenClaw / Claude Code / Cline / cualquier cliente OpenAI-compatible | Backend de SIGAB (httpx async, OpenAI SDK, etc.) |
| **¿Incluye uso de API de producción?** | **NO de forma escalable.** La llave `sk-cp` puede pegarle a endpoints OpenAI-compatible, pero queda topada por el pool del plan y se apaga al agotarlo. No sirve como motor de un SaaS. | **Sí, es el motor de producción.** |
| **Relación entre ambas** | Independientes. Los "Créditos" prepagados (válidos 1 año) pueden cubrir desborde del plan, pero la separación dev/prod debe mantenerse contable | Independiente del plan |

**Conclusión operativa:** la suscripción **no incluye** un derecho de API de producción ilimitado. Es un pool acotado pensado para coding/agentes. Para el SaaS, **la suscripción y la API son dos partidas de gasto distintas**: una es "herramienta de la fábrica", la otra es "materia prima del producto vendido".

> Nota sobre OpenClaw: tiene doble vía. Con `sk-cp` (OAuth Coding Plan) usa el model ID `minimax-portal/MiniMax-M3` y consume el pool de la suscripción — ideal para que el módulo agéntico de DESARROLLO viva dentro del plan. Con `sk-api` (pay-as-you-go) usa `minimax/MiniMax-M3` y base URL `https://api.minimax.io/anthropic` (o `/v1` para formato OpenAI) — esta es la vía para producción.

---

## 2. El API de MiniMax M3 (cerebro del producto)

### Datos técnicos confirmados

| Atributo | Valor |
|---|---|
| **Endpoint base (OpenAI-compatible)** | `https://api.minimax.io/v1` (internacional). Endpoint Anthropic-compatible: `https://api.minimax.io/anthropic`. China: `https://api.minimaxi.com` |
| **Compatibilidad** | OpenAI API format (chat/completions) **y** formato Anthropic. Encaja directo con el patrón actual de SIGAB (`httpx.AsyncClient` con `base_url` configurable) |
| **Modelos disponibles** | **MiniMax-M3** (insignia, razonamiento), **M2.7** / **M2.7-highspeed**, y legados M2.5, M2.5-highspeed, M2.1, M2.1-highspeed, M2 |
| **Ventana de contexto** | **1,000,000 tokens** (M3). Tramo ≤512k a precio estándar; >512k a tarifa premium (disponibilidad limitada, requiere ventas) |
| **Multimodal** | Texto + imagen + video de entrada (M3). La familia del plan incluye además imagen/voz/música/video de salida |
| **Function / tool calling** | **Sí** — parámetros `tools` y `tool_choice`, pensado para flujos agénticos |
| **Streaming** | **Sí** — respuestas parciales en tiempo real |
| **MCP / agentes nativos** | MiniMax Code y MiniMax Agent son los productos agénticos nativos. M3 vía API soporta tool calling (base para MCP del lado cliente); la doc oficial del API no documenta un servidor MCP propio, pero clientes como OpenClaw lo integran |
| **Rate limits (pay-as-you-go)** | ~200 RPM, ~10M TPM (referencia de lanzamiento) |

### Precios del API (Pay-as-You-Go) — por millón de tokens

> Nota: M3 está en su ventana de lanzamiento con **50% off por 7 días**. Los precios "estándar" son la base para planear costos sostenidos.

| Modelo | Input (estándar) | Output (estándar) | Cache read | Cache write |
|---|---|---|---|---|
| **M3 (≤512k)** | $0.60 /M | $2.40 /M | $0.12 /M (≈5× más barato que input fresco) | gratis |
| M3 (≤512k) *promo lanzamiento* | $0.30 /M | $1.20 /M | $0.06 /M | gratis |
| M3 (>512k) | $1.20 /M | $4.80 /M | $0.24 /M | — |
| M2.7 | $0.30 /M | $1.20 /M | $0.06 /M | $0.375 /M |
| M2.7-highspeed | $0.60 /M | $2.40 /M | $0.06 /M | $0.375 /M |
| M2.5 (legado, más barato) | desde $0.15 /M | — | — | — |

**Lectura clave de precios:** M3 a $0.60 input / $2.40 output es ~5–10% del costo de GPT-5.5 / Gemini 3.1 Pro con desempeño comparable en benchmarks (según el lanzamiento). El **cache de prompt** es la palanca de ahorro más grande para SIGAB: el prompt de sistema + catálogo de refacciones + contexto del equipo se repite muchísimo; cachearlo baja el input efectivo a $0.12/M. **Diseñar SIGAB para reusar prefijos cacheables.**

### Encaje con la arquitectura actual de SIGAB

El servicio actual (`services/gemma_service.py`) ya usa:
- `httpx.AsyncClient(base_url=..., timeout=..., limits=...)`
- una función `_resolve_model()` con **fallback** automático si el modelo configurado no existe.

Esto significa que **MiniMax M3 entra como un proveedor más** cambiando `base_url` a `https://api.minimax.io/v1`, el header `Authorization: Bearer sk-api-...`, y `model=MiniMax-M3`. El patrón de fallback ya existente es exactamente el mecanismo de **degradación elegante** que necesita la edición On-Premise: si MiniMax Cloud no responde, el resolvedor cae a Ollama/Gemma local.

---

## 3. Recomendación de plan de suscripción

### HOY — 1 hospital piloto (HGR No.1 IMSS Tijuana) + desarrollo multi-agente

**Recomendación: MAX — $44/mo (12% off, de $50).**

Justificación:
- **Agentes concurrentes (4-5):** el desarrollo de SIGAH con multi-agente (planner + coder + reviewer, o varios features en paralelo) satura rápido los 3-4 de Plus en cuanto tú también estás iterando. Max da holgura real.
- **Tokens (~5.1B/mes ≈ 102k llamadas/día):** suficiente para desarrollo intensivo diario sin tocar el techo a mitad de mes (que es lo que mata el flujo en Plus).
- **Incluye video (3/día):** útil para material de demo/marketing del piloto sin pagar extra.
- **Costo marginal sobre Plus:** +$26.4/mo (~460 MXN/mes) por duplicar agentes y triplicar tokens. La mejor relación esfuerzo/desbloqueo.

**Cuándo bastaría Plus ($17.6/mo):** solo si Gustavo programa en solitario, sin orquestar varios agentes en paralelo. Dada la intención multi-agente, Plus es falso ahorro.

### FUTURO — SaaS multi-tenant con varios hospitales

**Recomendación: separar las dos partidas.**

1. **Desarrollo:** subir a **ULTRA ($105.6/mo)** cuando el equipo de dev crezca (6-7 agentes concurrentes, ~9.8B tokens). Esto es para el equipo de ingeniería, **no** para los clientes.
2. **Producción (el cerebro de cada hospital cliente):** **migrar a API Pay-as-You-Go (`sk-api`) con M3 estándar.** Razones:
   - **La suscripción no escala como motor de producto:** se apaga al agotar el pool. Un SaaS no puede "apagarse" a fin de mes.
   - **Atribución de costos:** pay-as-you-go te deja medir el costo de IA por hospital y meterlo en el pricing/COGS. La suscripción mezcla dev y prod.
   - **Concurrencia y rate limits:** se controlan a nivel de cuenta API (200 RPM / 10M TPM), escalables con ventas, no atados a "N agentes".

**Regla mnemónica:** *Suscripción = lo que paga la fábrica para construir. API = lo que cuesta cada unidad vendida.*

---

## 4. Costo de operar la edición Cloud por hospital (vía API M3)

### Supuestos (conservadores, ajustables)

| Variable | Supuesto |
|---|---|
| Tipo de cambio | 1 USD = 17.5 MXN |
| Modelo | M3 ≤512k, **precio estándar** ($0.60 in / $2.40 out) — no usamos la promo de lanzamiento para planear sostenible |
| Copilot (consultas de personal biomédico) | 1,500 consultas/mes/hospital |
| Tokens por consulta Copilot | ~3,000 input (prompt sistema + contexto equipo/refacciones) + ~600 output |
| OpenClaw (módulo agéntico, tareas multi-paso) | 200 tareas/mes/hospital |
| Tokens por tarea OpenClaw | ~12,000 input + ~2,500 output (varios turnos) |
| **Cache de prompt** | Escenario A: sin cache. Escenario B: 70% del input es prefijo cacheado a $0.12/M |

### Cálculo

**Copilot:** 1,500 × 3,000 = 4.5M input; 1,500 × 600 = 0.9M output
**OpenClaw:** 200 × 12,000 = 2.4M input; 200 × 2,500 = 0.5M output
**Total/mes/hospital:** ~6.9M input, ~1.4M output

| Escenario | Input | Output | Costo USD/mes | Costo MXN/mes |
|---|---|---|---|---|
| **A — sin cache** | 6.9M × $0.60 = $4.14 | 1.4M × $2.40 = $3.36 | **$7.50** | **~131 MXN** |
| **B — 70% cacheado** | (2.07M×$0.60)+(4.83M×$0.12)=$1.24+$0.58=$1.82 | $3.36 | **$5.18** | **~91 MXN** |
| **B' — promo lanzamiento (referencia)** | mitad de precio input/output | — | **~$2.6–3.7** | **~46–65 MXN** |

**Rango realista sostenido: ~5–7.5 USD/mes por hospital (≈ 90–131 MXN/mes).**

### Comparación con el margen

| Métrica | Valor |
|---|---|
| Ticket inicial Plan A / Cloud | ~$100,000 MXN |
| Costo IA Cloud (API M3) | ~91–131 MXN/mes/hospital |
| Costo IA como % del ticket inicial | **~0.09%–0.13% (anualizado: ~1.1–1.6% del ticket inicial)** |

**Interpretación:** el costo del cerebro M3 en la nube es **despreciable** frente al precio de venta. Incluso con un uso 5× mayor al supuesto, seguirías por debajo de ~700 MXN/mes/hospital. **El modelo de negocio Cloud aguanta el costo de IA con holgura.** Lo que se debe presupuestar bien no es el LLM sino el hardware del Plan A (pistola grabadora láser, escáner) y el servicio constante; la IA es la partida más barata del paquete.

> Recomendación de pricing: incluir la IA dentro de una **mensualidad de servicio/SaaS** (no como costo hundido del ticket inicial), con un *buffer* de 3–5× sobre el costo estimado para absorber picos y el cache miss. Una mensualidad de servicio de $1,500–3,000 MXN/hospital deja la IA en <10% de ese ingreso recurrente.

---

## 5. Riesgos y consideraciones

### 5.1 Residencia de datos (el riesgo #1)

- **MiniMax es empresa china.** La API internacional opera bajo marco de **Singapur (PDPA)** y ofrece data residency en Asia/Europa/Norteamérica + DPA + alineación SOC 2 / ISO 27001 para enterprise. Pero el procesamiento puede tocar infraestructura en China, sujeta a leyes chinas de datos.
- **Implicaciones NOM/ISO:** para datos clínicos identificables (PHI) y para sostener tu **sello "on-premise / los datos nunca salen del hospital"**, enviar PHI a MiniMax Cloud es **incompatible** con esa promesa de marca y un riesgo de cumplimiento (NOM-024 de datos de salud, además de NOM-016/240/ISO-13485 de tu producto).
- **Mitigación obligatoria:**
  1. **De-identificar/anonimizar** antes de salir: SIGAB Cloud manda a M3 metadatos de **activos, refacciones, bitácoras, lenguaje natural operativo** — NO nombres de pacientes, expedientes ni datos sensibles.
  2. Lo clínico sensible se procesa **solo en el modelo local** (edición On-Premise Premium) o no se procesa con IA externa.
  3. Firmar **DPA** y solicitar **data residency fuera de China** (Singapur/Europa) para la cuenta enterprise.
  4. Posicionar SIGAB Cloud como cerebro **operativo de mantenimiento de activos**, no como sistema que toca el expediente del paciente.

### 5.2 Latencia
- API en la nube → dependes de la red del hospital. El IMSS y hospitales públicos suelen tener conectividad variable. Diseñar timeouts (ya hay 120s en el cliente actual) y respuestas en streaming para percepción de rapidez.

### 5.3 Disponibilidad y plan B (degradación elegante)
- **Riesgo:** caída de MiniMax, corte de internet o corte de luz en el hospital.
- **Plan B (ya soportado por la arquitectura):** el patrón `_resolve_model()` con fallback existente permite caer a **Ollama/Gemma local**. Para la edición **On-Premise Premium**, el LLM local + datos locales es el respaldo permanente, no solo contingencia.
- **Recomendación de diseño:** una capa de proveedor con orden de preferencia configurable: `[MiniMax M3 Cloud] → [Gemma local Ollama]`, con *circuit breaker* y reintentos. Esto da la "degradación elegante" prometida en ambas ediciones.

### 5.4 Dependencia de proveedor y precio
- M3 está en promo de lanzamiento; planear con **precio estándar** (lo hicimos). El precio puede cambiar; al ser **OpenAI-compatible**, el costo de cambiar a otro proveedor (incluido OpenRouter, que ya lista M3) es bajo. Mantener la abstracción de proveedor evita lock-in.

### 5.5 Separación de cuentas/llaves (gobernanza)
- Mantener `sk-cp` (dev) y `sk-api` (prod) en cuentas/proyectos separados, con límites de gasto y alertas en pay-as-you-go por hospital/tenant. Evita que un bug en dev queme presupuesto de producción y viceversa.

---

## Resumen de acciones recomendadas

1. **Suscribir MAX ($44/mo)** ahora para desarrollo multi-agente; subir a Ultra cuando crezca el equipo de ingeniería.
2. **Para producción Cloud, usar API Pay-as-You-Go (`sk-api`) con M3 estándar**, no la suscripción.
3. **Añadir MiniMax como proveedor** en `services/gemma_service.py` reusando el patrón `httpx + base_url + fallback`; orden `MiniMax Cloud → Gemma local`.
4. **Diseñar prompts cacheables** (prefijo de sistema + catálogo) para bajar el input efectivo a $0.12/M.
5. **De-identificar PHI** antes de cualquier llamada a la nube; reservar lo clínico sensible al modelo local; firmar DPA + data residency fuera de China.
6. **Pricing:** meter la IA en una mensualidad de servicio con buffer 3–5×; el costo real (~90–130 MXN/mes/hospital) es despreciable frente al ticket de ~$100k MXN.

---

## Fuentes

- MiniMax — Pay-as-You-Go pricing (oficial): https://platform.minimax.io/docs/guides/pricing-paygo
- MiniMax — Token Plan (oficial): https://platform.minimax.io/docs/guides/pricing-token-plan
- MiniMax — Token Plan subscribe (oficial): https://platform.minimax.io/subscribe/token-plan
- MiniMax — OpenAI SDK / API reference (oficial): https://platform.minimax.io/docs/api-reference/text-openai-api
- MiniMax — About APIs / FAQ (oficial): https://platform.minimax.io/docs/faq/about-apis
- MiniMax — Privacy Policy (oficial): https://platform.minimax.io/protocol/privacy-policy
- MiniMax Agent — pricing: https://agent.minimax.io/pricing
- OpenClaw — proveedor MiniMax (config sk-cp vs sk-api, model IDs, base URLs): https://docs.openclaw.ai/providers/minimax
- SuperGok — MiniMax API Keys: Coding Plan vs General API: https://supergok.com/minimax-api-keys-explained-coding-plan-vs-general-api/
- OpenRouter — MiniMax M3 (pricing/providers): https://openrouter.ai/minimax/minimax-m3
- VentureBeat — lanzamiento M3 (benchmarks, 5-10% del costo): https://venturebeat.com/technology/minimax-m3-debuts-eclipsing-gpt-5-5-and-gemini-3-1-pro-on-key-benchmark-performance-for-just-5-10-of-the-cost
- apidog — How to Use the MiniMax M3 API: https://apidog.com/blog/how-to-use-minimax-m3-api/
- Flowith — MiniMax data safety FAQ: https://flowith.io/blog/minimax-faq-data-safety/

*Precios y políticas verificados contra documentación oficial de MiniMax al 1 de junio de 2026. Re-confirmar antes de contratar, ya que M3 está en ventana de lanzamiento con descuentos temporales.*
