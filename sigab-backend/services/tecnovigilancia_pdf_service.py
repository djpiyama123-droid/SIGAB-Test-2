from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

# ── Constantes de estilo ─────────────────────────────────────────
_MARGIN = 2 * cm
_IMSS_GREEN = HexColor("#006847")
_SECTION_BG = HexColor("#f0f4f8")
_HEADER_BG = HexColor("#1e293b")
_RED = HexColor("#dc2626")

_TIPO_LABELS = {
    "muerte": "Muerte",
    "lesion_grave": "Lesion grave",
    "deterioro_temporal": "Deterioro temporal",
    "riesgo_potencial": "Riesgo potencial",
    "falla_funcional": "Falla funcional",
}

_SEVERIDAD_LABELS = {
    "critica": "CRITICA",
    "grave": "GRAVE",
    "moderada": "MODERADA",
    "leve": "LEVE",
}


def _safe(val, default="N/A"):
    if val is None:
        return default
    return str(val)


def _encabezado(c, width, height):
    """Encabezado institucional IMSS + titulo NOM-240."""
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(_IMSS_GREEN)
    c.drawString(_MARGIN, height - _MARGIN, "Instituto Mexicano del Seguro Social")
    c.setFont("Helvetica", 9)
    c.setFillGray(0.3)
    c.drawString(_MARGIN, height - _MARGIN - 14,
                 "Hospital General Regional No. 1 — Tijuana, B.C.")
    c.drawString(_MARGIN, height - _MARGIN - 26,
                 "Departamento de Conservacion e Ingenieria Biomedica")

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(_HEADER_BG)
    c.drawCentredString(width / 2, height - _MARGIN - 50,
                        "REPORTE DE EVENTO ADVERSO")
    c.setFont("Helvetica", 9)
    c.setFillGray(0.4)
    c.drawCentredString(width / 2, height - _MARGIN - 63,
                        "NOM-240-SSA1-2012 — Tecnovigilancia de Dispositivos Medicos")

    c.setStrokeColor(_IMSS_GREEN)
    c.setLineWidth(1.5)
    c.line(_MARGIN, height - _MARGIN - 72, width - _MARGIN, height - _MARGIN - 72)

    return height - _MARGIN - 90


def _section_title(c, y, title):
    """Imprime titulo de seccion y retorna la nueva Y."""
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(_IMSS_GREEN)
    c.drawString(_MARGIN, y, title)
    c.setFillGray(0)
    return y - 16


def _field(c, y, label, value, x=None):
    """Imprime un par label: valor."""
    x = x or _MARGIN
    c.setFont("Helvetica-Bold", 8)
    c.setFillGray(0.3)
    c.drawString(x, y, label + ":")
    c.setFont("Helvetica", 9)
    c.setFillGray(0)
    c.drawString(x + len(label) * 5 + 12, y, _safe(value))
    return y - 14


def _multiline(c, y, text, width_limit, page_height):
    """Imprime texto largo con wrapping basico."""
    c.setFont("Helvetica", 9)
    c.setFillGray(0)
    text = _safe(text, "—")
    words = text.split()
    line = ""
    for w in words:
        test = line + " " + w if line else w
        if c.stringWidth(test, "Helvetica", 9) > width_limit:
            if y < 60:
                c.showPage()
                y = page_height - _MARGIN
            c.drawString(_MARGIN + 10, y, line)
            y -= 13
            line = w
        else:
            line = test
    if line:
        if y < 60:
            c.showPage()
            y = page_height - _MARGIN
        c.drawString(_MARGIN + 10, y, line)
        y -= 13
    return y


