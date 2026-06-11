"""
Generación de placas físicas con QR para grabado láser industrial.

Cada placa es un SVG vectorial con:
  - QR code (vectorial, no rasterizado) — los fabricantes lo graban con láser CO2 o fibra
  - Número de inventario / serie en formato legible
  - Folio IMSS / SIGAH
  - Líneas de corte y marcas de registro para CNC

Output: ZIP con 1 SVG por equipo + manifest.csv + cover_letter.txt para el fabricante.

Compatible con flujos de producción de:
  - Labels and Plates ID (Monterrey)
  - Inventarios.com.mx
  - Cualquier fabricante con grabador láser CO2 o fibra
"""
import io
import csv
import zipfile
from datetime import datetime, timezone
from typing import List, Dict, Literal

import qrcode
from qrcode.constants import ERROR_CORRECT_H


TIER_SPECS = {
    "basico": {
        "label": "Etiqueta poliéster",
        "material": "Poliéster adhesivo blanco 75µm",
        "dimensiones_mm": (40, 25),
        "costo_unitario_mxn": 35,
        "lead_time_dias": 3,
        "color_fondo": "#FFFFFF",
        "color_texto": "#000000",
        "color_accent": "#006CB7",
    },
    "estandar": {
        "label": "Placa aluminio anodizado",
        "material": "Aluminio anodizado 0.5mm, grabado láser",
        "dimensiones_mm": (50, 30),
        "costo_unitario_mxn": 120,
        "lead_time_dias": 7,
        "color_fondo": "#E5E7EB",
        "color_texto": "#0F172A",
        "color_accent": "#006CB7",
    },
    "premium": {
        "label": "Placa acero inoxidable 304",
        "material": "Acero inox 304, 1mm, grabado láser + atornillado",
        "dimensiones_mm": (60, 40),
        "costo_unitario_mxn": 280,
        "lead_time_dias": 10,
        "color_fondo": "#F1F5F9",
        "color_texto": "#0F172A",
        "color_accent": "#059669",
    },
}

Tier = Literal["basico", "estandar", "premium"]


