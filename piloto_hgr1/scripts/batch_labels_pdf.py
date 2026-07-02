"""
batch_labels_pdf.py
================================================================
Genera PDF A4 con N etiquetas (matriz 3x7 = 21 por hoja) reusando la
función `generate_qr_label_a6_pdf` que ya existe en `sigab-backend/services/qr_service.py`.

USO LOCAL (no requiere backend corriendo):
    python3 batch_labels_pdf.py --equipos equipos.json --output etiquetas.pdf

USO EN BACKEND (vía endpoint nuevo — ver /mnt/c/.../SIGAB/sigab-backend/routes/equipos_batch.py):
    GET /api/equipos/qr/labels-batch?ids=1,2,3&formato=a4&por_hoja=21
"""
import argparse
import json
import sys
from io import BytesIO
from pathlib import Path

# Importar qr_service REAL de SIGAB (mismo código que el backend ya usa)
sys.path.insert(0, str(Path("/mnt/c/Users/djpiy/Desktop/Bioingeneria/SIGAB/sigab-backend")))
from services.qr_service import generate_qr_label_a6_pdf  # noqa: E402

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def build_a4_sheet(equipos: list[dict], url_base: str, por_hoja: int = 21) -> bytes:
    """Genera UN PDF A4 con `por_hoja` etiquetas A6 adentro.

    Layout 3 columnas x 7 filas = 21 etiquetas por hoja A4.
    Cada etiqueta es A6 (105x148mm) reducida para caber.

    Estrategia: usa canvas.beginForm/endForm para embeber las páginas
    del PDF A6 original como forms reusables dentro del PDF A4.
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4  # 210 x 297 mm

    # 3 cols x 7 filas = 21 etiquetas
    cols, rows = 3, 7
    margin_x = 5 * mm
    margin_y = 5 * mm
    cell_w = (page_w - 2 * margin_x) / cols
    cell_h = (page_h - 2 * margin_y) / rows

    for idx, eq in enumerate(equipos[:por_hoja]):
        col = idx % cols
        row = rows - 1 - (idx // cols)  # empieza arriba

        x = margin_x + col * cell_w
        y = margin_y + row * cell_h

        # Borde punteado de corte
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(0.3)
        c.setDash(2, 2)
        c.rect(x, y, cell_w, cell_h, stroke=1, fill=0)
        c.setDash()

        # Genera el PDF A6 original (1 página) y embeber como form
        url = f"{url_base}/equipo/{eq.get('qr_token', '')}"
        a6_pdf_bytes = generate_qr_label_a6_pdf(eq, url)

        # Truco: usar el contenido del PDF A6 como un "form XObject" embebido.
        # ReportLab no tiene drawPdf directo, pero podemos redibujar el contenido
        # del A6 dentro de un rect escalado usando _doc.Reference para copiar
        # el flujo de páginas. Workaround simple: usamos forms de reportlab.
        from reportlab.pdfbase.pdfmetrics import stringWidth
        # Generar un canvas interno que produce el contenido A6, copiarlo
        # al canvas principal vía scale + translate.
        a6_w, a6_h = 105 * mm, 148 * mm  # A6 size
        scale = min((cell_w - 4 * mm) / a6_w, (cell_h - 6 * mm) / a6_h)

        c.saveState()
        c.translate(x + 2 * mm, y + 4 * mm)
        c.scale(scale, scale)
        # Re-llamar internamente al canvas del A6 sobre este contexto
        # (es lo más simple aunque un poco hacky)
        try:
            from reportlab.pdfgen.canvas import Canvas
            # Truco: redibujar el A6 dentro de este transform
            # Para no duplicar lógica, lo más simple es usar el PDF A6 como
            # template: lo leemos con un parser y lo embebemos.
            # Workaround PRAGMÁTICO: redibujar el contenido del A6 a mano
            # copiando la lógica de qr_service.
            _redraw_a6_on_canvas(c, eq, url)
        finally:
            c.restoreState()

        # Folio abajo de la celda
        c.setFont("Helvetica", 6)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        folio = f"HGR1-{eq.get('id', 0):04d}"
        c.drawCentredString(x + cell_w / 2, y + 1 * mm, folio)

    c.showPage()
    c.save()
    return buf.getvalue()


def _redraw_a6_on_canvas(c, equipo: dict, url: str):
    """Replica del contenido de generate_qr_label_a6_pdf, dibujado sobre
    el canvas 'c' que ya está escalado y trasladado al tamaño A6.

    Coordenadas internas: A6 = 105x148mm, origen abajo-izq.
    """
    from reportlab.lib.pagesizes import A6
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from services.qr_service import generate_qr_png
    from io import BytesIO

    width, height = A6
    margin = 8 * mm

    # Encabezado
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width / 2, height - margin - 9, "HOSPITAL GENERAL REGIONAL No. 1")
    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, height - margin - 18, "IMSS · TIJUANA, B.C.")
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, height - margin - 30, "SIGAH · Activo Biomédico")

    c.setLineWidth(0.5)
    c.line(margin, height - margin - 35, width - margin, height - margin - 35)

    # QR
    qr_png = generate_qr_png(url, box_size=8, border=2)
    qr_img = ImageReader(BytesIO(qr_png))
    qr_size = 70 * mm
    qr_x = (width - qr_size) / 2
    qr_y = height - margin - 35 - qr_size - 4 * mm
    c.drawImage(qr_img, qr_x, qr_y, width=qr_size, height=qr_size, preserveAspectRatio=True)

    # Datos del equipo
    nombre = (equipo.get("nombre") or "Sin nombre")[:38]
    marca = equipo.get("marca") or ""
    modelo = equipo.get("modelo") or ""
    eq_id = equipo.get("id", "?")

    text_y = qr_y - 6 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, text_y, nombre)
    c.setFont("Helvetica", 8)
    marca_modelo = " · ".join(p for p in [marca, modelo] if p)[:50]
    c.drawCentredString(width / 2, text_y - 12, marca_modelo)
    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, text_y - 24, f"Folio: HGR1-{eq_id:04d}" if isinstance(eq_id, int) else f"Folio: HGR1-{eq_id}")

    c.setFont("Helvetica-Oblique", 6)
    c.drawCentredString(width / 2, margin, "Escanea el QR para ver información del equipo")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--equipos", required=True, help="JSON con lista de equipos")
    p.add_argument("--output", default="etiquetas_a4.pdf", help="PDF de salida")
    p.add_argument("--url-base", default="https://sigab.129-121-100-147.sslip.io")
    p.add_argument("--por-hoja", type=int, default=21)
    args = p.parse_args()

    equipos = json.loads(Path(args.equipos).read_text())
    print(f"📋 {len(equipos)} equipos cargados")

    pdfs = []
    chunk = args.por_hoja
    for i in range(0, len(equipos), chunk):
        page = equipos[i:i + chunk]
        pdfs.append(build_a4_sheet(page, args.url_base, args.por_hoja))
        print(f"  Hoja {i//chunk + 1}: {len(page)} etiquetas")

    # Combinar todos los PDFs (simple concat: reescribimos con un solo doc)
    full = BytesIO()
    c = canvas.Canvas(full, pagesize=A4)
    for pdf_bytes in pdfs:
        # Parsear y redibujar (más simple que merge con PyPDF2)
        from reportlab.pdfgen.canvas import Canvas
        # Truco: usar pagesizes = ya está en A4
        c.showPage()
    # Mejor: usar PyPDF2 si está disponible
    try:
        from PyPDF2 import PdfMerger
        merger = PdfMerger()
        for pdf_bytes in pdfs:
            merger.append(BytesIO(pdf_bytes))
        merger.write(args.output)
        merger.close()
        print(f"✅ PDF combinado: {args.output}")
    except ImportError:
        # Sin PyPDF2: solo el primer chunk
        Path(args.output).write_bytes(pdfs[0])
        print(f"⚠ PyPDF2 no disponible, solo se escribió el primer chunk en {args.output}")
        print("  pip install --user PyPDF2 para combinar todos los chunks")


if __name__ == "__main__":
    main()
