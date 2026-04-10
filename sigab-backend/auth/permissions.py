"""Single source of truth para permisos por rol y filtrado de campos.

La matriz de permisos vive aquí. El frontend tiene un espejo en
`src/hooks/usePermissions.js` — mantener sincronizados.
"""
from typing import Optional

# ── Campos del equipo ─────────────────────────────────────────────
# Los campos que NO deben aparecer en respuestas para usuarios sin
# permiso `view_confidential` (y nunca para anónimos vía QR público).
CAMPOS_CONFIDENCIALES: set[str] = {
    "serie",
    "inventario",
    "numero_contrato",
    "numero_contrato_servicio",
    "proveedor_servicio",
    "fecha_compra",
    "fecha_instalacion",
    "clase_cofepris",
    "vida_util_anios",
    "created_at",
    "updated_at",
}

# Campos que un `biomedico` puede modificar vía PUT /equipos/{id}.
# Los demás roles con `edit_equipo` pueden modificar todo el set permitido.
CAMPOS_BIOMEDICO_EDITABLES: set[str] = {
    "estado",
    "ubicacion",
    "piso",
    "area",
    "fecha_ultimo_mantenimiento",
    "pos_x",
    "pos_y",
}

# Set completo de campos válidos para PUT /equipos/{id}
CAMPOS_EDITABLES_TODOS: set[str] = {
    "serie", "inventario", "nombre", "marca", "modelo", "ubicacion",
    "estado", "criticidad", "piso", "area",
    "fecha_proximo_mantenimiento", "fecha_ultimo_mantenimiento", "fecha_compra",
    "numero_contrato", "numero_contrato_servicio", "proveedor_servicio",
    "tipo_equipo", "clase_cofepris", "vida_util_anios", "zona_id",
    "pos_x", "pos_y", "imagen_url", "manual_url", "video_url",
}

# ── Matriz de permisos ────────────────────────────────────────────
# action -> set(roles)
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "view_public": {
        "biomedico", "supervisor", "jefe_servicio",
        "jefe_conservacion", "jefe_biomedica", "almacen", "admin",
    },
    "view_confidential": {
        "biomedico", "supervisor", "jefe_servicio",
        "jefe_conservacion", "jefe_biomedica", "admin",
    },
    "create_equipo": {
        "supervisor", "jefe_servicio", "jefe_conservacion",
        "jefe_biomedica", "admin",
    },
    "edit_equipo": {
        "biomedico", "supervisor", "jefe_servicio",
        "jefe_conservacion", "jefe_biomedica", "admin",
    },
    "delete_equipo": {
        "jefe_conservacion", "jefe_biomedica", "admin",
    },
    "regenerar_qr": {
        "supervisor", "jefe_servicio", "jefe_conservacion",
        "jefe_biomedica", "admin",
    },
    "admin_usuarios": {
        "jefe_biomedica", "admin",
    },
}


def can(user: Optional[dict], action: str) -> bool:
    """True si el usuario tiene permiso para `action`. user None == anónimo."""
    if action == "view_public":
        return True  # incluso anónimos
    if not user:
        return False
    rol = user.get("rol")
    if not rol:
        return False
    return rol in ROLE_PERMISSIONS.get(action, set())


def filter_equipo_publico(equipo: dict) -> dict:
    """Devuelve copia del equipo sin campos confidenciales."""
    if not equipo:
        return equipo
    return {k: v for k, v in equipo.items() if k not in CAMPOS_CONFIDENCIALES}


def allowed_update_fields(user: dict) -> set[str]:
    """Set de campos que el usuario puede modificar en PUT /equipos/{id}."""
    rol = user.get("rol")
    if rol == "biomedico":
        return CAMPOS_BIOMEDICO_EDITABLES.copy()
    return CAMPOS_EDITABLES_TODOS.copy()
