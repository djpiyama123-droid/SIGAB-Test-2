"""
conftest local de tests_unit/ — tests DB-free del router IA híbrido.

Separado de tests/conftest.py (que tiene un fixture session-autouse que crea el
schema MySQL sigah_test): estos tests mockean los backends y NO requieren MySQL,
clave ni red. Solo aseguramos que el backend root sea importable y que las
fixtures async usen el loop de pytest-asyncio.
"""

import os
import sys

import pytest_asyncio  # noqa: F401  (asegura que el plugin esté cargado)

# Backend root (sigab-backend/) importable desde cualquier cwd.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
