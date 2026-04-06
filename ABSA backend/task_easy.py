from env.environment import ABSAEnvironment
from env.models import Action, ActionType

TASK_ID = "screen_time_reducer"
MAX_STEPS = 10
TARGET_SCREEN_TIME = 2.0
FRUSTRATION_PENALTY_THRESHOLD = 0.8

TASK_META = {
    "id": TASK_ID,
    "name": "Screen Time Reducer",
    "difficulty": "easy",
    "max_steps": MAX_STEPS,
    "description": f"Reduce screen time to under {TARGET_SCREEN_TIME}h within {MAX_STEPS} steps.",
    "score_range": [0.0, 1.0],
}

def run_and_grade(agent_fn, personality="balanced", seed=42):
    env = ABSAEnvironment(task_id=TASK_ID, max_steps=MAX_STEPS, personality=personality, seed=seed)
    obs = env.reset()
    initial_screen_time = obs.screen_time
    frustration_penalised = False
    done = False
    steps_taken = 0
    final_screen_time = obs.screen_time

    while not done:
        action = agent_fn(obs)
        obs, reward, done, info = env.step(action)
        steps_taken += 1
        final_screen_time = obs.screen_time
        if obs.frustration >= FRUSTRATION_PENALTY_THRESHOLD:
            frustration_penalised = True

    drop_needed = max(0.01, initial_screen_time - TARGET_SCREEN_TIME)
    drop_achieved = max(0.0, initial_screen_time - final_screen_time)
    base_score = min(1.0, drop_achieved / drop_needed)
    target_hit_bonus = 0.1 if final_screen_time <= TARGET_SCREEN_TIME else 0.0
    early_bonus = 0.05 * (MAX_STEPS - steps_taken) / MAX_STEPS if final_screen_time <= TARGET_SCREEN_TIME else 0.0
    frustration_penalty = -0.15 if frustration_penalised else 0.0

    return round(max(0.0, min(1.0, base_score + target_hit_bonus + early_bonus + frustration_penalty)), 4)
