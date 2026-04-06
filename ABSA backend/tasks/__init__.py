"""
tasks/__init__.py
-----------------
Registry of all available tasks. server.py imports TASK_REGISTRY from here.
"""

from .screen_time_reducer import TASK as _easy
from .habit_streak_builder import TASK as _medium
from .full_absa import TASK as _hard

TASK_REGISTRY = {
    _easy.id:   _easy,
    _medium.id: _medium,
    _hard.id:   _hard,
}

__all__ = ["TASK_REGISTRY"]
