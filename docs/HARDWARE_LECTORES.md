# HARDWARE — Lectores QR Pistola compatibles con SIGAH

Guía de selección, configuración y troubleshooting de lectores QR tipo pistola
compatibles con el módulo **Pistola QR** (`/scan-gun`) de SIGAH.

---

## 1. Modelos recomendados

| Modelo | Conector | Tipo | Precio MXN aprox. | Donde comprar |
|--------|----------|------|-------------------|---------------|
| **Zebra DS2208-SR** | USB / HID | 2D imager (QR + barcode) | $1,200 – $1,800 | Steren, Cyberpuerta, Office Depot |
| **Honeywell Voyager 1450g** | USB / HID | 2D imager | $1,800 – $2,500 | Cyberpuerta, MercadoLibre |
| **Datalogic QuickScan QD2430** | USB / HID | 2D imager | $1,500 – $2,200 | Cyberpuerta, distribuidor industrial |
| **Símbol/Zebra LI4278** | Bluetooth + cradle | 1D + 2D imager | $2,500 – $3,500 | MercadoLibre, distribuidor industrial |
| **Genérico chino USB 2D** | USB / HID | 2D imager | $400 – $900 | MercadoLibre, AliExpress |

**Para el kit estándar SIGAH se recomienda Zebra DS2208-SR**: relación precio/calidad,
soporte en México, lectura confiable de QR sucio/dañado.

---

## 2. Cómo funciona el modo HID

Todos los lectores listados arriba operan en modo **HID (Human Interface Device)**:
desde el sistema operativo se comportan como un teclado USB que "escribe" el contenido
del QR seguido de un sufijo (típicamente `Enter` / `CR`).

```
Usuario apunta + presiona gatillo
   ↓
Lector decodifica QR  →  "https://sigah.mx/equipo/abc123def456"
   ↓
Lector emite cada carácter al SO como si fuera teclado
   ↓
   <input> en SIGAH captura el texto
   ↓
Sufijo Enter dispara el lookup
```

No requiere driver adicional en Windows, macOS ni Linux.

---

## 3. Configuración crítica del lector

### 3.1 Sufijo Enter (obligatorio)

El lector debe estar configurado para enviar **CR (Carriage Return / Enter)** al
final de cada lectura. Sin esto, el `<input>` de SIGAH no dispara el lookup.

**Zebra DS2208-SR** — escanear este código de configuración del manual:

```
1. Escanear:  <Enable Enter Key (Carriage Return)>
2. Escanear:  <Save Settings>
```

**Honeywell Voyager 1450g**:

```
1. Escanear:  <Default Settings>
2. Escanear:  <Add CR Suffix>
```

**Datalogic QuickScan QD2430** — desde QuickSet (utility):

```
Postamble → Enable → CR
```

**Genéricos chinos** — vienen con sufijo Enter por default. Verificar abriendo
un Notepad: cada escaneo debe terminar con salto de línea.

### 3.2 Prefijo (opcional, recomendado para SIGAH)

Configurar prefijo `SIGAH:` permite al frontend distinguir lecturas del lector
físico vs. texto pegado manualmente. **Opcional** — el frontend funciona sin esto.

### 3.3 Modo de lectura

- **Trigger Mode** (gatillo manual): recomendado en taller de biomédica
- **Auto-Sense Mode** (cuna): recomendado para área de recepción/inventario

---

## 4. Verificación del lector

### Test rápido (sin SIGAH)

1. Conectar el lector USB a la PC
2. Abrir un editor de texto vacío (Notepad, VSCode)
3. Escanear cualquier QR existente del hospital
4. Resultado esperado:
   - El contenido del QR aparece como texto
   - Aparece un salto de línea al final
   - El cursor queda en la línea siguiente

Si **no aparece salto de línea**, reconfigurar el sufijo Enter (sección 3.1).

### Test en SIGAH

1. Iniciar sesión en SIGAH
2. Navegar a **Pistola QR** (sidebar)
3. Asegurarse de que aparece el texto "Escuchando lector" con el indicador verde
4. Escanear un QR de equipo
5. Resultado esperado: tarjeta verde de match con datos del equipo en ≤ 1 segundo

