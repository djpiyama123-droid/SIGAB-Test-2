"""
Endpoint nuevo para SIGAB: generar PDF A4 con N etiquetas QR en una sola hoja.
Va en rama aislada, sin deploy hasta que Gustavo apruebe.

Instalación:
    1. Copiar este archivo a sigab-backend/routes/equipos_batch.py
    2. En main.py, agregar:
        from routes import equipos_batch
        app.include_router(equipos_batch.router, prefix="/api/equipos", tags=["Equipos"])
    3. Branch: feat/etiquetas-batch-qr
    4. PR a pulido/2026-06-16 cuando esté listo
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
import io

from database import get_async_session
from models.equipo import Equipo
from auth.dependencies import get_current_user, require_action
from auth.tenancy import get_current_tenant
from config import PUBLIC_BASE_URL

# Reutiliza los servicios YA EXISTENTES
from services.qr_service import generate_qr_label_a6_pdf

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

router = APIRouter()


def _redraw_a6_on_canvas(c, equipo: dict, url: str):
    """Replica del contenido de generate_qr_label_a6_pdf, dibujado sobre
    el canvas 'c' que ya está escalado y trasladado al tamaño A6.

    Coordenadas internas: A6 = 105x148mm, origen abajo-izq.
    """
    from reportlab.lib.pagesizes import A6
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from services.qr_service import generate_qr_png

    width, height = A6
    margin = 8 * mm

    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width / 2, height - margin - 9, "HOSPITAL GENERAL REGIONAL No. 1")
    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, height - margin - 18, "IMSS · TIJUANA, B.C.")
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, height - margin - 30, "SIGAH · Activo Biomédico")

    c.setLineWidth(0.5)
    c.line(margin, height - margin - 35, width - margin, height - margin - 35)

    qr_png = generate_qr_png(url, box_size=8, border=2)
    qr_img = ImageReader(io.BytesIO(qr_png))
    qr_size = 70 * mm
    qr_x = (width - qr_size) / 2
    qr_y = height - margin - 35 - qr_size - 4 * mm
    c.drawImage(qr_img, qr_x, qr_y, width=qr_size, height=qr_size, preserveAspectRatio=True)

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


def _build_a4_sheet(equipos: list[dict], url_base: str, por_hoja: int = 21) -> bytes:
    """1 PDF A4 con 21 etiquetas (3x7) reusando generate_qr_label_a6_pdf.

    Estrategia: re-dibuja el contenido del A6 sobre el canvas A4 escalado,
    ya que reportlab no permite embeber PDFs como imagen.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4
    cols, rows = 3, 7
    margin = 5 * mm
    cell_w = (page_w - 2 * margin) / cols
    cell_h = (page_h - 2 * margin) / rows

    for idx, eq in enumerate(equipos[:por_hoja]):
        col = idx % cols
        row = rows - 1 - (idx // cols)
        x = margin + col * cell_w
        y = margin + row * cell_h

        # Borde punteado de corte
        c.setStrokeColorRGB(0.7, 0.7, 0.7)
        c.setLineWidth(0.3)
        c.setDash(2, 2)
        c.rect(x, y, cell_w, cell_h, stroke=1, fill=0)
        c.setDash()

        url = f"{url_base}/equipo/{eq.get('qr_token', '')}"

        # Calcular el factor de escala para que A6 quepa en la celda
        from reportlab.lib.pagesizes import A6
        a6_w, a6_h = A6
        scale = min((cell_w - 4 * mm) / a6_w, (cell_h - 6 * mm) / a6_h)

        c.saveState()
        c.translate(x + 2 * mm, y + 4 * mm)
        c.scale(scale, scale)
        _redraw_a6_on_canvas(c, eq, url)
        c.restoreState()

        # Folio HGR1-####
        c.setFont("Helvetica", 6)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawCentredString(x + cell_w / 2, y + 1 * mm, f"HGR1-{eq.get('id', 0):04d}")
        c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    return buf.getvalue()


@router.get("/qr/labels-batch")
async def generar_etiquetas_batch(
    ids: str = Query(..., description="IDs separados por coma, ej: 1,2,3,4,5"),
    formato: str = Query("a4", pattern="^(a4|a6)$"),
    por_hoja: int = Query(21, ge=1, le=21),
    user: dict = Depends(require_action("regenerar_qr")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Genera un PDF con N etiquetas QR.

    - formato=a4 (default): 21 etiquetas por hoja A4 (3x7)
    - formato=a6:           1 etiqueta por página, todas concatenadas
    - por_hoja: solo aplica a formato=a4 (max 21)

    Protegido por require_action('regenerar_qr') — mismo gate que el endpoint individual.
    """
    try:
        id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(400, "ids debe ser enteros separados por coma")

    if not id_list:
        from fastapi import HTTPException
        raise HTTPException(400, "ids no puede estar vacío")

    if len(id_list) > 500:
        from fastapi import HTTPException
        raise HTTPException(400, f"máximo 500 etiquetas por request (recibido: {len(id_list)})")

    # Cargar equipos (filtrando por tenant)
    stmt = select(Equipo).where(
        Equipo.id.in_(id_list),
        Equipo.tenant_id == tenant_id,
    )
    res = await session.execute(stmt)
    equipos_db = res.scalars().all()
    equipos_dict = [e.model_dump() for e in equipos_db]

    if not equipos_dict:
        from fastapi import HTTPException
        raise HTTPException(404, "ningún equipo encontrado para los ids dados")

    if formato == "a6":
        # 1 etiqueta por página — concat
        from PyPDF2 import PdfMerger
        merger = PdfMerger()
        for eq in equipos_dict:
            single = _build_a4_sheet([eq], PUBLIC_BASE_URL, por_hoja=1)
            merger.append(io.BytesIO(single))
        out = io.BytesIO()
        merger.write(out)
        merger.close()
        pdf_bytes = out.getvalue()
    else:
        # a4 — chunks de 21
        from PyPDF2 import PdfMerger
        merger = PdfMerger()
        for i in range(0, len(equipos_dict), por_hoja):
            chunk = equipos_dict[i:i + por_hoja]
            page_pdf = _build_a4_sheet(chunk, PUBLIC_BASE_URL, por_hoja)
            merger.append(io.BytesIO(page_pdf))
        out = io.BytesIO()
        merger.write(out)
        merger.close()
        pdf_bytes = out.getvalue()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=etiquetas_batch_{len(equipos_dict)}.pdf",
        },
    )


@router.post("/importar-excel")
async def importar_equipos_excel(
    payload: dict,
    user: dict = Depends(require_action("create_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """Importa equipos nuevos desde el Excel de levantamiento.

    Espera: {"equipos": [ {codigo_inventario, numero_serie, nombre, marca, modelo,
                            piso, area, ubicacion, estado, criticidad, tipo_equipo,
                            clase_cofepris, fecha_instalacion, ...}, ... ]}

    - Valida cada fila (serie es UNIQUE por tenant).
    - Genera qr_token opaco automáticamente.
    - Devuelve {ok, creados: [...], errores: [...]}.
    - Audit NOM-016 (CREATE_EQUIPO por cada uno).
    """
    import secrets
    from datetime import datetime
    from sqlalchemy.exc import IntegrityError
    from fastapi import HTTPException
    from services.audit_service import AuditService

    filas = payload.get("equipos", [])
    if not filas:
        raise HTTPException(400, "no hay equipos en el payload")

    if len(filas) > 200:
        raise HTTPException(400, f"máximo 200 equipos por import (recibido: {len(filas)})")

    creados = []
    errores = []

    CAMPOS_REQUERIDOS = ["serie", "nombre", "marca", "modelo"]
    for i, fila in enumerate(filas):
        # Validar campos requeridos
        faltantes = [c for c in CAMPOS_REQUERIDOS if not fila.get(c)]
        if faltantes:
            errores.append({"fila": i, "error": f"faltan campos: {faltantes}", "datos": fila})
            continue

        # Defensivo: ignorar tenant_id del cliente
        fila_limpia = {k: v for k, v in fila.items() if k not in ("id", "tenant_id", "qr_token", "created_at", "updated_at")}

        # Defaults
        if not fila_limpia.get("estado"):
            fila_limpia["estado"] = "operativo"
        if not fila_limpia.get("criticidad"):
            fila_limpia["criticidad"] = "media"
        if not fila_limpia.get("tipo_equipo"):
            fila_limpia["tipo_equipo"] = "otro"
        if not fila_limpia.get("clase_cofepris"):
            fila_limpia["clase_cofepris"] = "II"
        if fila_limpia.get("ubicacion") in (None, ""):
            partes = [p for p in (fila_limpia.get("area"), fila_limpia.get("piso")) if p]
            fila_limpia["ubicacion"] = " · ".join(partes) or "Sin ubicación"

        # Generar qr_token
        fila_limpia["qr_token"] = secrets.token_urlsafe(12)[:16]

        try:
            nuevo = Equipo(**fila_limpia, tenant_id=tenant_id)
            session.add(nuevo)
            await session.flush()  # para obtener el id

            await AuditService.log_event(
                usuario_id=user["id"],
                accion="CREATE_EQUIPO_VIA_IMPORT",
                entidad="equipos",
                entidad_id=nuevo.id,
                datos={"origen": "importar-excel", "serie": fila_limpia.get("serie")},
                session=session,
            )

            creados.append({
                "fila": i,
                "id": nuevo.id,
                "serie": nuevo.serie,
                "qr_token": nuevo.qr_token,
            })
        except IntegrityError as e:
            await session.rollback()
            errores.append({
                "fila": i,
                "error": f"serie duplicada o constraint: {e.orig.args[1] if hasattr(e, 'orig') and len(e.orig.args) > 1 else str(e)}",
                "datos": fila,
            })
            # Continuar con el siguiente (no abortar el batch)
            continue
        except Exception as e:
            await session.rollback()
            errores.append({"fila": i, "error": str(e), "datos": fila})
            continue

    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(500, f"error en commit final: {e}")

    return {
        "ok": True,
        "total_recibidos": len(filas),
        "creados": len(creados),
        "errores": len(errores),
        "detalle_creados": creados,
        "detalle_errores": errores,
    }
