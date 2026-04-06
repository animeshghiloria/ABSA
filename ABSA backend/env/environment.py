"""
env/environment.py
------------------
ABSAEnvironment — the core Markov Decision Process (MDP) simulator.

Models a simulated user whose digital-addiction and habit-formation
dynamics evolve stochastically.  An RL agent selects interventions
each step, and the environment transitions state + returns a
multi-objective reward.

Key subsystems
  • Personality presets  – control initial state and compliance tendency
  • Stochastic transitions – habit formation / decay, addiction
        reinforcement / reduction, motivation decay, fatigue accumulation,
        frustration from over-control, time-of-day progression
  • Multi-objective reward – incentivise reduced screen time, improved
        habits, increased wellbeing; penalise frustration and over-control
"""

from __future__ import annotations

import math
import random
from typing import Optional, Tuple

import numpy as np

from .models import (
    Action,
    ActionType,
    Observation,
    Reward,
    StepInfo,
)


# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

TIME_SLOTS = ["morning", "afternoon", "evening", "night"]

PERSONALITY_PRESETS: dict[str, dict] = {
    "disciplined": {
        "screen_time": 2.5,
        "focus_level": 0.80,
        "energy": 0.85,
        "habit_streak": 10,
        "addiction_score": 0.20,
        "frustration": 0.05,
        "motivation": 0.90,
        "fatigue": 0.10,
        "compliance_base": 0.80,
    },
    "struggling": {
        "screen_time": 8.0,
        "focus_level": 0.30,
        "energy": 0.35,
        "habit_streak": 0,
        "addiction_score": 0.85,
        "frustration": 0.40,
        "motivation": 0.25,
        "fatigue": 0.65,
        "compliance_base": 0.30,
    },
    "balanced": {
        "screen_time": 5.0,
        "focus_level": 0.55,
        "energy": 0.60,
        "habit_streak": 3,
        "addiction_score": 0.50,
        "frustration": 0.15,
        "motivation": 0.60,
        "fatigue": 0.30,
        "compliance_base": 0.55,
    },
    "impulsive": {
        "screen_time": 7.0,
        "focus_level": 0.35,
        "energy": 0.55,
        "habit_streak": 1,
        "addiction_score": 0.70,
        "frustration": 0.30,
        "motivation": 0.45,
        "fatigue": 0.40,
        "compliance_base": 0.35,
    },
    "random": {
        "screen_time": None,   # filled at reset
        "focus_level": None,
        "energy": None,
        "habit_streak": None,
        "addiction_score": None,
        "frustration": None,
        "motivation": None,
        "fatigue": None,
        "compliance_base": None,
    },
}

TASK_MAX_STEPS = {
    "screen_time_reducer": 10,
    "habit_streak_builder": 15,
    "full_absa": 20,
}


# --------------------------------------------------------------------------- #
# Helper
# --------------------------------------------------------------------------- #

def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _noise(rng: random.Random, scale: float = 0.03) -> float:
    """Small Gaussian noise."""
    return rng.gauss(0.0, scale)


# --------------------------------------------------------------------------- #
# Environment
# --------------------------------------------------------------------------- #

