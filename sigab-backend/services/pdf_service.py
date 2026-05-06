import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

def generar_pdf_orden(orden: dict, materiales: list, evidencias: list) -> bytes:
    """Genera un PDF con el formato de la Orden de Servicio."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    margin = 2 * cm
    
    # ── Encabezado ──
    c.setFont("Helvetica-Bold", 14)
    c.drawString(margin, height - margin, "Instituto Mexicano del Seguro Social")
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - margin - 15, "Hospital General Regional No. 1 - Tijuana, B.C.")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width / 2, height - margin - 40, "ORDEN DE SERVICIO BIOMÉDICO")
    
    # Línea
    c.setLineWidth(1)
    c.line(margin, height - margin - 50, width - margin, height - margin - 50)
    
    # ── Datos de la Orden ──
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, height - margin - 70, f"No. Orden: {orden.get('numero_orden', '')}")
    c.drawString(width / 2, height - margin - 70, f"Fecha: {orden.get('fecha', '')}")
    
    c.setFont("Helvetica", 10)
    y = height - margin - 90
    
    c.drawString(margin, y, f"Equipo: {orden.get('equipo_nombre', '')}")
    c.drawString(width / 2, y, f"Serie: {orden.get('equipo_serie', '')}")
    y -= 15
    c.drawString(margin, y, f"Marca: {orden.get('equipo_marca', '')} / Modelo: {orden.get('equipo_modelo', '')}")
    y -= 15
    c.drawString(margin, y, f"Área: {orden.get('area', '')} - Piso: {orden.get('piso', '')}")
    y -= 15
    c.drawString(margin, y, f"Tipo de Mantenimiento: {orden.get('tipo_mantenimiento', '').upper()}")
    y -= 25
    
    # ── Detalles ──
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Falla Reportada:")
    c.setFont("Helvetica", 10)
    y -= 15
    c.drawString(margin, y, str(orden.get('falla_reportada') or 'Ninguna'))
    
    y -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Condiciones Encontradas:")
    c.setFont("Helvetica", 10)
    y -= 15
    c.drawString(margin, y, str(orden.get('condiciones_encontradas') or 'N/A'))
    
    y -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Descripción del Servicio:")
    c.setFont("Helvetica", 10)
    y -= 15
    c.drawString(margin, y, str(orden.get('descripcion_servicio') or 'N/A'))
    
    y -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Condición Final:")
    c.setFont("Helvetica", 10)
    y -= 15
    c.drawString(margin, y, str(orden.get('condicion_final') or 'N/A'))
    
    y -= 35
    
    # ── Materiales ──
    if materiales:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Materiales Utilizados:")
        y -= 15
        c.setFont("Helvetica", 10)
        for mat in materiales:
            c.drawString(margin + 10, y, f"- {mat.get('cantidad', 1)}x {mat.get('descripcion', '')}")
            y -= 15
        y -= 15

    # ── Firmas ──
    # Si queda poco espacio, nueva hoja
    if y < 150:
        c.showPage()
        y = height - margin
        
    y -= 50
    c.setLineWidth(0.5)
    c.line(margin, y, margin + 150, y)
    c.line(width - margin - 150, y, width - margin, y)
    
    y -= 15
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(margin + 75, y, "Realizó (Ing. Biomédico)")
    c.drawCentredString(width - margin - 75, y, "Recibe Conformidad")
    
    y -= 15
    c.setFont("Helvetica", 9)
    c.drawCentredString(margin + 75, y, orden.get("tecnico_nombre") or "Firma")
    c.drawCentredString(width - margin - 75, y, orden.get("recibe_conformidad_nombre") or "Nombre / Matrícula")

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
