from env.environment import ABSAEnvironment
from env.models import Action, ActionType

TASK_ID = "full_absa"
MAX_STEPS = 20
TARGET_ADDICTION_DROP = 0.15
TARGET_STREAK = 5
TARGET_SCREEN_TIME = 4.0
FRUSTRATION_HARD_LIMIT = 0.8
ENERGY_FLOOR = 0.3
WEIGHTS = {"addiction": 0.25, "streak": 0.25, "screen_time": 0.20, "frustration": 0.20, "energy": 0.10}

TASK_META = {
    "id": TASK_ID,
    "name": "Full ABSA — Multi-Objective",
    "difficulty": "hard",
    "max_steps": MAX_STEPS,
    "description": "Multi-objective: reduce addiction, build streak, lower screen time, manage frustration and energy.",
    "score_range": [0.0, 1.0],
}

def run_and_grade(agent_fn, personality="struggling", seed=42):
    env = ABSAEnvironment(task_id=TASK_ID, max_steps=MAX_STEPS, personality=personality, seed=seed)
    obs = env.reset()
    initial_addiction = obs.addiction_score
    done = False
    frustration_exceeded = False
    energy_readings = []
    frustration_readings = []
    peak_streak = obs.habit_streak

    while not done:
        action = agent_fn(obs)
        obs, reward, done, info = env.step(action)
        peak_streak = max(peak_streak, obs.habit_streak)
        energy_readings.append(obs.energy)
        frustration_readings.append(obs.frustration)
        if obs.frustration > FRUSTRATION_HARD_LIMIT:
            frustration_exceeded = True

    addiction_drop = max(0.0, initial_addiction - obs.addiction_score)
    addiction_score = min(1.0, addiction_drop / TARGET_ADDICTION_DROP)
    streak_score = min(1.0, peak_streak / TARGET_STREAK)
    screen_score = 1.0 if obs.screen_time <= TARGET_SCREEN_TIME else max(0.0, 1.0 - (obs.screen_time - TARGET_SCREEN_TIME) / TARGET_SCREEN_TIME)
    violations = sum(1 for f in frustration_readings if f > FRUSTRATION_HARD_LIMIT)
    frustration_score = 1.0 if not frustration_exceeded else max(0.0, 1.0 - violations / MAX_STEPS)
    avg_energy = sum(energy_readings) / max(1, len(energy_readings))
    energy_score = 1.0 if avg_energy >= ENERGY_FLOOR else max(0.0, avg_energy / ENERGY_FLOOR)

    score = (WEIGHTS["addiction"] * addiction_score + WEIGHTS["streak"] * streak_score +
             WEIGHTS["screen_time"] * screen_score + WEIGHTS["frustration"] * frustration_score +
             WEIGHTS["energy"] * energy_score)
    # Clamp strictly within (0, 1) — OpenEnv rejects exact 0.0 and 1.0
    return round(max(0.0001, min(0.9999, score)), 4)