class ABSAEnvironment:
    """
    OpenEnv-compliant RL environment for adaptive behaviour shaping.

    Usage:
        env = ABSAEnvironment(task_id="full_absa", personality="balanced", seed=42)
        obs = env.reset()
        for _ in range(env.max_steps):
            action = agent(obs)
            obs, reward, done, info = env.step(action)
            if done:
                break
    """

    def __init__(
        self,
        task_id: str = "full_absa",
        personality: str = "balanced",
        seed: int = 42,
        max_steps: Optional[int] = None,
    ):
        self.task_id = task_id
        self.personality = personality
        self.seed = seed
        self.rng = random.Random(seed)
        self.np_rng = np.random.RandomState(seed)

        self.max_steps = max_steps or TASK_MAX_STEPS.get(task_id, 20)

        # --- mutable state (set in reset) ---
        self._step = 0
        self._done = False
        self._cumulative_reward = 0.0
        self._consecutive_interventions = 0
        self._last_action: Optional[ActionType] = None
        self._last_complied: Optional[bool] = None
        self._compliance_base = 0.55

        # State variables
        self._screen_time = 5.0
        self._focus = 0.55
        self._energy = 0.60
        self._habit_streak = 3
        self._addiction = 0.50
        self._frustration = 0.15
        self._motivation = 0.60
        self._fatigue = 0.30
        self._time_slot_idx = 0       # index into TIME_SLOTS

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    def reset(self) -> Observation:
        """Start (or restart) an episode. Returns the initial observation."""
        self.rng = random.Random(self.seed)
        self.np_rng = np.random.RandomState(self.seed)

        self._step = 0
        self._done = False
        self._cumulative_reward = 0.0
        self._consecutive_interventions = 0
        self._last_action = None
        self._last_complied = None
        self._time_slot_idx = self.rng.randint(0, 3)

        preset = PERSONALITY_PRESETS[self.personality]
        if self.personality == "random":
            self._screen_time   = round(self.rng.uniform(1.0, 10.0), 1)
            self._focus         = round(self.rng.uniform(0.2, 0.9), 2)
            self._energy        = round(self.rng.uniform(0.2, 0.9), 2)
            self._habit_streak  = self.rng.randint(0, 15)
            self._addiction     = round(self.rng.uniform(0.1, 0.9), 2)
            self._frustration   = round(self.rng.uniform(0.0, 0.5), 2)
            self._motivation    = round(self.rng.uniform(0.2, 0.9), 2)
            self._fatigue       = round(self.rng.uniform(0.1, 0.7), 2)
            self._compliance_base = round(self.rng.uniform(0.25, 0.75), 2)
        else:
            self._screen_time   = preset["screen_time"]
            self._focus         = preset["focus_level"]
            self._energy        = preset["energy"]
            self._habit_streak  = preset["habit_streak"]
            self._addiction     = preset["addiction_score"]
            self._frustration   = preset["frustration"]
            self._motivation    = preset["motivation"]
            self._fatigue       = preset["fatigue"]
            self._compliance_base = preset["compliance_base"]

        return self._observe()

    def step(self, action: Action) -> Tuple[Observation, Reward, bool, StepInfo]:
        """Execute one timestep: apply action, transition state, compute reward."""
        if self._done:
            raise RuntimeError("Episode is already done. Call reset() first.")

        self._step += 1
        act = action.action_type

        # 1) Determine user compliance
        complied = self._resolve_compliance(act)
        self._last_complied = complied
        self._last_action = act

        # Track consecutive active interventions (everything except noop)
        if act != ActionType.noop:
            self._consecutive_interventions += 1
        else:
            self._consecutive_interventions = max(0, self._consecutive_interventions - 1)

        # 2) Transition state stochastically
        self._transition(act, complied)

        # 3) Advance time of day
        if self._step % max(1, self.max_steps // 4) == 0:
            self._time_slot_idx = min(self._time_slot_idx + 1, len(TIME_SLOTS) - 1)

        # 4) Compute reward
        reward = self._compute_reward(act, complied)
        self._cumulative_reward += reward.total

        # 5) Check termination
        done_reason = None
        if self._step >= self.max_steps:
            self._done = True
            done_reason = "max_steps_reached"
        elif self._frustration >= 0.95:
            self._done = True
            done_reason = "user_too_frustrated"

        obs = self._observe()
        info = StepInfo(
            step=self._step,
            action_taken=act.value,
            user_complied=complied,
            cumulative_reward=round(self._cumulative_reward, 4),
            episode_done=self._done,
            done_reason=done_reason,
        )

        return obs, reward, self._done, info

    def state(self) -> dict:
        """Return the full internal state as a plain dict (for debugging)."""
        return {
            "step": self._step,
            "screen_time": round(self._screen_time, 2),
            "focus_level": round(self._focus, 2),
            "energy": round(self._energy, 2),
            "habit_streak": self._habit_streak,
            "addiction_score": round(self._addiction, 2),
            "frustration": round(self._frustration, 2),
            "motivation": round(self._motivation, 2),
            "fatigue": round(self._fatigue, 2),
            "time_of_day": TIME_SLOTS[self._time_slot_idx],
            "compliance_base": round(self._compliance_base, 2),
            "consecutive_interventions": self._consecutive_interventions,
            "cumulative_reward": round(self._cumulative_reward, 4),
            "done": self._done,
        }

    # ------------------------------------------------------------------ #
    # Compliance model
    # ------------------------------------------------------------------ #

    def _resolve_compliance(self, act: ActionType) -> bool:
        """
        Probabilistic compliance model.
        Factors: base personality, current motivation, energy, frustration,
                 action appropriateness, and time-of-day context.
        """
        if act == ActionType.noop:
            return True   # no action — no compliance needed

        p = self._compliance_base

        # Motivational modifier
        p += (self._motivation - 0.5) * 0.20

        # Energy modifier — tired users resist more
        p += (self._energy - 0.5) * 0.15

        # High frustration → lower compliance
        p -= self._frustration * 0.30

        # Action-specific context bonuses / penalties
        tod = TIME_SLOTS[self._time_slot_idx]

        if act == ActionType.suggest_sleep:
            if tod == "night":
                p += 0.20
            elif tod == "morning":
                p -= 0.25          # suggesting sleep in the morning is silly

        if act == ActionType.suggest_workout:
            if self._energy > 0.5:
                p += 0.10
            else:
                p -= 0.15          # low energy → won't work out

        if act == ActionType.suggest_break:
            if self._screen_time > 4.0:
                p += 0.15
            if self._fatigue > 0.6:
                p += 0.10

        if act == ActionType.block_app:
            p -= self._addiction * 0.20   # addicted users resist blocks
            if self._frustration > 0.4:
                p -= 0.15

        if act == ActionType.delay_notification:
            p += 0.10    # mild — usually accepted

        # Consecutive interventions fatigue
        if self._consecutive_interventions > 2:
            p -= 0.05 * (self._consecutive_interventions - 2)

        p = _clamp(p, 0.05, 0.95)  # always a small chance either way
        return self.rng.random() < p

    # ------------------------------------------------------------------ #
    # Stochastic state transitions
    # ------------------------------------------------------------------ #

    def _transition(self, act: ActionType, complied: bool) -> None:
        """
        Advance all state variables one timestep.
        Effects depend on (action, compliance) plus stochastic drift.
        """
        noise = lambda s=0.02: _noise(self.rng, s)

        # ---- Screen time ----
        # Drifts up naturally (user gravitates to screens)
        screen_drift = 0.15 + self._addiction * 0.20
        self._screen_time += screen_drift + noise(0.1)

        if complied:
            if act == ActionType.block_app:
                self._screen_time -= 1.0 + noise(0.15)
            elif act == ActionType.suggest_break:
                self._screen_time -= 0.5 + noise(0.1)
            elif act == ActionType.delay_notification:
                self._screen_time -= 0.3 + noise(0.05)
            elif act == ActionType.suggest_workout:
                self._screen_time -= 0.6 + noise(0.1)
            elif act == ActionType.suggest_sleep:
                self._screen_time -= 0.4 + noise(0.1)
        self._screen_time = round(_clamp(self._screen_time, 0.0, 12.0), 2)

        # ---- Addiction score ----
        # Natural reinforcement when screen time is high
        addiction_drift = 0.01 * (self._screen_time / 6.0) + noise(0.01)
        self._addiction += addiction_drift

        if complied:
            if act == ActionType.block_app:
                self._addiction -= 0.06 + noise(0.01)
            elif act == ActionType.suggest_break:
                self._addiction -= 0.03 + noise(0.01)
            elif act == ActionType.suggest_workout:
                self._addiction -= 0.04 + noise(0.01)
            elif act == ActionType.delay_notification:
                self._addiction -= 0.02 + noise(0.005)
        else:
            # Ignoring interventions slightly reinforces addiction
            if act != ActionType.noop:
                self._addiction += 0.02
        self._addiction = round(_clamp(self._addiction), 2)

        # ---- Focus ----
        focus_drift = -0.02 + noise(0.02)
        self._focus += focus_drift
        if complied:
            if act in (ActionType.suggest_break, ActionType.delay_notification):
                self._focus += 0.08 + noise(0.02)
            if act == ActionType.block_app:
                self._focus += 0.06 + noise(0.02)
        # Low screen time helps focus
        if self._screen_time < 3.0:
            self._focus += 0.03
        self._focus = round(_clamp(self._focus), 2)

        # ---- Energy ----
        energy_drift = -0.03 + noise(0.02)       # naturally declines
        self._energy += energy_drift
        if complied:
            if act == ActionType.suggest_workout:
                # Short-term dip then boost
                self._energy += 0.08 + noise(0.02)
            if act == ActionType.suggest_sleep:
                self._energy += 0.15 + noise(0.03)
            if act == ActionType.suggest_break:
                self._energy += 0.05 + noise(0.02)
        self._energy = round(_clamp(self._energy), 2)

        # ---- Fatigue ----
        fatigue_drift = 0.04 + noise(0.02)
        self._fatigue += fatigue_drift
        if complied:
            if act == ActionType.suggest_sleep:
                self._fatigue -= 0.20 + noise(0.03)
            if act == ActionType.suggest_break:
                self._fatigue -= 0.08 + noise(0.02)
            if act == ActionType.suggest_workout:
                self._fatigue -= 0.05 + noise(0.02)
        self._fatigue = round(_clamp(self._fatigue), 2)

        # ---- Motivation ----
        # Decays naturally, boosted by success and streaks
        motivation_drift = -0.02 + noise(0.02)
        self._motivation += motivation_drift
        if complied:
            self._motivation += 0.04  # positive reinforcement of compliance
            if self._habit_streak > 5:
                self._motivation += 0.02
        else:
            self._motivation -= 0.03  # failure discourages
        self._motivation = round(_clamp(self._motivation), 2)

        # ---- Frustration ----
        # Decays slowly, increases with forceful interventions
        frustration_decay = -0.03 + noise(0.01)
        self._frustration += frustration_decay

        if act == ActionType.noop:
            self._frustration -= 0.02   # doing nothing reduces frustration

        if not complied and act != ActionType.noop:
            # User didn't comply AND was pushed — frustrating
            self._frustration += 0.08 + noise(0.02)

        if act == ActionType.block_app:
            # Forceful action always generates some frustration
            self._frustration += 0.06 + noise(0.02)

        if self._consecutive_interventions > 3:
            # Over-control frustration
            self._frustration += 0.04 * (self._consecutive_interventions - 3)

        self._frustration = round(_clamp(self._frustration), 2)

        # ---- Habit streak ----
        # Streak advances when user does something positive & complied
        if complied and act in (
            ActionType.suggest_workout,
            ActionType.suggest_break,
            ActionType.suggest_sleep,
        ):
            # Probabilistic streak increment (not every compliance = streak day)
            if self.rng.random() < 0.4 + self._motivation * 0.3:
                self._habit_streak = min(30, self._habit_streak + 1)
        elif not complied and act != ActionType.noop:
            # Missed chance can break streak
            if self.rng.random() < 0.15:
                self._habit_streak = max(0, self._habit_streak - 1)

        # ---- Compliance base drift (latent) ----
        # Successful interactions gradually raise baseline compliance
        if complied:
            self._compliance_base = _clamp(self._compliance_base + 0.005)
        else:
            self._compliance_base = _clamp(self._compliance_base - 0.008)

    # ------------------------------------------------------------------ #
    # Reward function
    # ------------------------------------------------------------------ #

    def _compute_reward(self, act: ActionType, complied: bool) -> Reward:
        """
        Multi-objective reward function.

        Positive incentives:
          • Screen time reduction from previous level
          • Habit streak maintenance / growth
          • Improved energy + motivation (wellbeing)

        Negative penalties:
          • High frustration
          • Over-control (too many consecutive interventions)
          • Ineffective actions (user ignored)
        """

        # --- Screen time ---
        # Reward proportional to how far below 4 h the user is
        if self._screen_time <= 2.0:
            screen_r = 3.0
        elif self._screen_time <= 4.0:
            screen_r = 2.0 * (4.0 - self._screen_time) / 2.0
        else:
            screen_r = -0.5 * (self._screen_time - 4.0)
        screen_r = round(screen_r, 3)

        # --- Habit streak ---
        habit_r = 0.0
        if self._habit_streak >= 7:
            habit_r = 3.0
        elif self._habit_streak >= 3:
            habit_r = 1.0 + 0.5 * (self._habit_streak - 3)
        else:
            habit_r = 0.3 * self._habit_streak
        habit_r = round(habit_r, 3)

        # --- Wellbeing ---
        wellbeing_r = (
            1.5 * self._energy
            + 1.0 * self._motivation
            + 0.5 * self._focus
            - 1.0 * self._fatigue
        )
        wellbeing_r = round(wellbeing_r, 3)

        # --- Frustration penalty ---
        if self._frustration > 0.7:
            frust_p = -4.0 * (self._frustration - 0.3)
        elif self._frustration > 0.4:
            frust_p = -1.5 * (self._frustration - 0.2)
        else:
            frust_p = 0.0
        frust_p = round(frust_p, 3)

        # --- Over-control penalty ---
        overcontrol_p = 0.0
        if self._consecutive_interventions > 3:
            overcontrol_p = -0.8 * (self._consecutive_interventions - 3)
        overcontrol_p = round(overcontrol_p, 3)

        # --- Compliance bonus ---
        compliance_b = 1.0 if complied and act != ActionType.noop else 0.0
        if not complied and act != ActionType.noop:
            compliance_b = -0.5    # penalty for ineffective action

        total = screen_r + habit_r + wellbeing_r + frust_p + overcontrol_p + compliance_b
        total = round(total, 4)

        return Reward(
            total=total,
            screen_time_reward=screen_r,
            habit_reward=habit_r,
            wellbeing_reward=wellbeing_r,
            frustration_penalty=frust_p,
            overcontrol_penalty=overcontrol_p,
            compliance_bonus=compliance_b,
        )

    # ------------------------------------------------------------------ #
    # Observation builder
    # ------------------------------------------------------------------ #

    def _observe(self) -> Observation:
        return Observation(
            screen_time=round(self._screen_time, 1),
            focus_level=round(self._focus, 2),
            energy=round(self._energy, 2),
            habit_streak=self._habit_streak,
            addiction_score=round(self._addiction, 2),
            frustration=round(self._frustration, 2),
            time_of_day=TIME_SLOTS[self._time_slot_idx],
            motivation=round(self._motivation, 2),
            fatigue=round(self._fatigue, 2),
            step=self._step,
            last_action_complied=self._last_complied,
        )
