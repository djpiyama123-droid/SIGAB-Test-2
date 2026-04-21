# Manual de Usuario SIGAB: Bot de WhatsApp e IA Copilot

## 1. El Agente de WhatsApp
El Bot permite gestionar el hospital sin necesidad de estar frente a una computadora.

### Comandos Disponibles
| Comando | Función | Ejemplo |
|---------|---------|---------|
| `/ayuda` | Muestra el menú de opciones | `/ayuda` |
| `/equipo [serie]` | Consulta estatus e historial | `/equipo SK41638` |
| `/estado [serie] [estado]` | Cambia el estado (operativo, fuera_servicio) | `/estado SK416 fuera_servicio` |
| `/ticket [falla]` | Abre una orden de servicio | `/ticket Monitor no enciende` |
| `/pdf [serie]` | Recibe el reporte PDF IMSS | `/pdf SK41638` |
| `/email [serie] [correo]` | Envía el reporte a un correo | `/email SK416 user@gmail.com` |
| `/proveedor [serie]` | Info de contrato y empresa externa | `/proveedor SK416` |

## 2. SIGAB Copilot (IA Local)
El Copilot es un asistente basado en lenguaje natural accesible desde el Dashboard y WhatsApp.

### Capacidades
- **Diagnóstico sugerido**: "Tengo un desfibrilador que no carga las palas, ¿qué puede ser?"
- **Resumen Ejecutivo**: El jefe de biomédica puede pedir un resumen del día ("Generar resumen del día").
- **Consultas NOM**: Preguntas sobre normatividad (NOM-016, NOM-240).
- **Análisis de Fiabilidad**: Interpreta métricas MTBF y MTTR para sugerir reemplazos de equipos.

## 3. Seguridad de Datos
Toda la información procesada por la IA **no sale del servidor del hospital**. No se utilizan APIs de nube (como ChatGPT o Gemini Cloud), garantizando la privacidad absoluta de los datos de los pacientes y equipos del HGR No. 1.
