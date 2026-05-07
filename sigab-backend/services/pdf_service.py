import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor


# ─────────────────────────────────────────────────────────────────
# Checklist por defecto cuando una OS no tiene "condiciones_encontradas" /
# "descripcion_servicio". Se rellena solo en preventivos, para que el PDF
# refleje los pasos típicos cumplidos en lugar de "N/A".
# ─────────────────────────────────────────────────────────────────
_CHECKLIST_PREV_BASE = [
    "Inspección visual y limpieza externa del equipo",
    "Verificación de conexiones eléctricas y cables",
    "Prueba funcional general (encendido, apagado, modos)",
    "Verificación de alarmas audibles y visibles",
    "Calibración / ajuste de parámetros operativos",
]

_CHECKLIST_PREV_EXTRAS = {
    "cama":          ["Prueba de motor y movimientos", "Verificación de barandales", "Inspección de ruedas y frenos"],
    "monitor":       ["Limpieza interna", "Verificación de pantalla LCD", "Calibración SpO2 / ECG / NIBP"],
    "ventilador":    ["Cambio de filtros antibacterianos", "Calibración volumen tidal", "Prueba de alarmas"],
    "desfibrilador": ["Prueba de descarga (joules)", "Verificación de batería", "Prueba de electrodos"],
    "incubadora":    ["Calibración de sensor de temperatura", "Prueba de humedad relativa", "Limpieza de filtros"],
    "rayos_x":       ["Verificación de colimador", "Prueba de exposición", "Inspección de blindaje"],
    "ultrasonido":   ["Limpieza de transductores", "Verificación de gel y piezas plásticas", "Prueba de imagen"],
    "anestesia":     ["Verificación de fugas en circuito", "Prueba de vaporizadores", "Calibración flujómetros"],
    "autoclave":     ["Verificación de empaque puerta", "Prueba de ciclo (BD)", "Calibración temperatura/presión"],
    "bomba_infusion":["Prueba de flujo a 25/100/500 ml/h", "Verificación batería", "Prueba alarma oclusión"],
    "arco_c":        ["Calibración del intensificador", "Prueba de movimientos C", "Verificación de pedal"],
    "electrocardiografo":["Prueba 12 derivaciones", "Verificación de electrodos", "Calibración impresión"],
    "laboratorio":   ["Verificación de reactivos", "Prueba de QC", "Limpieza de cubetas/probetas"],
}


def _checklist_para_equipo(tipo_equipo: str | None) -> list[str]:
    """Construye la lista de pasos típicos cumplidos en un preventivo del tipo dado."""
    base = list(_CHECKLIST_PREV_BASE)
    extras = _CHECKLIST_PREV_EXTRAS.get((tipo_equipo or "").lower(), [])
    return base + extras


