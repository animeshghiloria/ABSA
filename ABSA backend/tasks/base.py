"""
tasks/base.py
-------------
Base Task class that defines the grading interface.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from env.models import Observation


@dataclass
class Task:
    """
    A task defines a specific challenge for the RL agent.

    Each task has:
      • id, name, difficulty, max_steps  – metadata
      • description  – human-readable goal
      • grade()      – score an episode [0.0, 1.0] based on initial/final obs,
                       cumulative reward, and step count
    """
    id: str
    name: str
    difficulty: str
    max_steps: int
    description: str
    _grade_fn: Callable[..., float] = field(repr=False)

    def grade(
        self,
        initial_obs: Observation,
        final_obs: Observation,
        cumulative_reward: float,
        step_count: int,
    ) -> float:
        """Return a score in [0.0, 1.0]."""
        return self._grade_fn(
            initial_obs=initial_obs,
            final_obs=final_obs,
            cumulative_reward=cumulative_reward,
            step_count=step_count,
        )
