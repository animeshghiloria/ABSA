"""
inference.py
------------
Baseline inference script for the ABSA environment.

Mandatory environment variables:
    API_BASE_URL   LLM API endpoint (e.g. https://router.huggingface.co/v1)
    MODEL_NAME     Model identifier
    HF_TOKEN       Hugging Face / API key

Usage:
    python inference.py
"""

import os
import json
import textwrap

import httpx
from openai import OpenAI

# ── Config ────────────────────────────────────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL") or "https://router.huggingface.co/v1"
API_KEY      = os.getenv("HF_TOKEN") or os.getenv("API_KEY", "")
MODEL_NAME   = os.getenv("MODEL_NAME", "meta-llama/Llama-3.3-70B-Instruct")
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860")

TASKS        = ["screen_time_reducer", "habit_streak_builder", "full_absa"]
TEMPERATURE  = 0.2
MAX_TOKENS   = 60
FALLBACK_ACTION = "noop"
VALID_ACTIONS = [
    "delay_notification", "block_app", "suggest_workout",
    "suggest_break", "suggest_sleep", "noop",
]

SYSTEM_PROMPT = textwrap.dedent("""
    You are an AI wellness coach controlling a behavior-change environment.
    At each step you see a user's current state and must choose one intervention.

    Available actions:
      delay_notification  — push distracting alerts back 30 minutes
      block_app           — hard-block a distracting app temporarily
      suggest_workout     — nudge the user toward physical activity
      suggest_break       — suggest a short screen-free break
      suggest_sleep       — encourage the user to wind down and sleep
      noop                — do nothing this step

    Rules:
    - Reply with EXACTLY one action string from the list above.
    - No explanation. No punctuation. Just the action word.
    - If unsure, reply: noop
""").strip()


# ── Helpers ───────────────────────────────────────────────────────────────────

def env_post(path: str, body: dict) -> dict:
    r = httpx.post(f"{ENV_BASE_URL}{path}", json=body, timeout=30)
    r.raise_for_status()
    return r.json()


def env_get(path: str) -> dict:
    r = httpx.get(f"{ENV_BASE_URL}{path}", timeout=10)
    r.raise_for_status()
    return r.json()


def build_user_prompt(obs: dict, step: int) -> str:
    return textwrap.dedent(f"""
        Step {step}
        Screen time:    {obs['screen_time']:.1f}h
        Addiction:      {obs['addiction_score']:.2f}
        Frustration:    {obs['frustration']:.2f}
        Energy:         {obs['energy']:.2f}
        Motivation:     {obs['motivation']:.2f}
        Fatigue:        {obs['fatigue']:.2f}
        Habit streak:   {obs['habit_streak']} days
        Time of day:    {obs['time_of_day']}
        Last complied:  {obs.get('last_action_complied')}

        Choose one action:
    """).strip()


def parse_action(text: str) -> str:
    text = text.strip().lower().split()[0] if text.strip() else ""
    return text if text in VALID_ACTIONS else FALLBACK_ACTION


# ── Main loop ─────────────────────────────────────────────────────────────────

def run_task(client: OpenAI, task_id: str) -> float:
    print(f"\n{'='*50}")
    print(f"Task: {task_id}")
    print('='*50)

    data = env_post("/reset", {"task_id": task_id, "personality": "balanced", "seed": 42})
    obs         = data["observation"]
    initial_obs = obs.copy()
    max_steps   = data["max_steps"]

    cumulative_reward = 0.0
    step_count = 0

    for step in range(1, max_steps + 1):
        user_prompt = build_user_prompt(obs, step)

        try:
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS,
            )
            raw = completion.choices[0].message.content or ""
        except Exception as exc:
            print(f"  [Step {step}] LLM error: {exc}. Using noop.")
            raw = FALLBACK_ACTION

        action = parse_action(raw)
        print(f"  Step {step:2d}: {action:<22} ", end="")

        result = env_post("/step", {"action_type": action})
        obs    = result["observation"]
        reward = result["reward"]["total"]
        done   = result["done"]

        cumulative_reward += reward
        step_count += 1

        print(f"reward={reward:+.1f}  frustration={obs['frustration']:.2f}  streak={obs['habit_streak']}")

        if done:
            print(f"  Episode done at step {step}.")
            break

    # Grade the episode
    grade_result = env_post("/grade", {
        "task_id":           task_id,
        "initial_obs":       initial_obs,
        "final_obs":         obs,
        "cumulative_reward": cumulative_reward,
        "step_count":        step_count,
    })

    score = grade_result["score"]
    print(f"\n  Cumulative reward : {cumulative_reward:+.2f}")
    print(f"  Final score       : {score:.4f}  (0.0 – 1.0)")
    return score


def main():
    client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

    scores = {}
    for task_id in TASKS:
        scores[task_id] = run_task(client, task_id)

    print(f"\n{'='*50}")
    print("BASELINE RESULTS")
    print('='*50)
    for task_id, score in scores.items():
        print(f"  {task_id:<28} {score:.4f}")
    avg = sum(scores.values()) / len(scores)
    print(f"  {'AVERAGE':<28} {avg:.4f}")


if __name__ == "__main__":
    main()
