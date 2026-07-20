# Reporte nocturno — Pitch SIGAB (Canva)

**Fecha/hora de ejecución:** 2026-07-20 10:07 UTC · 2026-07-20 03:07 Tijuana (PDT)
**Design verificado (trabajo):** `DAHO0pWG4g0` — "Presentación - SIGAB"
**Design canónico:** `DAHNT2nuHCw` (13 págs) — no fue leído ni editado en esta corrida (no fue necesario para la comparación).
**Modo de esta rutina:** solo lectura. No se ejecutó ningún `start-editing-transaction` ni transacción de edición sobre ningún design. No se modificaron cifras. No se generaron imágenes con IA.

---

## Novedades respecto al reporte de anoche (2026-07-19)

- **Corrimiento de numeración de página (-1) a partir de la sección "La IA y los Agentes":** el contenido que anoche vivía en la página 7 (tarjetas "Asistentes Autónomos" / "Mantenimiento Inteligente") hoy aparece en la **página 6**. El mismo corrimiento de -1 se repite de forma consistente en el resto del deck: "90%" (ayer pág. 9 → hoy **pág. 8**), "Inversión SIGAB" / línea del escáner (ayer pág. 10 → hoy **pág. 9**), "Costo predecible y accesible" / "Contexto de procesamiento de datos" (ayer pág. 12 → hoy **pág. 11**), "$14,688 MXN/año" (ayer pág. 13 → hoy **pág. 12**), "Ahorro de tiempo en auditorías" / "Trazabilidad completa de equipos" (ayer pág. 14 → hoy **pág. 13**).
- El **conteo total de páginas se mantiene en 29** (igual que anoche), por lo que el corrimiento sugiere que se eliminó o fusionó una página en la sección inicial (entre "El sistema actual" y "La IA y los Agentes", páginas 2–6 de hoy) y se agregó otra página en algún punto posterior del deck para compensar y mantener el total en 29. No se detectó ningún cambio en el **contenido de texto** de ninguna cifra ni tarjeta — únicamente cambió su número de página física.
- Fuera de este corrimiento de numeración, **todo el contenido de texto relevante es idéntico carácter por carácter** al de anoche (las 5 cifras protegidas, las 3 tarjetas pendientes, la redacción del escáner 3D).
- Recomendación: confirmar con Gustavo si hizo un ajuste manual de diapositivas recientemente en el editor de Canva. No representa un riesgo para la presentación, pero actualiza las referencias de página que deben usarse de aquí en adelante (las de este reporte).

---

## 1. Verificación de cifras exactas

| Cifra de referencia | Estado en `DAHO0pWG4g0` | Resultado |
|---|---|---|
| Título: "Inversión SIGAB: $72,000–$80,800 MXN" | Presente, idéntico (página 9) | ✅ OK |
| Recurrentes: "$14,688 MXN/año" (aparece 2 veces) | Presente, idéntico en ambas apariciones (página 12) | ✅ OK |
| Láser: "WAINLUX $9,935 o PEKOKO $18,753 (elegir 1)" | Presente, idéntico | ✅ OK |
| GPU: "RTX 4060 Ti $14,000 o RTX 3090 $35,000" | Presente, idéntico | ✅ OK |
| Escáner 3D: **"Escáner 3D MIRACO Plus: $48,000."** | **NO coincide** (persiste desde el 2026-07-11) | 🔴 ALERTA |

### 🔴 Persiste — la línea del escáner 3D sigue modificada, sin resolverse

Texto exacto encontrado esta noche (página 9):

> "Láser: WAINLUX $9,935 o PEKOKO $18,753 (elegir 1). **Escáner 3D (elegir 1): MIRACO Plus $48,000 o Creality Sermoon P1 $85,999 premium.** GPU IA local (24 GB VRAM, AirLLM, NOM-016): RTX 4060 Ti $14,000 o RTX 3090 $35,000."

Corresponde a la decisión pendiente de Gustavo (inciso e) ya aplicada en el design desde antes del 2026-07-11, sin corregir ni revertir (esta rutina es de solo lectura por regla dura, no la toca).

También persiste la **inconsistencia numérica**: el título "Inversión SIGAB: $72,000–$80,800 MXN" en la misma página no se actualizó para reflejar el escenario con Sermoon P1 ($85,999, +79% vs MIRACO Plus). Sin cambios respecto a reportes anteriores.

**Acción requerida (persiste, van varias noches):** Gustavo debe confirmar si el "elegir 1 de 2" fue intencional. Si sí, recalcular el rango de inversión total, o aclarar en el texto que $72,000–$80,800 aplica solo al escenario MIRACO Plus + RTX 4060 Ti. Recomendación: resolver antes de presentar a Carlos Grave.

---

## 2. Verificación de assets (imágenes)

| URL | Resultado |
|---|---|
| `.../pitch-2026-07-10/laser.png` | ✅ HTTP 200, `content-type: image/png`, 873,691 bytes |
| `.../pitch-2026-07-10/miraco.png` | ✅ HTTP 200, `content-type: image/png`, 1,529,076 bytes |

