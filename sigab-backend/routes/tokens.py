"""
routes/tokens.py — Gestión de tokens API para el SIGAB WebPanel.

GET /tokens → lista de tokens Anthropic Claude registrados.
             Stub: expandir conectando a console.anthropic.com API cuando esté disponible.
"""
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user

router = APIRouter()


@router.get("")
async def listar_tokens(user: dict = Depends(get_current_user)):
    """Retorna tokens API registrados y consumo estimado."""
    return {
        "tokens": [],
        "monthly_spend_usd": 0.0,
        "tokens_used_this_month": 0,
    }
