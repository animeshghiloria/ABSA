<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenEnv-Compliant-purple" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

# 🧠 ABSA — Adaptive Behavior Shaping Agent

**ABSA** is a reinforcement learning environment and interactive dashboard for training AI agents that act as **digital wellness coaches**. The agent learns to reduce a simulated user's screen addiction, build healthy habits, and maintain wellbeing — all while avoiding frustrating the user with excessive interventions.

> Think of it as an AI that learns *when to nudge you to take a break, work out, or sleep* — and when to leave you alone.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [The RL Environment](#the-rl-environment)
  - [Observation Space](#observation-space)
  - [Action Space](#action-space)
  - [Reward Function](#reward-function)
  - [Compliance Model](#compliance-model)
  - [Personality Presets](#personality-presets)
- [Tasks & Grading](#tasks--grading)
- [Frontend Dashboard](#frontend-dashboard)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker](#docker)
- [Baseline Inference](#baseline-inference)
- [Tech Stack](#tech-stack)

---

## Overview

ABSA frames **digital habit coaching as a Markov Decision Process (MDP)**. A simulated human user has stochastic dynamics — screen time drifts up naturally, fatigue accumulates, motivation decays, and addiction reinforces itself. An RL agent must select behavioural interventions (e.g., "suggest a break", "block an app") at each timestep to steer the user toward healthier states.

The key challenge is **balancing intervention effectiveness with user frustration** — too many aggressive actions and the user rebels; too few and the addiction wins.

The project ships with:

- ⚙️ A **Python backend** implementing the full MDP environment with a FastAPI REST API
- 🖥️ A **Next.js dashboard** providing real-time visualization of the agent's learning process
- 🤖 A **baseline inference script** that uses an LLM (e.g., Llama 3.3) as the policy
- 📊 Three graded **tasks** of increasing difficulty (Easy → Medium → Hard)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   ABSA-frontend                      │
│          Next.js 16 + React 19 + Recharts            │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────────┐ │
│  │ Dashboard │ │ RL       │ │ Stat Cards / Timeline │ │
│  │ Page      │ │ Insights │ │ / Reward Chart        │ │
│  └────┬──────┘ └────┬─────┘ └───────────┬───────────┘ │
│       │             │                   │             │
│       └─────────────┼───────────────────┘             │
│                     │ HTTP (fetch)                    │
└─────────────────────┼────────────────────────────────┘
                      │
              REST API │ (JSON)
                      ▼
┌──────────────────────────────────────────────────────┐
│                   ABSA backend                       │
│              FastAPI + Uvicorn                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  server.py  — API endpoints                  │    │
│  │  /reset  /step  /state  /grade  /tasks       │    │
│  └──────────────────┬───────────────────────────┘    │
│                     │                                │
│  ┌──────────────────▼───────────────────────────┐    │
│  │  env/environment.py  — MDP simulator         │    │
│  │  Compliance model, stochastic transitions,   │    │
│  │  multi-objective reward function              │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  tasks/ — grading functions                  │    │
│  │  screen_time_reducer │ habit_streak_builder   │    │
│  │  full_absa (multi-objective)                 │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ABSA/
├── ABSA backend/                # Python RL environment + API server
│   ├── env/                     # Core environment package
│   │   ├── __init__.py
│   │   ├── environment.py       # ABSAEnvironment — the MDP simulator
│   │   └── models.py            # Pydantic models (Observation, Action, Reward, StepInfo)
│   ├── tasks/                   # Task definitions & grading functions
│   │   ├── __init__.py          # TASK_REGISTRY
│   │   ├── base.py              # Base Task dataclass
│   │   ├── screen_time_reducer.py   # Easy task
│   │   ├── habit_streak_builder.py  # Medium task
│   │   └── full_absa.py             # Hard task (multi-objective)
│   ├── server.py                # FastAPI application with all endpoints
│   ├── inference.py             # Baseline LLM inference script
│   ├── test_api.py              # Integration tests for end-to-end API validation
│   ├── openenv.yaml             # OpenEnv specification file
│   ├── Dockerfile               # Multi-stage build (Node frontend + Python backend)
│   └── requirements.txt         # Python dependencies
│
├── ABSA-frontend/               # Next.js interactive dashboard
│   ├── app/
│   │   ├── page.tsx             # Main dashboard page (live + offline modes)
│   │   ├── layout.tsx           # Root layout with theme provider
│   │   └── globals.css          # Global styles
│   ├── components/
│   │   ├── dashboard/           # Dashboard-specific components
│   │   │   ├── sidebar.tsx      # Navigation & controls sidebar
│   │   │   ├── stat-card.tsx    # Metric cards (screen time, energy, etc.)
│   │   │   ├── timeline.tsx     # Action timeline with outcomes
│   │   │   ├── reward-chart.tsx # Step-by-step reward visualization
│   │   │   ├── episode-score.tsx# Episode grading results
│   │   │   ├── rl-insights.tsx  # Q-table & learning analytics
│   │   │   └── insight-card.tsx # AI-generated insights
│   │   ├── ui/                  # shadcn/ui component library
│   │   └── theme-provider.tsx   # Dark/light theme support
│   ├── lib/
│   │   ├── api.ts               # Backend HTTP client
│   │   └── rl-engine.ts         # Client-side RL engine (offline mode)
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md                    # ← You are here
```

---

## The RL Environment

### Observation Space

At every step, the agent receives an observation with **11 features**:

| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| `screen_time` | float | 0–12 | Hours of screen usage today |
| `focus_level` | float | 0–1 | Current focus / concentration |
| `energy` | float | 0–1 | Physical & mental energy level |
| `habit_streak` | int | 0–30 | Consecutive days of good habits |
| `addiction_score` | float | 0–1 | Latent digital addiction level |
| `frustration` | float | 0–1 | User frustration from over-control |
| `motivation` | float | 0–1 | Willingness to comply with suggestions |
| `fatigue` | float | 0–1 | Accumulated tiredness |
| `time_of_day` | string | — | `morning` \| `afternoon` \| `evening` \| `night` |
| `step` | int | 0+ | Current step in the episode |
| `last_action_complied` | bool? | — | Whether the user complied with the last action |

### Action Space

The agent can choose from **6 interventions** each step:

| Action | Effect | Risk |
|--------|--------|------|
| `delay_notification` | Push distracting alerts back 30 min | Low — usually accepted |
| `block_app` | Hard-block a distracting app temporarily | High — generates frustration, addicted users resist |
| `suggest_workout` | Nudge toward physical activity | Medium — requires energy |
| `suggest_break` | Suggest a short screen-free break | Low-Medium — effective when screen time is high |
| `suggest_sleep` | Encourage winding down and sleeping | Context-dependent — great at night, bad in morning |
| `noop` | Do nothing this step | Safe — reduces frustration but screen time drifts up |

### Reward Function

The reward is **multi-objective**, combining 6 components:

| Component | Incentive | Weight |
|-----------|-----------|--------|
| **Screen Time Reward** | Lower screen time → higher reward; bonus under 2h | Positive |
| **Habit Reward** | Longer streaks → higher reward; 7+ days = max | Positive |
| **Wellbeing Reward** | Weighted sum of energy, motivation, focus minus fatigue | Positive |
| **Frustration Penalty** | Sharp penalty above 0.4, severe above 0.7 | Negative |
| **Overcontrol Penalty** | Penalty for 4+ consecutive interventions | Negative |
| **Compliance Bonus** | +1.0 if user complied, −0.5 if ignored | ±1.0 |

### Compliance Model

Users don't always follow suggestions. Compliance probability is computed based on:

- **Base personality** — disciplined users comply more (~80%), impulsive users resist (~35%)
- **Current motivation & energy** — tired, unmotivated users comply less
- **Frustration** — high frustration significantly reduces compliance
- **Action context** — suggesting sleep at night gets a +20% bonus; suggesting sleep in the morning gets a −25% penalty
- **Consecutive interventions** — 3+ interventions in a row fatigue the user's willingness
- **Clamped** to [5%, 95%] — there's always a small chance either way

### Personality Presets

The environment supports **5 personality profiles** that set initial state and compliance tendency:

| Personality | Screen Time | Addiction | Frustration | Compliance | Description |
|-------------|-------------|-----------|-------------|------------|-------------|
| `disciplined` | 2.5h | 0.20 | 0.05 | 80% | High-functioning user, low addiction |
| `balanced` | 5.0h | 0.50 | 0.15 | 55% | Average user with moderate habits |
| `impulsive` | 7.0h | 0.70 | 0.30 | 35% | High screen time, low self-control |
| `struggling` | 8.0h | 0.85 | 0.40 | 30% | Deeply addicted, fatigued, unmotivated |
| `random` | Random | Random | Random | Random | All values randomized uniformly |

---

## Tasks & Grading

Each task defines a specific challenge with a **grading function** that scores the agent's performance on a **0.0 – 1.0 scale**:

### 🟢 Screen Time Reducer (Easy)
- **Max Steps:** 10
- **Goal:** Reduce screen time from the initial level to under 2 hours
- **Constraint:** Don't spike frustration above 0.8
- **Grading:** 75% based on drop achieved, 10% bonus for hitting target, 5% for finishing early, −15% for high frustration

### 🟡 Habit Streak Builder (Medium)
- **Max Steps:** 15
- **Goal:** Build a 7-day habit streak
- **Constraint:** Keep frustration below 0.7
- **Grading:** 70% streak achievement, 20% frustration management, 10% addiction reduction bonus

### 🔴 Full ABSA — Multi-Objective (Hard)
- **Max Steps:** 20
- **Goal:** Simultaneously reduce addiction, build streaks, lower screen time, manage frustration, and maintain energy
- **Grading:** Weighted composite — 25% addiction reduction, 25% streak building, 20% screen time, 20% frustration management, 10% energy maintenance

### Episode Termination
An episode ends when:
1. The agent reaches `max_steps`, **or**
2. User frustration hits **≥ 0.95** (the user ragequits)

---

## Frontend Dashboard

The Next.js dashboard provides a rich, real-time visualization of the RL agent in action:

- **📊 State Snapshot** — 8 metric cards showing screen time, addiction, energy, habit streak, focus, motivation, fatigue, and frustration with trend indicators
- **📈 Reward Chart** — Step-by-step and cumulative reward plotted via Recharts
- **📜 Action Timeline** — Scrollable feed of every action taken, whether the user complied, and the resulting reward breakdown
- **🧠 RL Insights Panel** — Q-table heatmap, exploration rate, learning history, and policy analysis
- **🏆 Episode Score** — End-of-episode grading with task-specific scoring breakdown
- **💡 Insight Card** — AI-generated natural language interpretation of the current state

### Operating Modes

| Mode | Backend Required | Description |
|------|-----------------|-------------|
| **🔴 Live** | ✅ Yes | Steps are sent to the FastAPI backend; uses the full stochastic MDP |
| **⚡ Offline** | ❌ No | Client-side RL engine simulates a simplified environment locally |

The dashboard auto-detects backend availability and falls back to offline mode if the server is unreachable.

---

## API Reference

All endpoints are served by `server.py` on port **7860** (default).

### `POST /reset`
Start a new episode.

**Request Body:**
```json
{
  "task_id": "full_absa",
  "personality": "balanced",
  "seed": 42
}
```

**Response:**
```json
{
  "observation": { "screen_time": 5.0, "focus_level": 0.55, ... },
  "task_id": "full_absa",
  "max_steps": 20
}
```

### `POST /step`
Execute one timestep.

**Request Body:**
```json
{ "action_type": "suggest_break" }
```

**Response:**
```json
{
  "observation": { ... },
  "reward": { "total": 3.45, "screen_time_reward": 1.2, ... },
  "done": false,
  "info": { "step": 1, "action_taken": "suggest_break", "user_complied": true, ... }
}
```

### `POST /grade`
Score a completed episode.

**Request Body:**
```json
{
  "task_id": "full_absa",
  "initial_obs": { ... },
  "final_obs": { ... },
  "cumulative_reward": 45.2,
  "step_count": 20
}
```

**Response:**
```json
{ "task_id": "full_absa", "score": 0.7234, "score_range": [0.0, 1.0] }
```

### `GET /tasks`
List all available tasks with descriptions.

### `GET /state`
Return the full internal environment state (for debugging).

### `GET /health`
Health check endpoint. Returns `{ "status": "ok", "environment": "absa-v1" }`.

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **npm** or **pnpm**

### Backend Setup

```bash
# Navigate to backend
cd "ABSA backend"

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn server:app --host 0.0.0.0 --port 7860 --reload
```

The API will be available at `http://localhost:7860`. Verify with:
```bash
curl http://localhost:7860/health
```

### Frontend Setup

```bash
# Navigate to frontend
cd ABSA-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The dashboard will be available at `http://localhost:3000` and will automatically connect to the backend at `http://localhost:7860`.

### Docker

Build and run everything with Docker:

```bash
cd "ABSA backend"
docker build -t absa .
docker run -p 7860:7860 absa
```

This multi-stage build compiles the React frontend and serves it alongside the Python API.

---

## Baseline Inference

The included `inference.py` script runs an LLM-based agent against all three tasks:

```bash
cd "ABSA backend"

# Set environment variables
export HF_TOKEN="your_huggingface_token"
export MODEL_NAME="meta-llama/Llama-3.3-70B-Instruct"
export API_BASE_URL="https://router.huggingface.co/v1"

# Run the baseline
python inference.py
```

The script:
1. Resets the environment for each task
2. Feeds the observation state to the LLM each step
3. Parses the LLM's response into a valid action
4. Grades each episode and prints a summary

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **RL Environment** | Python 3.11, NumPy |
| **API Server** | FastAPI, Uvicorn, Pydantic |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons |
| **Styling** | Tailwind CSS 4 |
| **Charts** | Recharts |
| **LLM Integration** | OpenAI SDK (compatible with HF Inference API) |
| **Deployment** | Docker, Hugging Face Spaces |

---


