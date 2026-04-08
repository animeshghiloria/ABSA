"""
tasks/screen_time_reducer.py
-----------------------------
Easy task: reduce screen time from initial level to under 2 hours
without spiking frustration.
"""

from __future__ import annotations

from env.models import Observation
from .base import Task

TARGET_SCREEN_TIME = 2.0
MAX_STEPS = 10
FRUSTRATION_THRESHOLD = 0.8


def _grade(
    initial_obs: Observation,
    final_obs: Observation,
    cumulative_reward: float,
    step_count: int,
) -> float:
    drop_needed = max(0.01, initial_obs.screen_time - TARGET_SCREEN_TIME)
    drop_achieved = max(0.0, initial_obs.screen_time - final_obs.screen_time)

    # Base score: fraction of needed drop achieved
    base_score = min(1.0, drop_achieved / drop_needed)

    # Bonus for actually hitting the target
    target_bonus = 0.10 if final_obs.screen_time <= TARGET_SCREEN_TIME else 0.0

    # Bonus for finishing early
    early_bonus = 0.0
    if final_obs.screen_time <= TARGET_SCREEN_TIME:
        early_bonus = 0.05 * (MAX_STEPS - step_count) / MAX_STEPS

    # Penalty for high frustration
    frust_penalty = -0.15 if final_obs.frustration >= FRUSTRATION_THRESHOLD else 0.0

    score = base_score * 0.75 + target_bonus + early_bonus + frust_penalty
    # Clamp strictly within (0, 1) — OpenEnv rejects exact 0.0 and 1.0
    return round(max(0.0001, min(0.9999, score)), 4)


TASK = Task(
    id="screen_time_reducer",
    name="Screen Time Reducer",
    difficulty="easy",
    max_steps=MAX_STEPS,
    description=f"Reduce screen time to under {TARGET_SCREEN_TIME}h within {MAX_STEPS} steps without spiking frustration.",
    _grade_fn=_grade,
)
