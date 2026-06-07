"""Hashing y verificación de contraseñas con bcrypt."""
import re

from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Política mínima para un sistema hospitalario (NOM-016 / ISO-13485).
MIN_PASSWORD_LEN = 10


def validate_password_strength(password: str) -> None:
    """Valida la fortaleza de una contraseña nueva.

    Reglas: ≥10 caracteres, al menos una letra y al menos un dígito.
    Lanza ValueError con un mensaje en español si no cumple.
    """
    if not password or len(password) < MIN_PASSWORD_LEN:
        raise ValueError(
            f"La contraseña debe tener al menos {MIN_PASSWORD_LEN} caracteres"
        )
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("La contraseña debe incluir al menos una letra y un número")


def hash_password(plain: str) -> str:
    """Devuelve hash bcrypt de la contraseña en texto plano."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Compara una contraseña en texto plano contra un hash bcrypt."""
    if not hashed:
        return False
    try:
        return _pwd_context.verify(plain, hashed)
    except Exception:
        return False
