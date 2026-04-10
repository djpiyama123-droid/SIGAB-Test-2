from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

_VERDE = HexColor("#10b981")
_ROJO  = HexColor("#ef4444")
_GRIS  = HexColor("#64748b")

MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

ESTADO_LABEL = {
    "operativo":       "Operativo",
    "en_mantenimiento": "En mantenimiento",
    "fuera_servicio":  "Fuera de servicio",
    "en_traslado":     "En traslado",
    "baja":            "Baja",
}


def _encabezado(c, width, height, titulo: str):
    margin = 2 * cm
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, height - margin, "Instituto Mexicano del Seguro Social")
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - margin - 15, "Hospital General Regional No. 1 — Tijuana, B.C.")
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, height - margin - 42, titulo)
    c.setLineWidth(1)
    c.line(margin, height - margin - 52, width - margin, height - margin - 52)
    return height - margin - 70  # y de inicio tras encabezado


def _fila_tabla(c, x, y, cols, widths, font="Helvetica", size=9, line_height=14):
    c.setFont(font, size)
    for text, w in zip(cols, widths):
        c.drawString(x + 3, y, str(text or "—"))
        x += w
    return y - line_height


def _cabecera_tabla(c, x, y, cols, widths):
    c.setFillColor(_GRIS)
    total_w = sum(widths)
    c.rect(x, y - 2, total_w, 14, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 9)
    cx = x
    for text, w in zip(cols, widths):
        c.drawString(cx + 3, y, text)
        cx += w
    c.setFillColorRGB(0, 0, 0)
    return y - 16


# ─────────────────────────────────────────────────────────────
# Reporte Diario
# ─────────────────────────────────────────────────────────────

def generar_pdf_reporte_diario(datos: dict, criticos: list) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    margin = 2 * cm

    hoy = datos.get("fecha", datetime.now().strftime("%Y-%m-%d"))
    y = _encabezado(c, width, height, f"Reporte Diario — {hoy}")

    # ── Métricas del día ──
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, "Métricas del día")
    y -= 16

    estado_map = {e["estado"]: e["total"] for e in (datos.get("equipos_por_estado") or [])}
    metricas = [
        ("Órdenes abiertas hoy",      datos.get("ordenes_hoy", 0)),
        ("Órdenes pendientes",        datos.get("ordenes_abiertas", 0)),
        ("Equipos operativos",        estado_map.get("operativo", 0)),
        ("En mantenimiento",          estado_map.get("en_mantenimiento", 0)),
        ("Fuera de servicio",         estado_map.get("fuera_servicio", 0)),
        ("En traslado",               estado_map.get("en_traslado", 0)),
    ]
    cols_w = [width - 2 * margin - 80, 80]
    y = _cabecera_tabla(c, margin, y, ["Indicador", "Total"], cols_w)
    for label, val in metricas:
        y = _fila_tabla(c, margin, y, [label, val], cols_w)
        if y < margin + 80:
            c.showPage()
            y = _encabezado(c, width, height, f"Reporte Diario — {hoy} (cont.)")

    y -= 12

    # ── Preventivos próximos 7 días ──
    preventivos = datos.get("preventivos_proxima_semana") or []
    if preventivos:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Preventivos próximos 7 días")
        y -= 16
        pw = [(width - 2 * margin) * f for f in (0.40, 0.35, 0.25)]
        y = _cabecera_tabla(c, margin, y, ["Equipo", "Tipo preventivo", "Fecha"], pw)
        for pp in preventivos:
            if y < margin + 80:
                c.showPage()
                y = _encabezado(c, width, height, f"Reporte Diario — {hoy} (cont.)")
            y = _fila_tabla(
                c, margin, y,
                [f"{pp['nombre']} ({pp['serie']})", pp["tipo_preventivo"], str(pp["proxima_ejecucion"])],
                pw,
            )
        y -= 12

    # ── Equipos críticos ──
    if criticos:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Equipos críticos / fuera de servicio")
        y -= 16
        cw = [(width - 2 * margin) * f for f in (0.30, 0.20, 0.20, 0.18, 0.12)]
        y = _cabecera_tabla(c, margin, y, ["Equipo", "Marca", "Serie", "Estado", "Tickets"], cw)
        for eq in criticos:
            if y < margin + 80:
                c.showPage()
                y = _encabezado(c, width, height, f"Reporte Diario — {hoy} (cont.)")
            estado = ESTADO_LABEL.get(eq.get("estado", ""), eq.get("estado", ""))
            y = _fila_tabla(
                c, margin, y,
                [eq.get("nombre"), eq.get("marca"), eq.get("serie"), estado, eq.get("tickets_abiertos", 0)],
                cw,
            )

    # ── Pie ──
    c.setFont("Helvetica", 8)
    c.setFillColor(_GRIS)
    c.drawString(margin, margin, f"Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')} — SIGAB")
    c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────
# Historial de Órdenes
# ─────────────────────────────────────────────────────────────

def generar_pdf_historial(mes: int, anio: int, ordenes: list, resumen: list) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    margin = 2 * cm

    titulo = f"Historial de Órdenes — {MESES[mes]} {anio}"
    y = _encabezado(c, width, height, titulo)

    # ── Resumen por tipo ──
    if resumen:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, y, "Resumen por tipo de mantenimiento")
        y -= 16
        rw = [(width - 2 * margin) * f for f in (0.70, 0.30)]
        y = _cabecera_tabla(c, margin, y, ["Tipo", "Total"], rw)
        for r in resumen:
            y = _fila_tabla(c, margin, y, [r.get("tipo_mantenimiento", ""), r.get("total", 0)], rw)
        y -= 12

    # ── Tabla de órdenes ──
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, y, f"Órdenes del mes ({len(ordenes)} registros)")
    y -= 16
    ow = [(width - 2 * margin) * f for f in (0.10, 0.28, 0.20, 0.20, 0.12, 0.10)]
    y = _cabecera_tabla(c, margin, y, ["No.", "Equipo", "Tipo", "Estado", "Fecha", "Técnico"], ow)

    for orden in ordenes:
        if y < margin + 60:
            c.showPage()
            y = _encabezado(c, width, height, f"{titulo} (cont.)")
        fecha = str(orden.get("fecha", ""))[:10]
        y = _fila_tabla(
            c, margin, y,
            [
                orden.get("numero_orden", orden.get("id", "")),
                orden.get("equipo_nombre_rel", orden.get("equipo_id", "")),
                orden.get("tipo_mantenimiento", ""),
                orden.get("estado", ""),
                fecha,
                orden.get("tecnico_nombre", ""),
            ],
            ow,
            size=8,
            line_height=13,
        )

    c.setFont("Helvetica", 8)
    c.setFillColor(_GRIS)
    c.drawString(margin, margin, f"Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')} — SIGAB")
    c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    return buf.getvalue()