---

## 5. Troubleshooting

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Escaneo no abre la ficha | Falta sufijo Enter | Reconfigurar lector según sección 3.1 |
| Texto aparece duplicado | Modo de salida en "USB Keyboard" + "USB COM" | Solo modo HID Keyboard |
| Caracteres especiales mal decodificados | Layout de teclado del SO ≠ layout del lector | Cambiar layout del lector a Latin-American o ES-MX |
| Lectura intermitente | QR dañado o iluminación pobre | Sustituir placa o aumentar iluminación |
| 404 "Sin coincidencia" | QR de un sistema antiguo (no SIGAH) | Verificar que el QR fue generado por SIGAH (`/qrbatch`) |
| Captura no enfocada | Otra ventana robó el foco | Hacer click en cualquier parte de la página /scan-gun |
| Modo kiosco no entra fullscreen | Browser bloqueó la API | Permitir fullscreen para sigah.mx en el navegador |

---

## 6. Codigos QR aceptados por SIGAH

El endpoint `/api/equipos/lookup` resuelve por estos formatos (en orden):

1. **URL completa SIGAH**:
   `https://sigah.mx/equipo/abc123def456`
   → Extrae el token y busca por `qr_token`

2. **Token opaco**:
   `abc123def456`
   → Busca directamente por `qr_token`

3. **Serie del equipo**:
   `SN-2024-12345`
   → Busca por `serie` exacta

4. **Inventario IMSS**:
   `INV-HGR1-001234`
   → Busca por `inventario` exacto

Si el lector escanea cualquiera de los 4, abre la ficha. Si no hay match,
muestra el código escaneado y permite intentar de nuevo.

---

## 7. Recomendación de uso en hospital

### Taller de biomédica (modo kiosco)

- 1 PC dedicada con SIGAH abierto en `/scan-gun?modo=kiosco`
- 1 lector Zebra DS2208 en cuna magnética
- Pantalla 24" — fácil ver desde la mesa de reparación
- Cada equipo que entra al taller se escanea → se crea automáticamente
  la orden de servicio con `equipo_id` precargado

### Recepción / Almacén

- 1 lector inalámbrico (Zebra LI4278 con cradle Bluetooth)
- Recibe equipos nuevos, los escanea para verificar inventario contra OC
- Si el QR no existe en SIGAH → flujo de alta nueva

### Auditoría de campo

- Lector USB con laptop o tablet con USB-C
- Recorrido por áreas: cada equipo se escanea para verificar ubicación
  registrada vs. ubicación física
- Output del módulo: lista de discrepancias

---

## 8. Compra recomendada para arranque

**Kit mínimo SIGAH (1 hospital):**

| Item | Cantidad | Costo unitario MXN | Total |
|------|----------|-------------------|-------|
| Zebra DS2208-SR USB | 1 | $1,400 | $1,400 |
| Cuna magnética DS2208 | 1 | $350 | $350 |
| Cable USB Type A extendido 3m | 1 | $120 | $120 |
| **Total** | | | **$1,870** |

**Kit ampliado (taller + recepción):**

| Item | Cantidad | Costo unitario MXN | Total |
|------|----------|-------------------|-------|
| Zebra DS2208-SR (USB para taller) | 1 | $1,400 | $1,400 |
| Zebra LI4278 + cradle (Bluetooth para campo) | 1 | $3,200 | $3,200 |
| Cunas + cables | 2 | $400 | $800 |
| **Total** | | | **$5,400** |

---

## 9. Referencias

- Zebra DS2208 Product Reference Guide: `zebra.com/us/en/support-downloads/scanners/general-purpose-scanners/ds2208.html`
- Honeywell Voyager 1450g User's Guide: `honeywell.com`
- Datalogic QuickScan QD2430 Quick Reference: `datalogic.com`
- HID Keyboard mode standard: USB HID 1.11 spec

---

**Última actualización:** 2026-05-26 — Implementación inicial módulo `/scan-gun`
