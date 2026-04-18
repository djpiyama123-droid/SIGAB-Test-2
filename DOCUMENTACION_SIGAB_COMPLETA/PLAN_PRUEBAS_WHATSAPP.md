# Plan de Pruebas: Módulos de Exportación e Inteligencia WhatsApp

Este documento detalla el funcionamiento y los pasos para verificar la integración de reportes, exportación PDF y el Agente de Inteligencia en WhatsApp.

## 1. Módulos de Exportación (IMSS Compliant)
Los reportes se generan siguiendo el formato institucional del IMSS:
- **Orden de Servicio (PDF)**: Contiene datos del equipo, falla reportada, descripción técnica y espacios para firmas.
- **Reporte Diario**: Resumen narrativo generado por IA sobre el estatus global del hospital.

### Pruebas de Exportación
1. Acceder al Dashboard → Módulo de Reportes.
2. Seleccionar "Exportar PDF" en cualquier equipo.
3. El archivo debe mostrar el encabezado "Instituto Mexicano del Seguro Social" y el logotipo institucional.

## 2. Agente de Inteligencia (WhatsApp Bot)
El bot actúa como el brazo operativo móvil del SIGAB, permitiendo a los ingenieros realizar acciones en campo.

### Comandos de Reporteo
- `/pdf [serie]`: El bot responde enviando un archivo PDF real generado por el servidor.
- `/email [serie] [correo]`: Envía el PDF directamente a la bandeja de entrada especificada (Gmail).
- `/proveedor [serie]`: Proporciona datos de contacto y contrato de la empresa externa.

### Inteligencia Natural (Copilot Local)
- **Activación**: Mensajes de más de 3 palabras que no empiecen con `/`.
- **Procesamiento**: El mensaje se envía a **Gemma 3** (Ollama) on-premise.
- **Ejemplo**: "Como está el estatus de la incubadora del piso 3?" → El bot responde analizando la base de datos a través de la IA.

## 3. Integración de Servicios Externos
- **Llamadas a Empresa**: El bot presenta la información crítica para que el ingeniero pueda realizar el reporte telefónico inmediato.
- **Seguimiento**: Cada cambio de estatus vía WhatsApp genera una **Alerta** en el Dashboard web para auditoría del Jefe de Biomédica.

## 4. Requisitos de Ejecución
- **FastAPI Backend**: Corriendo en puerto 8000.
- **Ollama**: Corriendo localmente con el modelo `gemma` descargado.
- **Node.js**: Para el servicio del Bot en `sigab-bot`.

---
*Hospital General Regional No. 1 — IMSS Tijuana*
*Equipo de Bioingeniería — SIGAB*
