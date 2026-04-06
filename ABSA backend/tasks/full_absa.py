"""
tasks/full_absa.py
-------------------
Hard task: multi-objective optimisation covering all dimensions —
addiction reduction, streak building, screen time control,
frustration management, and energy maintenance.
"""

from __future__ import annotations

from env.models import Observation
from .base import Task

MAX_STEPS = 20
TARGET_ADDICTION_DROP = 0.15
TARGET_STREAK = 5
TARGET_SCREEN_TIME = 4.0
FRUSTRATION_HARD_LIMIT = 0.8
ENERGY_FLOOR = 0.3

WEIGHTS = {
    "addiction":    0.25,
    "streak":       0.25,
    "screen_time":  0.20,
    "frustration":  0.20,
    "energy":       0.10,
}


def _grade(
    initial_obs: Observation,
    final_obs: Observation,
    cumulative_reward: float,
    step_count: int,
) -> float:
    # Addiction reduction
    addiction_drop = max(0.0, initial_obs.addiction_score - final_obs.addiction_score)
    addiction_s = min(1.0, addiction_drop / TARGET_ADDICTION_DROP)

    # Streak building
    peak_streak = max(initial_obs.habit_streak, final_obs.habit_streak)
    streak_s = min(1.0, peak_streak / TARGET_STREAK)

    # Screen time control
    if final_obs.screen_time <= TARGET_SCREEN_TIME:
        screen_s = 1.0
    else:
        screen_s = max(
            0.0,
            1.0 - (final_obs.screen_time - TARGET_SCREEN_TIME) / TARGET_SCREEN_TIME,
        )

    # Frustration management
    if final_obs.frustration <= FRUSTRATION_HARD_LIMIT:
        frustration_s = 1.0
    else:
        frustration_s = max(0.0, 1.0 - (final_obs.frustration - FRUSTRATION_HARD_LIMIT) * 5.0)

    # Energy maintenance
    if final_obs.energy >= ENERGY_FLOOR:
        energy_s = 1.0
    else:
        energy_s = max(0.0, final_obs.energy / ENERGY_FLOOR)

    score = (
        WEIGHTS["addiction"]   * addiction_s
        + WEIGHTS["streak"]    * streak_s
        + WEIGHTS["screen_time"] * screen_s
        + WEIGHTS["frustration"] * frustration_s
        + WEIGHTS["energy"]    * energy_s
    )
    return round(max(0.0, min(1.0, score)), 4)


TASK = Task(
    id="full_absa",
    name="Full ABSA — Multi-Objective",
    difficulty="hard",
    max_steps=MAX_STEPS,
    description="Multi-objective: reduce addiction, build streak, lower screen time, manage frustration and energy.",
    _grade_fn=_grade,
)
