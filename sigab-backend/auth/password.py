"""Hashing y verificación de contraseñas con bcrypt."""
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