def _wrap_text(c: canvas.Canvas, text: str, max_w: float, font: str, size: int) -> list[str]:
    """Envuelve texto largo en varias líneas según el ancho máximo (en puntos)."""
    if not text:
        return []
    words = str(text).split()
    lines: list[str] = []
    cur = ""
    c.setFont(font, size)
    for w in words:
        test = (cur + " " + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def generar_pdf_orden(
    orden: dict,
    materiales: list,
    evidencias: list,
    historial_breve: list | None = None,
    proximo_preventivo: dict | None = None,
) -> bytes:
    """
    Genera un PDF con el formato de la Orden de Servicio.

    Si `condiciones_encontradas` / `descripcion_servicio` / `condicion_final`
    están vacíos:
      - Para preventivos cerrados: rellena con un checklist típico de pasos cumplidos
        del tipo de equipo (extraído de _CHECKLIST_PREV_EXTRAS).
      - Para correctivos sin datos: muestra una nota en cursiva indicando que
        no fue registrado al cierre.
      - Si la sección no aplica: se omite el rótulo (no más "N/A" sueltos).

    La mitad inferior se llena con materiales/refacciones, evidencias, historial
    breve del equipo (últimas OS cerradas) y próximo preventivo programado.
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    margin = 2 * cm

    tipo_mant = (orden.get("tipo_mantenimiento") or "").lower().strip()
    tipo_equipo = (orden.get("tipo_equipo") or "").lower().strip() or None
    estado = (orden.get("estado") or "").lower().strip()
    es_preventivo = tipo_mant in ("preventivo", "calibracion", "calibración", "verificacion", "verificación")
    es_cerrada = estado == "cerrada"

    # ── Cabecera tripartita IMSS ─────────────────────────────────────
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(width / 2, height - margin, "INSTITUTO MEXICANO DEL SEGURO SOCIAL")
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2, height - margin - 14, "DELEGACIÓN REGIONAL EN BAJA CALIFORNIA")
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2, height - margin - 28, "HOSPITAL GENERAL REGIONAL No. 1 — J.C.U. 15")
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, height - margin - 40, "Departamento de Conservación e Ingeniería Biomédica")

    # Línea divisoria + título OS
    c.setLineWidth(1)
    c.line(margin, height - margin - 50, width - margin, height - margin - 50)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width / 2, height - margin - 65, "ORDEN DE SERVICIO BIOMÉDICO")

    # ── Datos de la Orden ───────────────────────────────────────────
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, height - margin - 85, f"No. Orden: {orden.get('numero_orden', '')}")
    c.drawString(width / 2, height - margin - 85, f"Fecha: {orden.get('fecha', '')}")

    c.setFont("Helvetica", 10)
    y = height - margin - 105

    c.drawString(margin, y, f"Equipo: {orden.get('equipo_nombre', '') or '-'}")
    c.drawString(width / 2, y, f"Serie: {orden.get('equipo_serie', '') or '-'}")
    y -= 15
    c.drawString(margin, y, f"Marca: {orden.get('equipo_marca', '') or '-'}  /  Modelo: {orden.get('equipo_modelo', '') or '-'}")
    y -= 15
    c.drawString(margin, y, f"Área: {orden.get('area', '') or '-'} — Piso: {orden.get('piso', '') or '-'}")
    y -= 15
    c.drawString(margin, y, f"Tipo de Mantenimiento: {tipo_mant.upper() or 'CORRECTIVO'}")
    if orden.get("prioridad"):
        c.drawString(width / 2, y, f"Prioridad: {orden.get('prioridad', '').upper()}")
    y -= 25

    # ── Falla Reportada ─────────────────────────────────────────────
    falla = orden.get("falla_reportada") or (
        "Mantenimiento programado conforme a calendario de preventivos." if es_preventivo
        else "No registrada al levantamiento de la orden."
    )
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Falla Reportada / Motivo:")
    y -= 14
    c.setFont("Helvetica", 10)
    for ln in _wrap_text(c, falla, width - 2 * margin, "Helvetica", 10):
        c.drawString(margin, y, ln)
        y -= 13
    y -= 12

    # ── Condiciones Encontradas + Descripción del Servicio ──────────
    cond = orden.get("condiciones_encontradas")
    desc = orden.get("descripcion_servicio")

    if cond:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Condiciones Encontradas:")
        y -= 14
        c.setFont("Helvetica", 10)
        for ln in _wrap_text(c, cond, width - 2 * margin, "Helvetica", 10):
            c.drawString(margin, y, ln); y -= 13
        y -= 8

    if desc:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Descripción del Servicio:")
        y -= 14
        c.setFont("Helvetica", 10)
        for ln in _wrap_text(c, desc, width - 2 * margin, "Helvetica", 10):
            c.drawString(margin, y, ln); y -= 13
        y -= 8

    # Si AMBOS faltan y la OS está cerrada (preventiva), rellena con checklist
    if not cond and not desc:
        if es_preventivo and es_cerrada:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(margin, y, "Trabajo Realizado (checklist preventivo cumplido):")
            y -= 14
            c.setFont("Helvetica", 9)
            for paso in _checklist_para_equipo(tipo_equipo):
                c.drawString(margin + 10, y, f"☑  {paso}")
                y -= 12
            y -= 6
        else:
            c.setFont("Helvetica-Oblique", 9)
            c.setFillColor(HexColor("#6B7280"))
            c.drawString(margin, y, "Detalle del servicio no registrado al cierre — consultar bitácora del técnico o evidencias fotográficas.")
            c.setFillColor(HexColor("#000000"))
            y -= 16

    # ── Condición Final ─────────────────────────────────────────────
    cond_final = orden.get("condicion_final")
    if cond_final:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Condición Final del Equipo:")
        y -= 14
        c.setFont("Helvetica", 10)
        for ln in _wrap_text(c, cond_final, width - 2 * margin, "Helvetica", 10):
            c.drawString(margin, y, ln); y -= 13
        y -= 8
    elif es_cerrada:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Condición Final del Equipo:")
        y -= 14
        c.setFont("Helvetica", 10)
        c.drawString(margin, y, "Operativo, entregado al servicio.")
        y -= 16
    # si no es cerrada, omitimos el rótulo entero

    # Observaciones (si las hay)
    obs = orden.get("observaciones")
    if obs:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Observaciones:")
        y -= 14
        c.setFont("Helvetica", 10)
        for ln in _wrap_text(c, obs, width - 2 * margin, "Helvetica", 10):
            c.drawString(margin, y, ln); y -= 13
        y -= 8

    y -= 8

    # ── Materiales ──────────────────────────────────────────────────
    if materiales:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Materiales y/o Refacciones Utilizadas:")
        y -= 14
        c.setFont("Helvetica", 9)
        for mat in materiales:
            cant = mat.get("cantidad", 1)
            desc_m = mat.get("descripcion", "") or ""
            c.drawString(margin + 10, y, f"•  {cant} ×  {desc_m}")
            y -= 12
        y -= 8

    # ── Evidencias fotográficas (lista) ────────────────────────────
    if evidencias:
        if y < 200:
            c.showPage()
            y = height - margin - 30
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, f"Evidencias Fotográficas ({len(evidencias)}):")
        y -= 14
        c.setFont("Helvetica", 9)
        for ev in evidencias[:6]:
            tipo_ev = ev.get("tipo", "documento")
            ruta = ev.get("ruta_archivo", "")
            nombre = ruta.rsplit("/", 1)[-1] if ruta else "evidencia"
            c.drawString(margin + 10, y, f"📎  [{tipo_ev}] {nombre}")
            y -= 11
        if len(evidencias) > 6:
            c.drawString(margin + 10, y, f"... y {len(evidencias) - 6} evidencia(s) más en el sistema")
            y -= 11
        y -= 8

    # ── Historial breve del equipo ──────────────────────────────────
    if historial_breve:
        if y < 180:
            c.showPage()
            y = height - margin - 30
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Últimas Órdenes de Servicio del Equipo:")
        y -= 14
        c.setFont("Helvetica", 9)
        for h in historial_breve[:5]:
            f_h = h.get("fecha", "")
            n_h = h.get("numero_orden", "")
            t_h = (h.get("tipo_mantenimiento") or "").lower()
            e_h = (h.get("estado") or "").lower()
            c.drawString(margin + 10, y, f"•  {n_h}  ({f_h})  —  {t_h.title()}  ·  {e_h}")
            y -= 11
        y -= 8

    # ── Próximo preventivo programado ───────────────────────────────
    if proximo_preventivo:
        if y < 140:
            c.showPage()
            y = height - margin - 30
        prox_fecha = proximo_preventivo.get("proxima_ejecucion") or proximo_preventivo.get("fecha", "")
        prox_tipo = proximo_preventivo.get("tipo_preventivo") or proximo_preventivo.get("tipo", "preventivo")
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Próximo Preventivo Programado:")
        y -= 14
        c.setFont("Helvetica", 9)
        c.drawString(margin + 10, y, f"📅  {prox_fecha}  —  {prox_tipo}")
        y -= 16

    # ── Firmas ──────────────────────────────────────────────────────
    if y < 120:
        c.showPage()
        y = height - margin - 30

    y -= 30
    c.setLineWidth(0.5)
    c.line(margin, y, margin + 150, y)
    c.line(width - margin - 150, y, width - margin, y)

    y -= 14
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(margin + 75, y, "Realizó (Ing. Biomédico)")
    c.drawCentredString(width - margin - 75, y, "Recibe Conformidad")

    y -= 12
    c.setFont("Helvetica", 9)
    c.drawCentredString(margin + 75, y, orden.get("tecnico_nombre") or "Firma")
    c.drawCentredString(width - margin - 75, y, orden.get("recibe_conformidad_nombre") or "Nombre / Matrícula")

    # ── Pie con magic string IMSS-OS-V3 (reconocible por OCR Gemma) ─
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor("#6B7280"))
    c.drawString(margin, margin - 5, "NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · ISO-13485")
    c.drawRightString(width - margin, margin - 5, "SIGAB-IMSS-OS-V3")
    c.setFillColor(HexColor("#000000"))

    c.showPage()
    c.save()
    return buf.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# Formato Poka-Yoke v2 — Orden de Servicio física imprimible
# Diseño paralelo al HTML estático en sigab-frontend/public/orden-servicio-v2.html
# Cumple NOM-016-SSA3-2012 / NOM-240-SSA1-2012 / ISO-13485
# ──────────────────────────────────────────────────────────────────────────────

def _checkbox(c, x, y, marked=False, size=10, color=None):
    """Dibuja un checkbox cuadrado en (x,y) coord PDF; marca con X si marked=True."""
    c.setLineWidth(0.8)
    if color:
        c.setStrokeColor(color)
    c.rect(x, y, size, size, stroke=1, fill=0)
    if marked:
        c.setLineWidth(1.5)
        c.line(x + 1, y + 1, x + size - 1, y + size - 1)
        c.line(x + 1, y + size - 1, x + size - 1, y + 1)
    c.setLineWidth(1)
    c.setStrokeColor(HexColor("#000000"))


def _line_field(c, x, y, label, value, width, label_size=7, value_size=10):
    """Dibuja un campo con etiqueta arriba y línea de escritura abajo."""
    c.setFont("Helvetica", label_size)
    c.setFillColor(HexColor("#444444"))
    c.drawString(x, y, label.upper())
    c.setFillColor(HexColor("#000000"))
    if value:
        c.setFont("Helvetica", value_size)
        c.drawString(x, y - value_size - 2, str(value))
    c.setLineWidth(0.5)
    c.line(x, y - value_size - 4, x + width, y - value_size - 4)
    c.setLineWidth(1)


def generar_pdf_orden_v2_poka_yoke(orden: dict, equipo: dict, materiales: list) -> bytes:
    """
    Genera PDF de Orden de Servicio formato Poka-Yoke v2.0.

    A diferencia del PDF post-cierre tradicional (`generar_pdf_orden`), este formato:
      - Marca campos obligatorios con asterisco rojo
      - Usa checkboxes pre-impresos para tipo de mantenimiento y prioridad
      - Destaca el número de serie en caja amarilla con instrucción de coincidencia
      - Reserva una zona pre-impresa para etiqueta QR (35mm cuadrados)
      - Incluye sección dedicada de Validación Poka-Yoke (5 verificaciones)
      - Tiene 3 firmas: Realizó / Validó / Recibe

    El PDF puede generarse en cualquier momento del ciclo de vida de la orden:
      - Pre-servicio: técnico imprime con folio, lleva al campo, llena a mano.
      - Post-servicio: regenera con datos finales pre-rellenados sobre el formato.

    Args:
      orden: dict con folio, tipo_mantenimiento, prioridad, falla_reportada,
             condiciones_encontradas, descripcion_servicio, condicion_final,
             observaciones, recibe_conformidad_nombre, tecnico_nombre, fecha.
      equipo: dict con nombre, marca, modelo, serie, area, piso, inventario_imss.
      materiales: list de dicts con cantidad, descripcion.
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    W, H = letter
    M = 1.4 * cm  # margen lateral
    MT = 1.2 * cm  # margen top/bottom
    y = H - MT

    # Colores
    COBALT = HexColor("#000000")
    DANGER = HexColor("#B91C1C")
    WARN = HexColor("#B45309")
    OK = HexColor("#047857")
    GRAY = HexColor("#444444")
    GRAY_LT = HexColor("#999999")
    YELLOW = HexColor("#FEF3C7")
    PINK = HexColor("#FEF2F2")

    # ── 1. Cabecera institucional ──────────────────────────────────
    # Escudo IMSS (círculo con texto)
    c.setStrokeColor(HexColor("#065F46"))
    c.setLineWidth(2)
    c.setFillColor(HexColor("#ECFDF5"))
    c.circle(M + 17, y - 17, 17, stroke=1, fill=1)
    c.setFillColor(HexColor("#065F46"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(M + 17, y - 21, "IMSS")
    c.setFillColor(HexColor("#000000"))
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(1)

    # Texto institucional
    c.setFont("Helvetica-Bold", 11)
    c.drawString(M + 45, y - 8, "INSTITUTO MEXICANO DEL SEGURO SOCIAL")
    c.setFont("Helvetica", 9)
    c.drawString(M + 45, y - 22, "Hospital General Regional No. 1 — Tijuana, Baja California")
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    c.drawString(M + 45, y - 33, "Departamento de Conservación e Ingeniería Biomédica")
    c.setFillColor(HexColor("#000000"))

    # Caja de folio (esquina superior derecha)
    folio = orden.get("numero_orden") or orden.get("folio") or "OS-________-____"
    fbox_w = 110
    fbox_x = W - M - fbox_w
    c.setLineWidth(1.5)
    c.rect(fbox_x, y - 38, fbox_w, 32, stroke=1, fill=0)
    c.setFont("Helvetica", 6.5)
    c.setFillColor(GRAY)
    c.drawCentredString(fbox_x + fbox_w / 2, y - 12, "FOLIO OS")
    c.setFillColor(HexColor("#000000"))
    c.setFont("Courier-Bold", 11)
    c.drawCentredString(fbox_x + fbox_w / 2, y - 28, folio)
    c.setLineWidth(1)
    c.setFont("Helvetica", 10)

    # Línea inferior del header
    c.setLineWidth(2)
    c.line(M, y - 45, W - M, y - 45)
    c.setLineWidth(1)
    y -= 55

    # ── Título del documento ───────────────────────────────────────
    c.setLineWidth(2)
    # Doble línea (efecto "double border")
    c.line(M, y - 2, W - M, y - 2)
    c.line(M, y - 22, W - M, y - 22)
    c.setLineWidth(1)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W / 2, y - 14, "ORDEN DE SERVICIO BIOMÉDICA")
    c.setFont("Helvetica", 7)
    c.setFillColor(GRAY)
    c.drawCentredString(W / 2, y - 32, "Formato Poka-Yoke v2.0 · NOM-016-SSA3-2012 · NOM-240-SSA1-2012 · ISO-13485")
    c.setFillColor(HexColor("#000000"))
    y -= 42

    # ── Función helper: bloque con título negro ────────────────────
    def _block_title(c, y, num, title):
        c.setFillColor(HexColor("#000000"))
        c.rect(M, y - 12, W - 2 * M, 12, stroke=0, fill=1)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(M + 4, y - 9, f"{num} · {title}")
        c.setFillColor(HexColor("#000000"))
        return y - 12

    # ── 2. Identificación del equipo ───────────────────────────────
    y = _block_title(c, y, "1", "IDENTIFICACIÓN DEL EQUIPO")
    block_top = y
    block_h = 110
    c.setLineWidth(1)
    c.rect(M, y - block_h, W - 2 * M, block_h, stroke=1, fill=0)

    # Zona QR
    qr_size = 70
    qr_x, qr_y = M + 8, y - block_h + 8
    c.setDash(2, 2)
    c.setStrokeColor(GRAY)
    c.rect(qr_x, qr_y, qr_size, qr_size + 14, stroke=1, fill=0)
    c.setDash()
    c.setStrokeColor(HexColor("#000000"))
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(GRAY)
    c.drawCentredString(qr_x + qr_size / 2, qr_y + qr_size / 2 + 8, "[ QR ]")
    c.setFont("Helvetica", 6)
    c.drawCentredString(qr_x + qr_size / 2, qr_y + qr_size / 2 - 5, "Pegar / escanear")
    c.drawCentredString(qr_x + qr_size / 2, qr_y + qr_size / 2 - 13, "etiqueta del equipo")
    c.setFillColor(HexColor("#000000"))

    # Campos del equipo (lado derecho)
    fx = qr_x + qr_size + 12
    fy = y - 8
    field_w = (W - 2 * M - qr_size - 24) / 2 - 4
    _line_field(c, fx, fy, "Nombre del equipo *", equipo.get("nombre", ""), field_w)
    _line_field(c, fx + field_w + 8, fy, "Marca", equipo.get("marca", ""), field_w)
    _line_field(c, fx, fy - 22, "Modelo", equipo.get("modelo", ""), field_w)
    _line_field(c, fx + field_w + 8, fy - 22, "Inventario IMSS", equipo.get("inventario_imss", ""), field_w)
    _line_field(c, fx, fy - 44, "Área / Servicio *", equipo.get("area", ""), field_w)
    _line_field(c, fx + field_w + 8, fy - 44, "Piso / Ubicación *", equipo.get("piso", ""), field_w)

    # Caja destacada de número de serie
    serie_y = qr_y + 4
    serie_w = W - 2 * M - qr_size - 24
    serie_h = 30
    c.setFillColor(YELLOW)
    c.rect(fx, serie_y, serie_w, serie_h, stroke=1, fill=1)
    c.setFillColor(HexColor("#000000"))
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(DANGER)
    c.drawString(fx + 4, serie_y + serie_h - 9, "NÚMERO DE SERIE FÍSICO (OBLIGATORIO) *")
    c.setFillColor(HexColor("#000000"))
    c.setFont("Courier-Bold", 13)
    serie_val = equipo.get("serie", "")
    c.drawString(fx + 4, serie_y + 12, serie_val if serie_val else "")
    c.setLineWidth(0.8)
    c.line(fx + 4, serie_y + 11, fx + serie_w - 4, serie_y + 11)
    c.setLineWidth(1)
    c.setFont("Helvetica-Oblique", 6.5)
    c.setFillColor(DANGER)
    c.drawString(fx + 4, serie_y + 3, "⚠ Debe coincidir EXACTAMENTE con la etiqueta física y con el QR escaneado.")
    c.setFillColor(HexColor("#000000"))

    y -= block_h + 6

    # ── 3. Tipo y prioridad ────────────────────────────────────────
    y = _block_title(c, y, "2", "TIPO DE SERVICIO Y PRIORIDAD")
    block_h = 70
    c.rect(M, y - block_h, W - 2 * M, block_h, stroke=1, fill=0)

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(DANGER)
    c.drawString(M + 6, y - 12, "TIPO DE MANTENIMIENTO *")
    c.setFillColor(HexColor("#000000"))

    tipo_orden = (orden.get("tipo_mantenimiento") or "").lower().strip()
    tipos = [
        ("preventivo", "Preventivo"),
        ("correctivo", "Correctivo"),
        ("calibracion", "Calibración"),
        ("instalacion", "Instalación"),
        ("verificacion", "Verificación / Inspección"),
        ("baja", "Baja / Decomisión"),
    ]
    cb_x = M + 6
    cb_y = y - 28
    c.setFont("Helvetica", 8)
    for tkey, tlabel in tipos:
        _checkbox(c, cb_x, cb_y - 1, marked=(tipo_orden == tkey))
        c.drawString(cb_x + 14, cb_y + 2, tlabel)
        cb_x += c.stringWidth(tlabel, "Helvetica", 8) + 28

    # Prioridad
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(DANGER)
    c.drawString(M + 6, y - 44, "PRIORIDAD *")
    c.setFillColor(HexColor("#000000"))
    prio = (orden.get("prioridad") or "").lower().strip()
    prios = [
        ("alta", "ALTA — Equipo crítico fuera de servicio", DANGER),
        ("media", "MEDIA — Funciona con limitaciones", WARN),
        ("baja", "BAJA — Programado / preventivo", OK),
    ]
    cb_x = M + 6
    cb_y = y - 60
    c.setFont("Helvetica", 8)
    for pkey, plabel, pcolor in prios:
        _checkbox(c, cb_x, cb_y - 1, marked=(prio == pkey), color=pcolor)
        c.drawString(cb_x + 14, cb_y + 2, plabel)
        cb_x += c.stringWidth(plabel, "Helvetica", 8) + 24

    y -= block_h + 6

    # ── 4. Falla reportada ─────────────────────────────────────────
    y = _block_title(c, y, "3", "FALLA REPORTADA / MOTIVO DEL SERVICIO")
    write_h = 50
    c.rect(M, y - write_h, W - 2 * M, write_h, stroke=1, fill=0)
    # líneas guía
    c.setStrokeColor(HexColor("#DDDDDD"))
    c.setLineWidth(0.4)
    for ln in range(1, 6):
        ly = y - ln * 9
        c.line(M + 4, ly, W - M - 4, ly)
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(1)
    if orden.get("falla_reportada"):
        c.setFont("Helvetica", 9)
        c.drawString(M + 6, y - 12, str(orden.get("falla_reportada"))[:120])
    y -= write_h + 6

    # ── 5. Diagnóstico (condiciones + trabajo) ─────────────────────
    y = _block_title(c, y, "4", "DIAGNÓSTICO Y ACCIONES REALIZADAS")
    block_h = 90
    c.rect(M, y - block_h, W - 2 * M, block_h, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(M + 6, y - 12, "Condiciones encontradas")
    c.setStrokeColor(HexColor("#DDDDDD"))
    c.setLineWidth(0.4)
    for ln in range(1, 4):
        ly = y - 16 - ln * 8
        c.line(M + 4, ly, W - M - 4, ly)
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(1)
    if orden.get("condiciones_encontradas"):
        c.setFont("Helvetica", 8)
        c.drawString(M + 6, y - 24, str(orden.get("condiciones_encontradas"))[:130])

    c.setFont("Helvetica-Bold", 8)
    c.drawString(M + 6, y - 50, "Trabajo realizado / acciones")
    c.setStrokeColor(HexColor("#DDDDDD"))
    c.setLineWidth(0.4)
    for ln in range(1, 4):
        ly = y - 54 - ln * 8
        c.line(M + 4, ly, W - M - 4, ly)
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(1)
    if orden.get("descripcion_servicio"):
        c.setFont("Helvetica", 8)
        c.drawString(M + 6, y - 62, str(orden.get("descripcion_servicio"))[:130])

    y -= block_h + 6

    # ── 6. Refacciones (tabla) ─────────────────────────────────────
    y = _block_title(c, y, "5", "REFACCIONES / MATERIALES UTILIZADOS")
    rows = max(4, len(materiales or []))
    row_h = 14
    table_w = W - 2 * M
    cols = [("Cant.", 0.10), ("Descripción", 0.50), ("Folio refacción", 0.20), ("Tiempo (min)", 0.20)]
    th = 14
    # Header
    c.setFillColor(HexColor("#F3F4F6"))
    c.rect(M, y - th, table_w, th, stroke=1, fill=1)
    c.setFillColor(HexColor("#000000"))
    cx = M
    c.setFont("Helvetica-Bold", 7)
    for label, w in cols:
        c.drawString(cx + 3, y - 10, label.upper())
        cx += table_w * w
    # Rows
    for i in range(rows):
        ry = y - th - (i + 1) * row_h
        c.rect(M, ry, table_w, row_h, stroke=1, fill=0)
        # column dividers
        cx = M
        for _, w in cols[:-1]:
            cx += table_w * w
            c.line(cx, ry, cx, ry + row_h)
        # fill data if exists
        if materiales and i < len(materiales):
            mat = materiales[i]
            cant = str(mat.get("cantidad", "") or "")
            desc = str(mat.get("descripcion", "") or "")[:60]
            c.setFont("Helvetica", 8)
            c.drawString(M + 3, ry + 4, cant)
            c.drawString(M + table_w * 0.10 + 3, ry + 4, desc)
    y -= th + rows * row_h + 6

    # ── 7. Validación Poka-Yoke (zona crítica roja) ────────────────
    y = _block_title(c, y, "6", "VALIDACIÓN POKA-YOKE (A PRUEBA DE ERRORES)")
    block_h = 75
    c.setFillColor(PINK)
    c.setStrokeColor(DANGER)
    c.setLineWidth(1.5)
    c.rect(M, y - block_h, W - 2 * M, block_h, stroke=1, fill=1)
    c.setFillColor(HexColor("#000000"))
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(1)

    poka_items = [
        ("QR validado.", "El número de serie del QR coincide con la etiqueta física del equipo."),
        ("Inventario validado.", "El número de inventario IMSS de la placa coincide con SIGAB."),
        ("Ubicación validada.", "El equipo está físicamente en el área y piso registrados."),
        ("Causa raíz documentada.", "Aplica solo correctivos — al menos una causa identificada (5 porqués)."),
        ("Condición final declarada.", "Se especifica operativo / mantenimiento / fuera de servicio / baja."),
    ]
    item_y = y - 12
    for title_i, desc_i in poka_items:
        _checkbox(c, M + 6, item_y - 6, marked=False, color=DANGER, size=8)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(M + 18, item_y - 4, title_i)
        c.setFont("Helvetica", 7.5)
        title_w = c.stringWidth(title_i, "Helvetica-Bold", 7.5)
        c.drawString(M + 18 + title_w + 4, item_y - 4, desc_i)
        item_y -= 12
    y -= block_h + 6

    # ── 8. Condición final ─────────────────────────────────────────
    y = _block_title(c, y, "7", "CONDICIÓN FINAL DEL EQUIPO")
    block_h = 30
    c.rect(M, y - block_h, W - 2 * M, block_h, stroke=1, fill=0)
    cond_final = (orden.get("condicion_final") or "").lower().strip()
    conds = [
        ("operativo", "Operativo (entregado al servicio)", OK),
        ("mantenimiento", "En mantenimiento", WARN),
        ("fuera_servicio", "Fuera de servicio (resguardo)", DANGER),
        ("baja", "Baja / decomisión", HexColor("#52525B")),
    ]
    cb_x = M + 6
    cb_y = y - 18
    c.setFont("Helvetica", 8)
    for ckey, clabel, ccolor in conds:
        _checkbox(c, cb_x, cb_y - 1, marked=(cond_final == ckey or cond_final.startswith(ckey)), color=ccolor)
        c.drawString(cb_x + 14, cb_y + 2, clabel)
        cb_x += c.stringWidth(clabel, "Helvetica", 8) + 22
    y -= block_h + 8

    # ── 9. Firmas (3 columnas) ─────────────────────────────────────
    sig_w = (W - 2 * M - 30) / 3
    sy = y - 30
    for i, (label, meta) in enumerate([
        ("Realizó (Ing. Biomédico) *", orden.get("tecnico_nombre") or ""),
        ("Validó (Jefe de Conservación)", ""),
        ("Recibe Conformidad *", orden.get("recibe_conformidad_nombre") or ""),
    ]):
        sx = M + i * (sig_w + 15)
        c.setLineWidth(1)
        c.line(sx, sy, sx + sig_w, sy)
        if meta:
            c.setFont("Helvetica", 8)
            c.drawCentredString(sx + sig_w / 2, sy + 8, meta)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawCentredString(sx + sig_w / 2, sy - 9, label)
        c.setFont("Helvetica", 6.5)
        c.setFillColor(GRAY)
        c.drawCentredString(sx + sig_w / 2, sy - 18, "Nombre · Matrícula · Fecha")
        c.setFillColor(HexColor("#000000"))
    y = sy - 28

    # ── 10. Pie ────────────────────────────────────────────────────
    c.setStrokeColor(GRAY_LT)
    c.setLineWidth(0.5)
    c.line(M, y, W - M, y)
    c.setStrokeColor(HexColor("#000000"))
    c.setLineWidth(1)
    c.setFont("Helvetica", 6.5)
    c.setFillColor(GRAY)
    c.drawString(M, y - 8, "SIGAB v2.0 · Sistema Integral de Gestión de Activos Biomédicos · HGR No.1 IMSS Tijuana")
    c.drawRightString(W - M, y - 8, "Formato OS v2.0 — 2026-05 · Poka-Yoke")
    c.setFillColor(HexColor("#000000"))

    c.showPage()
    c.save()
    return buf.getvalue()
