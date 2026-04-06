from env.environment import ABSAEnvironment
from env.models import Action, ActionType

TASK_ID = "habit_streak_builder"
MAX_STEPS = 15
TARGET_STREAK = 7
FRUSTRATION_LIMIT = 0.7

TASK_META = {
    "id": TASK_ID,
    "name": "Habit Streak Builder",
    "difficulty": "medium",
    "max_steps": MAX_STEPS,
    "description": f"Build a {TARGET_STREAK}-day habit streak within {MAX_STEPS} steps.",
    "score_range": [0.0, 1.0],
}

def run_and_grade(agent_fn, personality="balanced", seed=42):
    env = ABSAEnvironment(task_id=TASK_ID, max_steps=MAX_STEPS, personality=personality, seed=seed)
    obs = env.reset()
    done = False
    frustration_readings = []
    streak_resets = 0
    prev_streak = obs.habit_streak
    peak_streak = obs.habit_streak

    while not done:
        action = agent_fn(obs)
        obs, reward, done, info = env.step(action)
        frustration_readings.append(obs.frustration)
        peak_streak = max(peak_streak, obs.habit_streak)
        if obs.habit_streak == 0 and prev_streak > 0:
            streak_resets += 1
        prev_streak = obs.habit_streak

    streak_score = min(1.0, peak_streak / TARGET_STREAK) * 0.70
    avg_frustration = sum(frustration_readings) / max(1, len(frustration_readings))
    frustration_score = 0.20 if avg_frustration <= FRUSTRATION_LIMIT else max(0.0, 0.20 - (avg_frustration - FRUSTRATION_LIMIT) * 0.5)
    consistency_score = 0.10 if streak_resets == 0 else max(0.0, 0.10 - streak_resets * 0.04)

    return round(max(0.0, min(1.0, streak_score + frustration_score + consistency_score)), 4)