def generar_pdf_nom240(evento: dict, evidencias: list) -> bytes:
    """Genera PDF oficial de tecnovigilancia NOM-240-SSA1-2012."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    text_width = width - 2 * _MARGIN

    # ── 1. Encabezado ────────────────────────────────────────────
    y = _encabezado(c, width, height)

    # ── 2. Datos del reporte ─────────────────────────────────────
    y = _section_title(c, y, "1. DATOS DEL REPORTE")
    y = _field(c, y, "No. Reporte", evento.get("numero_reporte"))
    y = _field(c, y, "Fecha del evento", evento.get("fecha_evento"))
    y = _field(c, y, "Fecha del reporte", evento.get("created_at"))
    y = _field(c, y, "Estado actual", _safe(evento.get("estado"), "").upper())
    y -= 6

    # ── 3. Dispositivo medico ────────────────────────────────────
    y = _section_title(c, y, "2. IDENTIFICACION DEL DISPOSITIVO MEDICO")
    y = _field(c, y, "Nombre", evento.get("dispositivo_nombre"))
    y = _field(c, y, "Marca", evento.get("dispositivo_marca"))
    y = _field(c, y, "Modelo", evento.get("dispositivo_modelo"))
    y = _field(c, y, "No. Serie", evento.get("dispositivo_serie"))
    y = _field(c, y, "Lote", evento.get("dispositivo_lote"))
    y = _field(c, y, "Registro Sanitario", evento.get("dispositivo_registro_sanitario"))
    y = _field(c, y, "Estado post-evento", evento.get("dispositivo_estado_post"))
    y -= 6

    # ── 4. Clasificacion ─────────────────────────────────────────
    y = _section_title(c, y, "3. CLASIFICACION DEL EVENTO")
    tipo = evento.get("tipo_evento", "")
    sev = evento.get("severidad", "")
    y = _field(c, y, "Tipo de evento", _TIPO_LABELS.get(tipo, tipo))

    # Severidad con enfasis visual si es critica
    c.setFont("Helvetica-Bold", 8)
    c.setFillGray(0.3)
    c.drawString(_MARGIN, y, "Severidad:")
    if sev in ("critica", "grave"):
        c.setFillColor(_RED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(_MARGIN + 58, y, _SEVERIDAD_LABELS.get(sev, sev.upper()))
    c.setFillGray(0)
    y -= 18

    # ── 5. Paciente anonimizado ──────────────────────────────────
    y = _section_title(c, y, "4. DATOS DEL PACIENTE (anonimizado — LFPDPPP)")
    sexo_map = {"M": "Masculino", "F": "Femenino", "otro": "Otro", "no_aplica": "No aplica"}
    y = _field(c, y, "Sexo", sexo_map.get(evento.get("paciente_sexo", "no_aplica"), "No aplica"))
    edad = evento.get("paciente_edad")
    y = _field(c, y, "Edad", f"{edad} anios" if edad else "No aplica")
    y -= 6

    # ── 6. Descripcion del evento ────────────────────────────────
    if y < 120:
        c.showPage()
        y = height - _MARGIN

    y = _section_title(c, y, "5. DESCRIPCION DEL EVENTO")
    y = _multiline(c, y, evento.get("descripcion_evento"), text_width, height)
    y -= 6

    if evento.get("consecuencia_clinica"):
        y = _section_title(c, y, "6. CONSECUENCIA CLINICA")
        y = _multiline(c, y, evento.get("consecuencia_clinica"), text_width, height)
        y -= 6

    if evento.get("accion_correctiva"):
        y = _section_title(c, y, "7. ACCION CORRECTIVA INMEDIATA")
        y = _multiline(c, y, evento.get("accion_correctiva"), text_width, height)
        y -= 6

    # ── 7. Investigacion ─────────────────────────────────────────
    if evento.get("hallazgos") or evento.get("causa_raiz"):
        if y < 120:
            c.showPage()
            y = height - _MARGIN

        y = _section_title(c, y, "8. HALLAZGOS DE INVESTIGACION")
        if evento.get("investigador_nombre"):
            y = _field(c, y, "Investigador", evento.get("investigador_nombre"))
        if evento.get("fecha_investigacion"):
            y = _field(c, y, "Fecha investigacion", evento.get("fecha_investigacion"))
        if evento.get("hallazgos"):
            c.setFont("Helvetica-Bold", 8)
            c.setFillGray(0.3)
            c.drawString(_MARGIN, y, "Hallazgos:")
            c.setFillGray(0)
            y -= 14
            y = _multiline(c, y, evento.get("hallazgos"), text_width, height)
        if evento.get("causa_raiz"):
            c.setFont("Helvetica-Bold", 8)
            c.setFillGray(0.3)
            c.drawString(_MARGIN, y, "Causa raiz:")
            c.setFillGray(0)
            y -= 14
            y = _multiline(c, y, evento.get("causa_raiz"), text_width, height)
        y -= 6

    # ── 8. Evidencias ────────────────────────────────────────────
    if evidencias:
        if y < 100:
            c.showPage()
            y = height - _MARGIN

        y = _section_title(c, y, "9. EVIDENCIAS ADJUNTAS")
        c.setFont("Helvetica", 8)
        for i, ev in enumerate(evidencias, 1):
            tipo_ev = ev.get("tipo", "otro")
            desc = ev.get("descripcion") or "Sin descripcion"
            c.drawString(_MARGIN + 10, y, f"{i}. [{tipo_ev}] {desc} — {ev.get('ruta_archivo', '')}")
            y -= 13
            if y < 60:
                c.showPage()
                y = height - _MARGIN
        y -= 6

    # ── 9. Escalado COFEPRIS ─────────────────────────────────────
    if evento.get("enviado_cofepris"):
        if y < 100:
            c.showPage()
            y = height - _MARGIN

        y = _section_title(c, y, "10. ESCALADO A COFEPRIS")
        y = _field(c, y, "Enviado a COFEPRIS", "SI")
        y = _field(c, y, "Folio COFEPRIS", evento.get("folio_cofepris"))
        y = _field(c, y, "Fecha de envio", evento.get("fecha_envio_cofepris"))
        y -= 6

    # ── 10. Cierre ───────────────────────────────────────────────
    if evento.get("conclusion"):
        if y < 100:
            c.showPage()
            y = height - _MARGIN

        y = _section_title(c, y, "11. CONCLUSION Y CIERRE")
        y = _field(c, y, "Fecha de cierre", evento.get("fecha_cierre"))
        y = _multiline(c, y, evento.get("conclusion"), text_width, height)
        y -= 6

    # ── 11. Firmas ───────────────────────────────────────────────
    if y < 160:
        c.showPage()
        y = height - _MARGIN

    y -= 30
    c.setLineWidth(0.5)
    c.setStrokeGray(0.5)

    # Firma 1: Reportante
    c.line(_MARGIN, y, _MARGIN + 160, y)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(_MARGIN + 80, y - 12, "Reporto")
    c.setFont("Helvetica", 8)
    c.drawCentredString(_MARGIN + 80, y - 24,
                        _safe(evento.get("reportante_nombre"), "Nombre / Matricula"))

    # Firma 2: Investigador
    mid = width / 2 - 20
    c.line(mid, y, mid + 160, y)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(mid + 80, y - 12, "Investigo")
    c.setFont("Helvetica", 8)
    c.drawCentredString(mid + 80, y - 24,
                        _safe(evento.get("investigador_nombre"), "Nombre / Matricula"))

    # Firma 3: Jefe Conservacion (centrada abajo)
    y -= 60
    center_x = width / 2
    c.line(center_x - 80, y, center_x + 80, y)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(center_x, y - 12, "Vo.Bo. Jefe de Conservacion")

    # ── 12. Pie de pagina ────────────────────────────────────────
    c.setFont("Helvetica", 7)
    c.setFillGray(0.5)
    c.drawCentredString(width / 2, 30,
                        "Documento generado por SIGAB — ISO 8601 / NOM-240-SSA1-2012")
    c.drawCentredString(width / 2, 20,
                        "Sistema Integral de Gestion de Activos Biomedicos — HGR No.1 IMSS Tijuana")

    c.showPage()
    c.save()
    return buf.getvalue()
