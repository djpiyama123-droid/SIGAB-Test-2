import os
import zipfile
import json
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional

from database import get_async_session
from models.equipo import Equipo
from auth.dependencies import get_current_user, require_action
from auth.tenancy import get_current_tenant
from config import UPLOAD_DIR
from services.audit_service import AuditService

router = APIRouter()

@router.post("/importar-contratos-zip")
async def importar_contratos_zip(
    file: UploadFile = File(...),
    user: dict = Depends(require_action("create_equipo")),
    tenant_id: int = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Recibe un archivo ZIP con:
    - metadata.json conteniendo la información de asignación de contratos para equipos
    - Archivos PDF o imágenes de contratos y hojas de servicio
    
    Procesa y vincula la información a los equipos en el tenant.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un archivo ZIP válido")

    # Asegurar directorios de destino
    contratos_dir = os.path.join(UPLOAD_DIR, "contratos")
    servicios_dir = os.path.join(UPLOAD_DIR, "servicios")
    os.makedirs(contratos_dir, exist_ok=True)
    os.makedirs(servicios_dir, exist_ok=True)

    # Carpeta temporal para extraer
    temp_dir = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4()}")
    os.makedirs(temp_dir, exist_ok=True)

    zip_path = os.path.join(temp_dir, file.filename)
    try:
        # Guardar archivo ZIP temporalmente
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extraer ZIP
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        # Buscar metadata.json
        metadata_path = os.path.join(temp_dir, "metadata.json")
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=400, detail="El archivo ZIP no contiene 'metadata.json'")

        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        contratos_data = metadata.get("contratos", [])
        if not contratos_data:
            raise HTTPException(status_code=400, detail="No se encontraron datos de contratos en el JSON")

        actualizados = []
        errores = []

        # Valores válidos de adquisición
        TIPO_VALORES = {"recurso_propio", "contrato_consolidado", "garantia", "subrogado"}

        for i, entry in enumerate(contratos_data):
            serie = entry.get("serie")
            if not serie:
                errores.append({"fila": i, "error": "Falta el campo 'serie'"})
                continue

            # Buscar equipo por serie y tenant
            stmt = select(Equipo).where(Equipo.serie == serie, Equipo.tenant_id == tenant_id)
            res = await session.execute(stmt)
            equipo = res.scalar_one_or_none()

            if not equipo:
                errores.append({"fila": i, "serie": serie, "error": f"Equipo con serie '{serie}' no encontrado en tu clínica"})
                continue

            # Validar tipo adquisición
            tipo_adq = entry.get("tipo_adquisicion", "recurso_propio")
            if tipo_adq not in TIPO_VALORES:
                errores.append({"fila": i, "serie": serie, "error": f"Tipo de adquisición '{tipo_adq}' no es válido. Debe ser uno de {list(TIPO_VALORES)}"})
                continue

            # Actualizar campos básicos
            equipo.tipo_adquisicion = tipo_adq
            if "numero_contrato_servicio" in entry:
                equipo.numero_contrato_servicio = entry["numero_contrato_servicio"]
                # También actualizar el campo de contrato estándar por redundancia
                equipo.numero_contrato = entry["numero_contrato_servicio"]
            if "proveedor_servicio" in entry:
                equipo.proveedor_servicio = entry["proveedor_servicio"]
            if "fecha_compra" in entry and entry["fecha_compra"]:
                try:
                    from datetime import datetime
                    equipo.fecha_compra = datetime.strptime(entry["fecha_compra"], "%Y-%m-%d").date()
                except ValueError:
                    pass

            # Procesar archivo de contrato (contrato_pdf_file)
            contrato_pdf_file = entry.get("contrato_pdf_file")
            if contrato_pdf_file:
                local_file_path = os.path.join(temp_dir, contrato_pdf_file)
                if os.path.exists(local_file_path):
                    # Generar nombre único para evitar colisiones
                    ext = os.path.splitext(contrato_pdf_file)[1]
                    unique_name = f"{uuid.uuid4()}{ext}"
                    dest_path = os.path.join(contratos_dir, unique_name)
                    shutil.copy2(local_file_path, dest_path)
                    # Guardar URL pública
                    equipo.contrato_pdf_url = f"/static/uploads/contratos/{unique_name}"
                else:
                    errores.append({"fila": i, "serie": serie, "error": f"Archivo de contrato '{contrato_pdf_file}' no encontrado en el ZIP"})

            # Procesar hojas de servicio
            hojas_servicio_files = entry.get("hojas_servicio_files", [])
            if hojas_servicio_files:
                uploaded_urls = []
                for hs_file in hojas_servicio_files:
                    local_file_path = os.path.join(temp_dir, hs_file)
                    if os.path.exists(local_file_path):
                        ext = os.path.splitext(hs_file)[1]
                        unique_name = f"{uuid.uuid4()}{ext}"
                        dest_path = os.path.join(servicios_dir, unique_name)
                        shutil.copy2(local_file_path, dest_path)
                        uploaded_urls.append(f"/static/uploads/servicios/{unique_name}")
                    else:
                        errores.append({"fila": i, "serie": serie, "error": f"Archivo de hoja de servicio '{hs_file}' no encontrado en el ZIP"})
                
                if uploaded_urls:
                    # Guardar como JSON array string
                    equipo.hojas_servicio_urls = json.dumps(uploaded_urls)

            session.add(equipo)
            await session.flush()

            # Guardar en auditoría
            await AuditService.log_event(
                usuario_id=user["id"],
                accion="UPDATE_EQUIPO_VIA_CONTRATO_IMPORT",
                entidad="equipos",
                entidad_id=equipo.id,
                datos={
                    "origen": "importar-contratos-zip",
                    "serie": serie,
                    "tipo_adquisicion": tipo_adq,
                    "contrato": entry.get("numero_contrato_servicio")
                },
                session=session
            )

            actualizados.append({
                "id": equipo.id,
                "serie": serie,
                "nombre": equipo.nombre,
                "tipo_adquisicion": tipo_adq
            })

        await session.commit()

        return {
            "ok": True,
            "total_recibidos": len(contratos_data),
            "actualizados": len(actualizados),
            "errores": len(errores),
            "detalle_actualizados": actualizados,
            "detalle_errores": errores,
        }

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando el ZIP de contratos: {str(e)}")
    finally:
        # Limpiar carpeta temporal
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass
