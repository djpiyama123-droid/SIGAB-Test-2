# Diagramas de Flujo y Arquitectura — SIGAB

Este documento recopila los diagramas lógicos y de flujo que rigen el sistema SIGAB en el HGR No. 1.

## 1. Flujo Operativo de Ingeniería Clínica
Este diagrama describe cómo una falla se convierte en un ticket y cómo el bot interviene.

```mermaid
graph TD
    A[Falla en Equipo] --> B{¿Es crítica?}
    B -- Sí --> C[Reporte WhatsApp / Alerta Roja]
    B -- No --> D[Reporte Ordinario Dashboard]
    C --> E[Asignación Inmediata]
    D --> E
    E --> F[Ejecución de Servicio]
    F --> G{¿Requiere Refacción?}
    G -- Sí --> H[Vale de Almacén SIGAB]
    G -- No --> I[Cierre de Orden]
    H --> I
    I --> J[Generación de PDF IMSS]
    J --> K[Notificación de Cierre]
```

## 2. Diagrama de Implementación On-Premise (Arquitectura)
Estructura de hardware y software local.

```mermaid
graph LR
    subgraph "Lenovo ThinkCentre Server"
        DB[(MySQL 8.0)]
        API[FastAPI Backend]
        LLM[Ollama + Gemma 3]
        WEB[React Frontend]
    end
    
    subgraph "Dispositivos Médicos"
        QR[Códigos QR]
    end
    
    subgraph "Usuarios"
        WPP[WhatsApp Bot]
        PC[Navegador Desktop]
    end

    QR --> WPP
    WPP --> API
    API --> DB
    API --> LLM
    PC --> WEB
    WEB --> API
```

## 3. Ciclo de Vida de Tecnovigilancia (NOM-240)
Gestión de eventos adversos.

```mermaid
stateDiagram-v2
    [*] --> Reportado
    Reportado --> EnInvestigacion: Acción Bioingenería
    EnInvestigacion --> Documentado
    Documentado --> EscaladoCOFEPRIS: Si es grave/crítico
    EscaladoCOFEPRIS --> Cerrado
    Documentado --> Cerrado
    Cerrado --> [*]
```
