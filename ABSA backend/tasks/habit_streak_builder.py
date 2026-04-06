"""
tasks/habit_streak_builder.py
------------------------------
Medium task: build a 7-day habit streak while keeping frustration manageable.
"""

from __future__ import annotations

from env.models import Observation
from .base import Task

TARGET_STREAK = 7
MAX_STEPS = 15
FRUSTRATION_LIMIT = 0.7


def _grade(
    initial_obs: Observation,
    final_obs: Observation,
    cumulative_reward: float,
    step_count: int,
) -> float:
    # Streak achievement (70% weight)
    peak_streak = max(initial_obs.habit_streak, final_obs.habit_streak)
    streak_score = min(1.0, peak_streak / TARGET_STREAK) * 0.70

    # Frustration management (20% weight)
    if final_obs.frustration <= FRUSTRATION_LIMIT:
        frustration_score = 0.20
    else:
        frustration_score = max(
            0.0,
            0.20 - (final_obs.frustration - FRUSTRATION_LIMIT) * 0.5,
        )

    # Consistency bonus (10% weight) — did addiction go down?
    addiction_improvement = max(0.0, initial_obs.addiction_score - final_obs.addiction_score)
    consistency_score = min(0.10, addiction_improvement * 0.5)

    score = streak_score + frustration_score + consistency_score
    return round(max(0.0, min(1.0, score)), 4)


TASK = Task(
    id="habit_streak_builder",
    name="Habit Streak Builder",
    difficulty="medium",
    max_steps=MAX_STEPS,
    description=f"Build a {TARGET_STREAK}-day habit streak within {MAX_STEPS} steps while keeping frustration below {FRUSTRATION_LIMIT}.",
    _grade_fn=_grade,
)
