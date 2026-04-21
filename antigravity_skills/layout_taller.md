# Skill: Diseño Conceptual del Taller de Integración SIGAB

## Goal
Generar el diseño conceptual y espacial completo del Taller de Integración SIGAB, especificando sus 4 áreas divisorias obligatorias (Desarrollo, Gestión, Pruebas y Soporte Técnico), incluyendo distribución física, equipamiento mínimo por área, flujo de trabajo entre áreas, y criterios de diseño para un entorno on-premise hospitalario bajo restricción de consumo energético de 15 vatios en el servidor de producción.

## Instructions

1. **Plano Conceptual (ASCII Art + Descripción)**
   Genera un plano de planta rectangular del taller con las 4 áreas claramente delimitadas. El layout debe optimizar:
   - Flujo de trabajo: Desarrollo → Pruebas → Gestión → Soporte (sentido de madurez del proceso)
   - Acceso físico: Soporte Técnico con puerta independiente para entrada de equipos biomédicos
   - Cableado estructurado: zona de servidores en pared norte (alejado de humedad)
   - Iluminación: zona de Pruebas con luz natural preferente (diagnóstico visual de equipos)

2. **4 Áreas Obligatorias — Especificación Detallada**

   **Área 1 — DESARROLLO (30% del espacio)**
   - Función: Programación del backend FastAPI, frontend React, mantenimiento del SIGAB core
   - Equipamiento mínimo: 2 workstations (16 GB RAM, SSD NVMe), 2 monitores duales, servidor de desarrollo local (Lenovo M720q o equivalente), switch gestionable 8 puertos
   - Mobiliario: escritorios anti-estática, sillas ergonómicas, pizarrón blanco para arquitectura
   - Conectividad: VLAN de desarrollo aislada de producción
   - Software ambiente: VS Code + Claude Code CLI, Docker Desktop, MySQL Workbench, Postman

   **Área 2 — GESTIÓN (20% del espacio)**
   - Función: Administración del sistema, capacitación de usuarios, reportes NOM-016/NOM-240, coordinación con dirección hospitalaria
   - Equipamiento mínimo: 1 workstation administrativa, impresora láser A4, impresora de etiquetas (para QR en formato A6), scanner de documentos
   - Mobiliario: escritorio ejecutivo, mesa de reuniones para 4 personas, pantalla de presentación 55"
   - Herramientas: Dashboard SIGAB en modo TV (TVDashboard.jsx), generación de reportes PDF/Excel

   **Área 3 — PRUEBAS (35% del espacio)**
   - Función: Validación de equipos biomédicos antes del alta en SIGAB, prueba del flujo Poka-Yoke completo (QR → NII → Serie), integración de escáneres Zebra, pruebas de carga y rendimiento
   - Equipamiento mínimo: Mesa de trabajo anti-estática (2m × 1m), escáner inalámbrico 2D Zebra (modelo DS2208 o similar), tablet Android para pruebas de UI móvil, multímetro, analizador de redes eléctrica (para equipos clase I COFEPRIS), banco de pruebas con equipos biomédicos de muestra
   - Conectividad: Punto de acceso WiFi dedicado para pruebas de escaneo inalámbrico
   - Iluminación: Mínimo 500 lux (lectura de etiquetas y códigos QR)

   **Área 4 — SOPORTE TÉCNICO (15% del espacio)**
   - Función: Reparación de equipos biomédicos de bajo nivel, atención a incidencias del sistema SIGAB, primera línea de soporte para personal hospitalario
   - Equipamiento mínimo: Mesa de trabajo con tornillo de banco, herramientas de electrónica básica, osciloscopio, fuente de poder regulable, armario de piezas etiquetadas con QR SIGAB
   - Acceso: Puerta directa al pasillo hospitalario (entrada de equipos sin interrumpir áreas de desarrollo)
   - Almacenamiento: Rack de 4U para servidor de producción (Lenovo M720q) con UPS de 650VA

