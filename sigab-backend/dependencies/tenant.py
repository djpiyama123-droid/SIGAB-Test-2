"""
tenant.py — Inyección de dependencias para aislamiento multi-tenant de SIGAH/SIGAB.

Permite identificar dinámicamente el hospital (inquilino) a partir del subdominio de la petición
o del header HTTP 'X-Tenant-ID'. Ofrece tolerancia a fallos devolviendo el hospital por defecto (ID=1)
si no se puede determinar o en peticiones directas de desarrollo local.
"""
from fastapi import Request, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import sys
import os

# Ajustar path si es necesario para imports locales
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_async_session
from models.hospital import Hospital

async def get_current_tenant(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> Hospital:
    """
    Dependencia FastAPI que resuelve el tenant actual de forma segura y robusta.
    Prioridad de resolución:
      1. Cabecera HTTP 'X-Tenant-ID' (Para integraciones y peticiones explícitas del frontend).
      2. Subdominio en la URL (Por ejemplo, 'hgr-1-tijuana.sigah.mx').
      3. Fallback al hospital por defecto (ID = 1, HGR No. 1 IMSS Tijuana).
    
    Lanza 403 Forbidden si el hospital está suspendido o 404 si el hospital resuelto no existe.
    """
    # 1. Intentar resolver mediante el header X-Tenant-ID
    tenant_id_header = request.headers.get("X-Tenant-ID")
    if tenant_id_header:
        try:
            tid = int(tenant_id_header)
            result = await db.execute(select(Hospital).where(Hospital.id == tid))
            tenant = result.scalar_one_or_none()
            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Inquilino con ID {tid} no encontrado en la plataforma."
                )
            
            # Validar estado de la suscripción del tenant
            if tenant.estado_suscripcion != "activo":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"El portal para '{tenant.nombre_corto}' se encuentra suspendido. Contacta a soporte."
                )
            return tenant
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato inválido del encabezado X-Tenant-ID. Debe ser numérico."
            )

    # 2. Intentar resolver mediante el subdominio del Host
    host = request.headers.get("host", "")
    subdomain = None
    if host and "." in host:
        # P. ej. "hgr-1-tijuana.sigah.mx" o "hgr-1-tijuana.localhost:3000"
        parts = host.split(".")
        if len(parts) > 2:
            first_part = parts[0].lower()
            # Ignorar subdominios del sistema general
            if first_part not in ("www", "localhost", "sigah", "sigab", "panel", "api"):
                subdomain = first_part

    if subdomain:
        result = await db.execute(select(Hospital).where(Hospital.slug == subdomain))
        tenant = result.scalar_one_or_none()
        if tenant:
            if tenant.estado_suscripcion != "activo":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"El portal para '{tenant.nombre_corto}' se encuentra suspendido. Contacta a soporte."
                )
            return tenant

    # 3. Fallback al cliente ancla principal (ID = 1, HGR No. 1 Tijuana)
    # Esto asegura retrocompatibilidad absoluta con la instalación local actual.
    result = await db.execute(select(Hospital).where(Hospital.id == 1))
    default_tenant = result.scalar_one_or_none()
    if default_tenant:
        if default_tenant.estado_suscripcion != "activo":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El portal por defecto se encuentra inactivo."
            )
        return default_tenant

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No se pudo determinar el tenant activo y el hospital por defecto no existe."
    )
