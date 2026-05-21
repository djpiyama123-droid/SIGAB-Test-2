"""Dependencia FastAPI para el aislamiento multi-tenant de SIGAH.

Resuelve el ``tenant_id`` del usuario autenticado y lo expone como una
dependencia para que cualquier endpoint pueda filtrar sus consultas por
hospital sin tener que extraer manualmente del JWT.

Patrón de uso en una ruta::

    from auth.tenancy import get_current_tenant

    @router.get("/equipos")
    async def list_equipos(
        tenant_id: int = Depends(get_current_tenant),
        session: AsyncSession = Depends(get_async_session),
    ):
        stmt = select(Equipo).where(Equipo.tenant_id == tenant_id)
        ...

Filosofía
---------
Esta dependencia es la **única** fuente de verdad de "qué hospital es el
dueño de esta sesión". Nunca leer ``tenant_id`` del body, query string o
cabeceras del request: siempre desde aquí. Eso evita que un cliente
malicioso forje el tenant en la petición.

Para SuperAdmin (rol global de SIGAH como empresa), ver
``require_superadmin`` más abajo: NO tiene ``tenant_id`` y opera en modo
global.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status

from auth.dependencies import get_current_user


SUPERADMIN_ROLE = "superadmin_sigah"


async def get_current_tenant(user: dict = Depends(get_current_user)) -> int:
    """Devuelve el ``tenant_id`` del usuario autenticado.

    Falla con 403 si el JWT no trae ``tenant_id`` (debería ser imposible
    para un usuario normal después de la migración Fase 1) o si el usuario
    es SuperAdmin (no pertenece a un tenant; usar ``require_superadmin``
    en su lugar).
    """
    if user.get("rol") == SUPERADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "El usuario SuperAdmin no pertenece a un hospital. "
                "Usa la dependencia require_superadmin para rutas globales."
            ),
        )
    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene tenant_id en su sesión.",
        )
    try:
        return int(tenant_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="tenant_id inválido en el token.",
        )


async def get_current_tenant_optional(
    user: Optional[dict] = Depends(get_current_user),
) -> Optional[int]:
    """Igual que el anterior pero no falla si no hay usuario.

    Útil para endpoints que pueden ser tanto públicos como autenticados
    (p. ej. landing del propio hospital). Devuelve ``None`` si no hay sesión
    o si la sesión es SuperAdmin.
    """
    if user is None:
        return None
    if user.get("rol") == SUPERADMIN_ROLE:
        return None
    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        return None
    try:
        return int(tenant_id)
    except (TypeError, ValueError):
        return None


async def require_superadmin(user: dict = Depends(get_current_user)) -> dict:
    """Exige que el usuario sea SuperAdmin de SIGAH (rol global).

    Usar en rutas del panel ``/admin-global`` que NO deben filtrar por
    hospital — operan sobre todos los tenants.
    """
    if user.get("rol") != SUPERADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta ruta es exclusiva del rol SuperAdmin de SIGAH.",
        )
    return user