Ambos assets responden correctamente, tamaños idénticos a los reportes anteriores (sin cambios).

---

## 3. Precio Revopoint MIRACO Plus en revendedor MX (informativo)

No se pudo confirmar el precio exacto automáticamente esta noche. El acceso directo a `https://www.3dmarket.mx/p/escaner-3d-miraco-plus-revopoint/` fue bloqueado (HTTP 403, tanto vía `WebFetch` como se ha visto en noches anteriores vía `curl`/proxy de salida). Dato informativo únicamente — no afecta las cifras del deck. Verificación manual sugerida.

---

## 4. Pendientes manuales de Gustavo

Se releyó el texto completo del design de trabajo (29 páginas) para detectar si alguno de estos pendientes ya quedó resuelto. **Ninguno de los incisos (a)–(e) pudo eliminarse:**

### a. Duplicar 3 tarjetas (la API no inserta texto nuevo) — sigue pendiente, ninguna de las 3
- **Página 6** (antes página 7): solo 2 columnas — *Asistentes Autónomos* y *Mantenimiento Inteligente*. Falta la tarjeta **"Atención Proactiva"**.
- **Página 11** (antes página 12): solo 2 columnas — *Costo predecible y accesible* y *Contexto de procesamiento de datos*. Falta la tarjeta **"Datos on-premise"**.
- **Página 13** (antes página 14): solo 2 columnas — *Ahorro de tiempo en auditorías* y *Trazabilidad completa de equipos*. Falta la tarjeta **"Mantenimiento eficiente"**.

### b. Unificar verde del "90%" con el verde institucional de encabezados
**No verificado visualmente esta noche** — se intentó descargar las miniaturas de página vía `get-design-pages` (herramienta de solo lectura, sin transacción de edición) pero el acceso a `media.canva.com` sigue bloqueado desde este entorno en la nube (conexión rechazada por el proxy de salida). Pendiente sin cambios de estado. Página del "90%": **página 8** (antes página 9).

### c. Revisar tamaño del byline de la portada para proyector
**No verificado visualmente**, mismo motivo que el inciso (b). Pendiente sin cambios (página 1, sin corrimiento).

### d. Conseguir foto REAL de la GPU RTX 4060 Ti — colocar en `~/sigab-pitch-assets/` de la ASUS
**No verificable desde este entorno en la nube.** Se mantiene pendiente por precaución. Recordatorio: prohibido sustituir por otra imagen generada con IA. Imagen actual en **página 9** (antes página 10).

### e. Decisión de Gustavo — escáner 3D
Sin cambios: el design **ya contiene** la redacción "elegir 1 de 2" con Creality Sermoon P1 $85,999 MXN junto a MIRACO Plus $48,000 (ver sección 1), pero el título de inversión total **no se actualizó** y no hay constancia de que ésta sea la decisión final de Gustavo. Sigue pendiente confirmar y, si aplica, corregir el rango de inversión. Dato de referencia sin modificar: Creality Sermoon P1 — $85,999 MXN (store.creality.com/mx, cotizado 2026-07-10).

---

## Resumen ejecutivo

- ℹ️ **Novedad esta noche:** corrimiento de numeración de página (-1) desde la página 6 en adelante (el total se mantiene en 29 páginas); no hay cambios de contenido, solo de ubicación. Ver sección "Novedades" arriba para el detalle y las páginas actualizadas.
- 🔴 **Persiste (desde 2026-07-11):** la línea del escáner 3D en la página 9 ("Inversión SIGAB") sigue en "elegir 1 de 2" (Sermoon P1 incluido) sin que el título de inversión total se haya actualizado — revisar antes de presentar a Carlos Grave.
- ✅ Cifras de inversión total, láser, GPU y costos recurrentes ($14,688) intactas.
- ✅ Los 2 assets de imagen (laser.png, miraco.png) responden correctamente en GitHub, sin cambios de tamaño.
- ⚠️ Las 3 tarjetas de contenido (Atención Proactiva, Datos on-premise, Mantenimiento eficiente) siguen sin duplicarse — ahora en páginas 6, 11 y 13 respectivamente.
- ⚠️ Verificaciones visuales (color del 90%, tamaño del byline, autenticidad de la foto de GPU) no pudieron realizarse esta noche por falta de acceso a `media.canva.com` desde este entorno en la nube.
- ℹ️ Precio de MIRACO Plus en 3dmarket.mx no confirmado automáticamente (HTTP 403) — solo informativo.

**Novedad principal respecto al reporte del 2026-07-19:** corrimiento de numeración de páginas (-1) sin cambio de contenido. El resto de los hallazgos (escáner "elegir 1 de 2" sin resolver, 3 tarjetas pendientes, verificaciones visuales bloqueadas) se mantiene igual que en reportes anteriores.