def _qr_svg_paths(data: str, box_size_mm: float = 0.6) -> tuple[str, float]:
    """Genera el camino SVG de un QR vectorial (path d='...').

    Returns:
      (path_d, qr_size_mm) — string para <path> y tamaño total del QR en mm
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=1,
        border=0,
    )
    qr.add_data(data)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    n = len(matrix)

    paths = []
    for y, row in enumerate(matrix):
        for x, cell in enumerate(row):
            if cell:
                paths.append(f"M{x*box_size_mm:.3f},{y*box_size_mm:.3f}h{box_size_mm:.3f}v{box_size_mm:.3f}h-{box_size_mm:.3f}z")

    return "".join(paths), n * box_size_mm


def generar_placa_svg(
    equipo: Dict,
    qr_url: str,
    tier: Tier = "estandar",
    folio_prefix: str = "SIGAH",
) -> bytes:
    """Genera un SVG vectorial listo para grabado láser industrial.

    Args:
      equipo: dict con keys: id, nombre, serie, inventario, marca, modelo, qr_token
      qr_url: URL completa que se codifica en el QR
      tier: 'basico' | 'estandar' | 'premium'
      folio_prefix: prefijo del folio (ej. 'SIGAH', 'HGR1')

    Returns:
      SVG como bytes (UTF-8)
    """
    spec = TIER_SPECS[tier]
    w_mm, h_mm = spec["dimensiones_mm"]

    # QR ocupa ~60% de la altura, en la izquierda
    qr_size_target_mm = h_mm * 0.85
    qr_box_size = qr_size_target_mm / 33  # típico QR v3 con ECC H tiene 29-33 modulos
    qr_path, qr_actual_mm = _qr_svg_paths(qr_url, box_size_mm=qr_box_size)

    nombre = (equipo.get("nombre") or "Sin nombre")[:24]
    serie = equipo.get("serie") or "—"
    inventario = equipo.get("inventario") or f"{folio_prefix}-{equipo.get('id', 0):04d}"

    # Layout: QR a la izquierda, texto a la derecha
    margin = h_mm * 0.075
    qr_x = margin
    qr_y = (h_mm - qr_actual_mm) / 2
    text_x = qr_x + qr_actual_mm + margin
    text_w = w_mm - text_x - margin

    # Tamaños de fuente proporcionales
    font_nombre = h_mm * 0.18
    font_serie = h_mm * 0.13
    font_inv = h_mm * 0.11
    font_folio = h_mm * 0.085

    bg = spec["color_fondo"]
    txt = spec["color_texto"]
    accent = spec["color_accent"]

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{w_mm}mm" height="{h_mm}mm"
     viewBox="0 0 {w_mm} {h_mm}"
     data-tier="{tier}"
     data-equipo-id="{equipo.get('id', '')}"
     data-serie="{serie}">

  <!-- Capa: fondo (informativo; el material real lo define el fabricante) -->
  <rect x="0" y="0" width="{w_mm}" height="{h_mm}" fill="{bg}" stroke="{accent}" stroke-width="0.15"/>

  <!-- Capa: marcas de registro CNC (esquinas, 1mm) -->
  <g fill="none" stroke="{txt}" stroke-width="0.1" opacity="0.5">
    <path d="M0,1 L1,1 L1,0"/>
    <path d="M{w_mm-1},0 L{w_mm-1},1 L{w_mm},1"/>
    <path d="M0,{h_mm-1} L1,{h_mm-1} L1,{h_mm}"/>
    <path d="M{w_mm-1},{h_mm} L{w_mm-1},{h_mm-1} L{w_mm},{h_mm-1}"/>
  </g>

  <!-- Capa: QR vectorial (esta capa la quema el láser) -->
  <g id="qr" transform="translate({qr_x:.3f},{qr_y:.3f})" fill="{txt}">
    <path d="{qr_path}"/>
  </g>

  <!-- Capa: texto (esta capa la quema el láser) -->
  <g id="texto" fill="{txt}" font-family="Helvetica, Arial, sans-serif">
    <text x="{text_x:.3f}" y="{margin + font_nombre:.3f}"
          font-size="{font_nombre:.3f}" font-weight="700">{_escape_xml(nombre)}</text>
    <text x="{text_x:.3f}" y="{margin + font_nombre + font_serie * 1.4:.3f}"
          font-size="{font_serie:.3f}" font-weight="400" fill="{txt}">S/N: {_escape_xml(serie)}</text>
    <text x="{text_x:.3f}" y="{margin + font_nombre + (font_serie + font_inv) * 1.4:.3f}"
          font-size="{font_inv:.3f}" font-weight="400">INV: {_escape_xml(inventario)}</text>
    <text x="{text_x:.3f}" y="{h_mm - margin:.3f}"
          font-size="{font_folio:.3f}" font-weight="600" fill="{accent}">SIGAH · ACTIVO BIOMÉDICO</text>
  </g>
</svg>
"""
    return svg.encode("utf-8")


