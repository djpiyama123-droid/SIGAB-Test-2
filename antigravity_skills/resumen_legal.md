# Skill: Resumen Ejecutivo Legal para Inversionistas — Exención Non-SaMD SIGAB

## Goal
Redactar un resumen ejecutivo legal de una página (máximo 600 palabras) dirigido a inversionistas, que argumente con rigor técnico-jurídico cómo la confirmación de la exención "non-SaMD" (Software as a Medical Device) permite a SIGAB operar fuera del alcance de los procesos de registro sanitario de la COFEPRIS, acelerando la inserción al mercado, mientras se mantiene el cumplimiento íntegro de las normativas NOM-016-SSA3-2012 y NOM-240-SSA1-2012.

## Instructions

1. **Encabezado Formal del Documento**
   - Título: "SIGAB — Posición Regulatoria: Exención Non-SaMD y Ruta de Cumplimiento Normativo"
   - Subtítulo: "Resumen Ejecutivo para Due Diligence de Inversión"
   - Fecha: 2026
   - Clasificación: Confidencial — Solo para uso interno y presentación a inversionistas calificados
   - Nota legal estándar de descargo de responsabilidad (disclaimer)

2. **Sección 1 — Definición y Clasificación Regulatoria (150 palabras)**
   Explicar con precisión:
   - ¿Qué es "Software as a Medical Device" (SaMD) según la definición de la IMDRF (International Medical Device Regulators Forum)?
   - Criterio determinante: un SaMD "provee información para la toma de decisiones de diagnóstico o terapéutico" sobre un paciente específico.
   - Por qué SIGAB NO califica como SaMD: el sistema gestiona activos físicos (inventario, mantenimiento, trazabilidad) pero **no interviene en diagnóstico clínico, no genera alertas terapéuticas sobre pacientes individuales, y no procesa señales fisiológicas**.
   - Categoría correcta de SIGAB: "Software en dispositivos médicos de soporte operacional" → exento del proceso de registro como dispositivo médico ante COFEPRIS bajo el Artículo 376 de la Ley General de Salud y el Reglamento de Insumos para la Salud.

3. **Sección 2 — Implicaciones para la Ruta al Mercado (150 palabras)**
   Argumentar el impacto competitivo de esta exención:
   - **Sin exención**: El proceso de registro de un SaMD ante COFEPRIS tarda entre 18 y 36 meses, requiere evidencia clínica, validación técnica, y puede costar entre $500,000 y $2,000,000 MXN en honorarios y estudios.
   - **Con exención non-SaMD**: SIGAB puede desplegarse en cualquier unidad médica del IMSS, ISSSTE o sector privado inmediatamente tras firma de contrato, sin periodo de espera regulatoria.
   - **Ventaja competitiva**: Los competidores que sí clasifican como SaMD (sistemas de diagnóstico asistido por IA, sistemas de monitoreo de pacientes con software embebido) enfrentan barreras de entrada de 2-3 años. SIGAB entra en 30 días.
   - **Riesgo regulatorio residual**: Bajo. La exención debe documentarse en un memo legal firmado por un abogado especialista en regulación sanitaria mexicana (recomendado antes de la ronda de inversión Serie A).

4. **Sección 3 — Cumplimiento NOM-016-SSA3-2012 (100 palabras)**
   Explicar cómo SIGAB cumple activamente la norma:
   - NOM-016 regula la organización y funcionamiento de los hospitales, incluyendo el registro y control del equipamiento médico.
   - SIGAB es la herramienta de cumplimiento: proporciona el expediente digital del equipo, trazabilidad de mantenimientos, registros de calibración, y reportes de tecnovigilancia.
   - Módulos específicos de cumplimiento: `auditoria.py` (log_auditoria_nom016), `metrologia.py` (calibraciones), `checklists.py` (verificaciones periódicas).
   - **Argumento para inversionistas**: SIGAB no solo evita sanciones COFEPRIS — activamente reduce el riesgo de multas por incumplimiento de NOM-016 (hasta $500,000 MXN por hallazgo en auditoría COFEPRIS).

5. **Sección 4 — Cumplimiento NOM-240-SSA1-2012 (100 palabras)**
   Explicar el valor diferencial en tecnovigilancia:
   - NOM-240 establece la obligatoriedad de reportar eventos adversos relacionados con dispositivos médicos a COFEPRIS.
   - SIGAB automatiza este proceso mediante el módulo de Tecnovigilancia: captura del evento, clasificación por severidad, generación de número de reporte, escalado automático al folio COFEPRIS.
   - El trigger MySQL `trg_tv_evento_insert` cambia automáticamente el estado del equipo a "fuera_servicio" ante eventos críticos/graves, previniendo uso continuado de equipos potencialmente peligrosos.
   - **Argumento para inversionistas**: En caso de auditoría COFEPRIS post-evento adverso, SIGAB provee el expediente completo y trazable — reducción significativa de responsabilidad legal institucional.

6. **Sección 5 — Recomendaciones para Due Diligence (pequeña sección final)**
   - Obtener opinión legal formal de firma especializada en regulación sanitaria (ej. Ritch, Mueller; Goodrich Riquelme; o similar)
   - Preparar memo interno de clasificación regulatoria con referencia a IMDRF/N49, Artículo 376 LGS y publicaciones COFEPRIS vigentes
   - Mantener repositorio de evidencia de cumplimiento NOM-016/240 actualizado para presentar en rondas de inversión

## Examples

**Input esperado:**
```
Empresa: SIGAB — Sistema Integral de Gestión de Activos Biomédicos
Jurisdicción: México
Regulador: COFEPRIS
Mercado target: IMSS, ISSSTE, hospitales privados
Inversión buscada: Pre-Serie A / Serie A
```

**Output esperado (fragmento):**
> "SIGAB opera exclusivamente como software de gestión operacional de activos físicos hospitalarios. Conforme a los criterios establecidos por la IMDRF en su documento N49 (2013) y adoptados por la COFEPRIS en sus lineamientos de clasificación de software, la plataforma no constituye un Dispositivo Médico de Software (SaMD) dado que no genera información destinada a la toma de decisiones diagnósticas o terapéuticas sobre pacientes individuales. En consecuencia, SIGAB se encuentra exenta del proceso de registro sanitario establecido en el Artículo 376 de la Ley General de Salud..."

## Constraints

- El documento NO constituye asesoría legal profesional — incluir este disclaimer de forma explícita en el encabezado.
- NO afirmar categóricamente "SIGAB está exento de toda regulación COFEPRIS" — la posición correcta es "SIGAB no requiere registro como dispositivo médico" bajo los criterios actuales de clasificación.
- NO mencionar ni comparar con competidores específicos por nombre.
- El texto debe ser comprensible para un inversionista sin formación jurídica o médica — evitar latinismos y términos excesivamente técnicos sin definición.
- Longitud máxima: 600 palabras en el cuerpo del documento (excluyendo encabezado y disclaimers).
- Idioma: español mexicano formal. Siglas en inglés (SaMD, IMDRF) permitidas con definición en primera mención.
- Las referencias normativas deben ser exactas: NOM-016-SSA3-2012, NOM-240-SSA1-2012, IMDRF/N49, Artículo 376 LGS. No inventar ni parafrasear números de normas.
- El argumento de exención debe basarse en clasificación funcional OBJETIVA del software, no en declaraciones voluntaristas.
