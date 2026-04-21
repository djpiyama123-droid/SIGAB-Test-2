# Manual Técnico de Instalación y Mantenimiento — SIGAB

## 1. Requisitos del Sistema
- **S.O.**: Windows 10/11 o Ubuntu Server (WSL2 recomendado en Windows).
- **Hardware**: Mínimo 8GB RAM (para Ollama/Gemma) y procesador con soporte de virtualización.
- **Software**:
    - Python 3.10+
    - Node.js 18+
    - MySQL Server 8.0
    - Ollama (para IA Local)

## 2. Estructura del Código
- `/sigab-backend`: API REST construida con FastAPI.
    - `/routes`: Lógica de negocio por módulo (Tecnovigilancia, Almacén, Copilot).
    - `/services`: Servicios de apoyo (PDF, Mail, Fiabilidad/KPIs, Gemma).
    - `main.py`: Punto de entrada de la API.
- `/sigab-frontend`: Aplicación SPA con React + Vite + Tailwind CSS.
    - `/src/pages`: Vistas premium del sistema.
    - `/src/api`: Cliente de conexión a la API.
- `/sigab-bot`: Agente de WhatsApp basado en Baileys.
    - `index.js`: Listener de mensajes.
    - `commands.js`: Router de comandos y lógica de respuesta AI.

## 3. Base de Datos
El esquema se encuentra en `sigab_schema.sql`. 
- **Tablas principales**: `equipos`, `ordenes_servicio`, `tecnovigilancia_eventos`, `refacciones_almacen`, `trazabilidad`.
- **Vistas**: `v_dashboard_equipos` simplifica las consultas del frontend.
- **Triggers**: Automatizan el cambio de estado de equipos al abrir/cerrar tickets.

## 4. Comandos de Arranque
Para iniciar el sistema completo en Windows, use:
```powershell
./start_sigab.ps1
```

Para detener los servicios:
```powershell
./stop_sigab.ps1
```

## 5. Integración IA Local
SIGAB utiliza **Ollama** con el modelo **Gemma**.
Asegúrese de ejecutar:
```bash
ollama pull gemma
```
El backend se comunica vía `http://localhost:11434`.