def _escape_xml(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def generar_zip_produccion(
    equipos: List[Dict],
    tier: Tier,
    base_url: str,
    hospital_nombre: str = "Hospital General Regional No. 1 IMSS Tijuana",
    folio_prefix: str = "SIGAH",
) -> bytes:
    """Genera el ZIP completo para enviar al fabricante.

    Estructura del ZIP:
      manifest.csv          — Lista de placas + datos + checksum
      cover_letter.txt      — Carta para el fabricante con specs del tier
      placas/
        equipo_0001.svg
        equipo_0002.svg
        ...

    Args:
      equipos: lista de dicts con datos del equipo (id, nombre, serie, qr_token, etc.)
      tier: nivel del servicio
      base_url: dominio base para los QR (ej. 'https://sigah.mx')
      hospital_nombre: nombre del hospital (va en cover letter)
      folio_prefix: prefijo del folio

    Returns:
      ZIP como bytes
    """
    if tier not in TIER_SPECS:
        raise ValueError(f"Tier inválido: {tier}. Valid: {list(TIER_SPECS.keys())}")

    spec = TIER_SPECS[tier]
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    total_costo = len(equipos) * spec["costo_unitario_mxn"]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # ── manifest.csv ──
        manifest_io = io.StringIO()
        writer = csv.writer(manifest_io)
        writer.writerow([
            "archivo_svg",
            "equipo_id",
            "nombre",
            "serie",
            "inventario",
            "marca",
            "modelo",
            "qr_url",
            "tier",
            "material",
            "dimensiones_mm",
        ])
        for eq in equipos:
            qr_token = eq.get("qr_token") or eq.get("serie") or str(eq.get("id"))
            qr_url = f"{base_url.rstrip('/')}/equipo/{qr_token}"
            archivo = f"placas/equipo_{eq.get('id', 0):04d}.svg"
            writer.writerow([
                archivo,
                eq.get("id"),
                eq.get("nombre", ""),
                eq.get("serie", ""),
                eq.get("inventario", ""),
                eq.get("marca", ""),
                eq.get("modelo", ""),
                qr_url,
                tier,
                spec["material"],
                f"{spec['dimensiones_mm'][0]}x{spec['dimensiones_mm'][1]}",
            ])
        zf.writestr("manifest.csv", manifest_io.getvalue())

        # ── cover_letter.txt ──
        cover = _generar_cover_letter(
            hospital_nombre=hospital_nombre,
            tier=tier,
            spec=spec,
            cantidad=len(equipos),
            total_mxn=total_costo,
            timestamp=timestamp,
        )
        zf.writestr("cover_letter.txt", cover)

        # ── SVGs ──
        for eq in equipos:
            qr_token = eq.get("qr_token") or eq.get("serie") or str(eq.get("id"))
            qr_url = f"{base_url.rstrip('/')}/equipo/{qr_token}"
            svg = generar_placa_svg(eq, qr_url, tier=tier, folio_prefix=folio_prefix)
            zf.writestr(f"placas/equipo_{eq.get('id', 0):04d}.svg", svg)

    return buf.getvalue()


def _generar_cover_letter(
    hospital_nombre: str,
    tier: str,
    spec: dict,
    cantidad: int,
    total_mxn: int,
    timestamp: str,
) -> str:
    return f"""SIGAH — Solicitud de fabricación de placas QR para activos biomédicos
================================================================

Fecha de pedido (UTC):    {timestamp}
Hospital solicitante:     {hospital_nombre}
Cantidad de placas:       {cantidad}
Tier de servicio:         {tier.upper()} — {spec['label']}

Especificaciones del material
-----------------------------
Material:                 {spec['material']}
Dimensiones:              {spec['dimensiones_mm'][0]}mm × {spec['dimensiones_mm'][1]}mm
Costo unitario (MXN):     ${spec['costo_unitario_mxn']:,}
Lead time estimado:       {spec['lead_time_dias']} días hábiles
Costo total estimado:     ${total_mxn:,} MXN (excl. envío e IVA)

Instrucciones para el fabricante
--------------------------------
1. Cada archivo en /placas/ es un SVG vectorial listo para grabado láser.
2. El QR y el texto están en grupos separados (id="qr" e id="texto") — ambos deben
   grabarse con la misma profundidad y configuración del láser.
3. NO modificar el contenido del QR — la URL embebida es opaca y única por equipo.
4. Las esquinas tienen marcas de registro CNC (1mm en cada esquina) — pueden ignorarse
   si su CNC usa otro sistema de alineación.
5. El archivo manifest.csv contiene el detalle de cada placa para validación.
6. Verificar que cada QR se decodifique correctamente antes de cortar/grabar el lote
   completo. Recomendamos hacer 2-3 placas de prueba primero.

Entrega
-------
Dirigir el envío a la dirección registrada en la cuenta SIGAH del hospital
solicitante. Si requiere validación previa de muestra, contactar al cliente.

Contacto SIGAH:           contacto@sigah.mx
Soporte técnico:          soporte@sigah.mx

Este pedido fue generado automáticamente por el módulo "Marcado Físico" de SIGAH.
================================================================
"""


def calcular_cotizacion(cantidad: int, tier: Tier) -> Dict:
    """Calcula el desglose económico de una cotización."""
    if tier not in TIER_SPECS:
        raise ValueError(f"Tier inválido: {tier}")

    spec = TIER_SPECS[tier]
    subtotal = cantidad * spec["costo_unitario_mxn"]
    iva = subtotal * 0.16
    total = subtotal + iva

    return {
        "tier": tier,
        "tier_label": spec["label"],
        "material": spec["material"],
        "dimensiones_mm": spec["dimensiones_mm"],
        "cantidad": cantidad,
        "costo_unitario_mxn": spec["costo_unitario_mxn"],
        "subtotal_mxn": subtotal,
        "iva_mxn": round(iva, 2),
        "total_mxn": round(total, 2),
        "lead_time_dias": spec["lead_time_dias"],
    }