3. **Flujo de Trabajo Inter-Áreas**
   Describe el proceso de un equipo biomédico desde su ingreso hasta su alta en producción:
   ```
   [Entrada física] → SOPORTE (recepción, diagnóstico)
        ↓
   PRUEBAS (alta en SIGAB, validación Poka-Yoke, QR generado)
        ↓
   GESTIÓN (aprobación administrativa, asignación de servicio hospitalario)
        ↓
   DESARROLLO (si requiere customización de alertas o integración especial)
        ↓
   [Despliegue en piso hospitalario] → monitoreado desde GESTIÓN vía Dashboard
   ```

4. **Restricciones Energéticas**
   - Servidor de producción (M720q): máximo 15W consumo real (validar con medidor de consumo)
   - UPS en Área de Soporte dimensionado para: servidor (15W) + switch (20W) + router (10W) = 45W → UPS 650VA suficiente con 8h de autonomía
   - Aire acondicionado: no requerido por baja disipación del M720q, ventilación natural suficiente
   - Iluminación LED exclusivamente, sensores de movimiento en áreas de uso intermitente

5. **Entregables Esperados**
   - Plano ASCII del layout (mínimo 40×20 caracteres)
   - Tabla de equipamiento por área (Área | Ítem | Cantidad | Costo estimado MXN | Prioridad)
   - Diagrama de flujo de trabajo inter-áreas (Mermaid o texto estructurado)
   - Lista de verificación de instalación (checklist 20 ítems)
   - Estimación de superficie total recomendada en m²

## Examples

**Input esperado:**
```
Espacio disponible: sala de ~40 m² en hospital
Restricción energética: servidor 15W máximo
Personal: 2 ingenieros biomédicos + 1 técnico
Equipos a gestionar: ~1,000 activos biomédicos
```

**Output esperado (fragmento plano ASCII):**
```
┌─────────────────────────────────────────────────────┐
│  ÁREA DESARROLLO (30%)  │  ÁREA GESTIÓN (20%)        │
│  ┌──────┐ ┌──────┐      │  ┌───────────────────────┐│
│  │ WS1  │ │ WS2  │      │  │  Pantalla 55" + Mesa   ││
│  └──────┘ └──────┘      │  └───────────────────────┘│
│  [Pizarrón] [Switch]    │  [Impresora A4 + Etiq.]   │
├─────────────────────────┼───────────────────────────┤
│  ÁREA PRUEBAS (35%)     │  SOPORTE TÉCNICO (15%)    │
│  ┌───────────────────┐  │  ┌────────────────┐ [UPS] │
│  │ Mesa anti-estática│  │  │ Mesa trabajo   │ [Rack]│
│  │ [Zebra Scanner]   │  │  │ [Herramientas] │       │
│  └───────────────────┘  │  └────────────────┘  [←puerta]│
└─────────────────────────────────────────────────────┘
```

## Constraints

- El layout DEBE incluir exactamente 4 áreas: Desarrollo, Gestión, Pruebas, Soporte Técnico. No añadir ni fusionar áreas.
- La restricción de 15W del servidor de producción es INQUEBRANTABLE — no proponer hardware que exceda este límite para el servidor principal.
- Los porcentajes de distribución de espacio son orientativos (±5%), ajustables a la geometría real del espacio disponible.
- No incluir en el diseño: oficinas administrativas generales del hospital, áreas de pacientes, cocinas o sanitarios.
- El escáner Zebra 2D inalámbrico es equipamiento OBLIGATORIO en Área de Pruebas — no sustituir por escáner de smartphone.
- Todos los precios estimados en MXN (pesos mexicanos 2026). Marcar como `[estimado]` si no son datos verificados.
- El diseño debe ser implementable en un hospital bajo normas de construcción hospitalaria mexicana (NOM-001-CONAGUA, protocolos de bioseguridad).
