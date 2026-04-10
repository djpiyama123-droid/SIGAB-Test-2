"""Generación de QR PNG y etiquetas A6 imprimibles para equipos."""
from io import BytesIO
import qrcode
from qrcode.constants import ERROR_CORRECT_M

from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def generate_qr_png(url: str, box_size: int = 10, border: int = 2) -> bytes:
    """Devuelve los bytes de un PNG con el QR del URL dado."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_qr_label_a6_pdf(equipo: dict, url: str) -> bytes:
    """Etiqueta A6 (105×148 mm) con QR + datos del equipo + folio IMSS.

    Layout:
      - Encabezado: HOSPITAL GENERAL REGIONAL #1 IMSS TIJUANA
      - Subtítulo: SIGAB · Activo Biomédico
      - QR grande centrado
      - Nombre del equipo (grande)
      - Marca / modelo
      - Folio: ID + qr_token
      - Pie: "Escanea para más información"
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A6)
    width, height = A6  # ~ 297.6 x 419.5 pts

    margin = 8 * mm

    # ── Encabezado ──
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width / 2, height - margin - 9, "HOSPITAL GENERAL REGIONAL No. 1")
    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, height - margin - 18, "IMSS · TIJUANA, B.C.")
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, height - margin - 30, "SIGAB · Activo Biomédico")

    # Línea separadora
    c.setLineWidth(0.5)
    c.line(margin, height - margin - 35, width - margin, height - margin - 35)

    # ── QR ──
    qr_png = generate_qr_png(url, box_size=8, border=2)
    qr_img = ImageReader(BytesIO(qr_png))
    qr_size = 70 * mm
    qr_x = (width - qr_size) / 2
    qr_y = height - margin - 35 - qr_size - 4 * mm
    c.drawImage(qr_img, qr_x, qr_y, width=qr_size, height=qr_size, preserveAspectRatio=True)

    # ── Datos del equipo ──
    nombre = (equipo.get("nombre") or "Sin nombre")[:38]
    marca = equipo.get("marca") or ""
    modelo = equipo.get("modelo") or ""
    eq_id = equipo.get("id", "?")
    token = equipo.get("qr_token") or ""

    text_y = qr_y - 6 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, text_y, nombre)

    c.setFont("Helvetica", 8)
    marca_modelo = " · ".join(p for p in [marca, modelo] if p)[:50]
    c.drawCentredString(width / 2, text_y - 12, marca_modelo)

    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, text_y - 24, f"Folio: HGR1-{eq_id:04d}" if isinstance(eq_id, int) else f"Folio: HGR1-{eq_id}")

    # ── Pie ──
    c.setFont("Helvetica-Oblique", 6)
    c.drawCentredString(width / 2, margin, "Escanea el QR para ver información del equipo")

    c.showPage()
    c.save()
    return buf.getvalue()
