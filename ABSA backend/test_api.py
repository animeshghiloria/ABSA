"""Quick integration test for the ABSA environment API."""
import httpx
import json

base = "http://127.0.0.1:7860"

# 1) Health check
r = httpx.get(f"{base}/health")
print("=== HEALTH ===")
print(r.json())

# 2) List tasks
r = httpx.get(f"{base}/tasks")
print("\n=== TASKS ===")
for t in r.json()["tasks"]:
    print(f"  {t['task_id']:30s} [{t['difficulty']}] max_steps={t['max_steps']}")

# 3) Reset  
r = httpx.post(f"{base}/reset", json={
    "task_id": "screen_time_reducer",
    "personality": "balanced",
    "seed": 42,
})
data = r.json()
print(f"\n=== RESET (task={data['task_id']}, max_steps={data['max_steps']}) ===")
obs = data["observation"]
initial_obs = obs.copy()
print(f"  Screen: {obs['screen_time']}h  Addiction: {obs['addiction_score']}")
print(f"  Energy: {obs['energy']}  Motivation: {obs['motivation']}")
print(f"  Frustration: {obs['frustration']}  Fatigue: {obs['fatigue']}")
print(f"  Streak: {obs['habit_streak']}  Time: {obs['time_of_day']}")

# 4) Run steps
actions = [
    "suggest_break",
    "delay_notification",
    "block_app",
    "suggest_workout",
    "noop",
    "suggest_sleep",
    "suggest_break",
    "block_app",
    "delay_notification",
    "noop",
]

cum_reward = 0
final_obs = obs
print("\n=== STEPS ===")

for i, act in enumerate(actions):
    r = httpx.post(f"{base}/step", json={"action_type": act})
    d = r.json()
    o = d["observation"]
    rw = d["reward"]
    info = d["info"]
    cum_reward += rw["total"]

    print(
        f"  Step {i+1:2d}: {act:22s} | "
        f"complied={str(info['user_complied']):5s} "
        f"reward={rw['total']:+6.2f} "
        f"screen={o['screen_time']:4.1f}h "
        f"frust={o['frustration']:.2f} "
        f"streak={o['habit_streak']}"
    )

    final_obs = o

    if d["done"]:
        print(f"    >> Episode done: {info['done_reason']}")
        break

print(f"\n  Cumulative reward: {cum_reward:+.4f}")

# 5) Grade
r = httpx.post(f"{base}/grade", json={
    "task_id": "screen_time_reducer",
    "initial_obs": initial_obs,
    "final_obs": final_obs,
    "cumulative_reward": cum_reward,
    "step_count": min(len(actions), i + 1),
})
print(f"\n=== GRADE ===")
result = r.json()
print(f"  Score: {result['score']:.4f}  (range {result['score_range']})")

# 6) Test medium task
print("\n" + "="*60)
r = httpx.post(f"{base}/reset", json={
    "task_id": "habit_streak_builder",
    "personality": "struggling",
    "seed": 123,
})
data = r.json()
obs = data["observation"]
print(f"=== MEDIUM TASK (struggling personality) ===")
print(f"  Screen: {obs['screen_time']}h  Addiction: {obs['addiction_score']}")
print(f"  Streak: {obs['habit_streak']}  Motivation: {obs['motivation']}")

# 7) Test hard task
print("\n" + "="*60)
r = httpx.post(f"{base}/reset", json={
    "task_id": "full_absa",
    "personality": "impulsive",
    "seed": 99,
})
data = r.json()
obs = data["observation"]
print(f"=== HARD TASK (impulsive personality) ===")
print(f"  Screen: {obs['screen_time']}h  Addiction: {obs['addiction_score']}")
print(f"  Streak: {obs['habit_streak']}  Motivation: {obs['motivation']}")
print(f"  Frustration: {obs['frustration']}  Fatigue: {obs['fatigue']}")

# 8) Get raw state
r = httpx.get(f"{base}/state")
print(f"\n=== RAW STATE ===")
print(json.dumps(r.json(), indent=2))

print("\n✓ All endpoints working!")
