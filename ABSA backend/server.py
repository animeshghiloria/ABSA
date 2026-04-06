"""
server.py
---------
FastAPI server exposing the ABSA OpenEnv environment.

Endpoints:
    POST /reset    Start a new episode
    POST /step     Take one action
    GET  /state    Current environment state
    GET  /tasks    List tasks + descriptions
    POST /grade    Score a completed episode
    GET  /health   Health check for HF Spaces validator
    GET  /         React dashboard (frontend/dist/)
"""

import os
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from env import ABSAEnvironment, Action, ActionType
from env.models import Observation
from tasks import TASK_REGISTRY


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ResetRequest(BaseModel):
    task_id: str = "full_absa"
    personality: str = "balanced"
    seed: int = 42


class StepRequest(BaseModel):
    action_type: str


class GradeRequest(BaseModel):
    task_id: str
    initial_obs: dict
    final_obs: dict
    cumulative_reward: float
    step_count: int


# ---------------------------------------------------------------------------
# App-level state
# ---------------------------------------------------------------------------

_env: Optional[ABSAEnvironment] = None
_initial_obs: Optional[Observation] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _env, _initial_obs
    _env = ABSAEnvironment(task_id="full_absa", personality="balanced", seed=42)
    _initial_obs = _env.reset()
    yield


app = FastAPI(
    title="ABSA — Adaptive Behavior Shaping Agent Environment",
    description="OpenEnv-compliant RL environment for digital habit coaching.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# OpenEnv endpoints
# ---------------------------------------------------------------------------

@app.post("/reset")
def reset(req: ResetRequest):
    global _env, _initial_obs
    valid_tasks = list(TASK_REGISTRY.keys())
    if req.task_id not in valid_tasks:
        raise HTTPException(422, f"Unknown task_id '{req.task_id}'. Valid: {valid_tasks}")
    valid_personalities = ["disciplined", "struggling", "balanced", "impulsive", "random"]
    if req.personality not in valid_personalities:
        raise HTTPException(422, f"Unknown personality. Valid: {valid_personalities}")

    _env = ABSAEnvironment(task_id=req.task_id, personality=req.personality, seed=req.seed)
    obs = _env.reset()
    _initial_obs = obs
    return {"observation": obs.model_dump(), "task_id": req.task_id, "max_steps": _env.max_steps}


@app.post("/step")
def step(req: StepRequest):
    if _env is None:
        raise HTTPException(400, "Call /reset first.")
    valid_actions = [a.value for a in ActionType]
    if req.action_type not in valid_actions:
        raise HTTPException(422, f"Unknown action '{req.action_type}'. Valid: {valid_actions}")
    try:
        obs, reward, done, info = _env.step(Action(action_type=ActionType(req.action_type)))
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))
    return {"observation": obs.model_dump(), "reward": reward.model_dump(), "done": done, "info": info.model_dump()}


@app.get("/state")
def state():
    if _env is None:
        raise HTTPException(400, "Call /reset first.")
    return _env.state()


@app.get("/tasks")
def list_tasks():
    return {"tasks": [
        {"task_id": "screen_time_reducer", "difficulty": "easy",   "max_steps": 10,
         "description": "Reduce screen time from ~6h to under 2h without spiking frustration."},
        {"task_id": "habit_streak_builder", "difficulty": "medium", "max_steps": 15,
         "description": "Build a 7-day habit streak while keeping frustration below 0.75."},
        {"task_id": "full_absa",            "difficulty": "hard",   "max_steps": 20,
         "description": "Multi-objective: cut screen time, reduce addiction, build streak, maintain wellbeing."},
    ]}


@app.post("/grade")
def grade(req: GradeRequest):
    if req.task_id not in TASK_REGISTRY:
        raise HTTPException(422, f"Unknown task_id '{req.task_id}'.")
    try:
        initial_obs = Observation(**req.initial_obs)
        final_obs   = Observation(**req.final_obs)
    except Exception as exc:
        raise HTTPException(422, f"Invalid observation: {exc}")
    score = TASK_REGISTRY[req.task_id].grade(
        initial_obs=initial_obs, final_obs=final_obs,
        cumulative_reward=req.cumulative_reward, step_count=req.step_count,
    )
    return {"task_id": req.task_id, "score": score, "score_range": [0.0, 1.0]}


@app.get("/health")
def health():
    return {"status": "ok", "environment": "absa-v1"}


# ---------------------------------------------------------------------------
# Serve React frontend AFTER all API routes
# ---------------------------------------------------------------------------

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
