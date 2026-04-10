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
