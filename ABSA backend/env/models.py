"""
env/models.py
-------------
Pydantic data-models for the ABSA environment.

Observation  – everything the agent can see at each step
Action       – what the agent submits
ActionType   – enum of available interventions
Reward       – multi-objective reward breakdown
StepInfo     – per-step diagnostic metadata
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Actions
# --------------------------------------------------------------------------- #

class ActionType(str, Enum):
    """Behavioural interventions the agent can take."""
    delay_notification = "delay_notification"
    block_app          = "block_app"
    suggest_workout    = "suggest_workout"
    suggest_break      = "suggest_break"
    suggest_sleep      = "suggest_sleep"
    noop               = "noop"


class Action(BaseModel):
    """Wrapper for an agent action."""
    action_type: ActionType


# --------------------------------------------------------------------------- #
# Observation
# --------------------------------------------------------------------------- #

class Observation(BaseModel):
    """Full observable state vector returned to the agent each step."""
    screen_time:         float = Field(..., ge=0, le=12,  description="Hours of screen usage today")
    focus_level:         float = Field(..., ge=0, le=1,   description="Current focus / concentration")
    energy:              float = Field(..., ge=0, le=1,   description="Physical & mental energy")
    habit_streak:        int   = Field(..., ge=0, le=30,  description="Consecutive days of good habits")
    addiction_score:     float = Field(..., ge=0, le=1,   description="Latent addiction level")
    frustration:         float = Field(..., ge=0, le=1,   description="User frustration (from over-control)")
    time_of_day:         str   = Field(..., description="morning | afternoon | evening | night")
    motivation:          float = Field(..., ge=0, le=1,   description="Willingness to comply")
    fatigue:             float = Field(..., ge=0, le=1,   description="Accumulated tiredness")
    step:                int   = Field(..., ge=0,         description="Current step in the episode")
    last_action_complied: Optional[bool] = Field(None, description="Did user comply with most recent action?")


# --------------------------------------------------------------------------- #
# Reward
# --------------------------------------------------------------------------- #

class Reward(BaseModel):
    """Multi-objective reward breakdown."""
    total:               float = Field(..., description="Scalar sum passed to the agent")
    screen_time_reward:  float = Field(0.0, description="Reward for reducing screen time")
    habit_reward:        float = Field(0.0, description="Reward for habit adherence")
    wellbeing_reward:    float = Field(0.0, description="Reward for energy / motivation improvements")
    frustration_penalty: float = Field(0.0, description="Penalty when user is frustrated")
    overcontrol_penalty: float = Field(0.0, description="Penalty for excessive interventions")
    compliance_bonus:    float = Field(0.0, description="Bonus when user complied with suggestion")


# --------------------------------------------------------------------------- #
# Step Info
# --------------------------------------------------------------------------- #

class StepInfo(BaseModel):
    """Per-step diagnostics returned alongside (obs, reward, done)."""
    step:                int
    action_taken:        str
    user_complied:       bool
    cumulative_reward:   float
    episode_done:        bool
    done_reason:         Optional[str] = None
