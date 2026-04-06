/**
 * lib/api.ts
 * ----------
 * HTTP client for the ABSA backend API.
 * Defaults to localhost:7860 (backend port).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860";

// --------------------------------------------------------------------------
// Types matching the backend Pydantic models
// --------------------------------------------------------------------------

export interface BackendObservation {
  screen_time: number;
  focus_level: number;
  energy: number;
  habit_streak: number;
  addiction_score: number;
  frustration: number;
  time_of_day: string;
  motivation: number;
  fatigue: number;
  step: number;
  last_action_complied: boolean | null;
}

export interface BackendReward {
  total: number;
  screen_time_reward: number;
  habit_reward: number;
  wellbeing_reward: number;
  frustration_penalty: number;
  overcontrol_penalty: number;
  compliance_bonus: number;
}

export interface BackendStepInfo {
  step: number;
  action_taken: string;
  user_complied: boolean;
  cumulative_reward: number;
  episode_done: boolean;
  done_reason: string | null;
}

export interface ResetResponse {
  observation: BackendObservation;
  task_id: string;
  max_steps: number;
}

export interface StepResponse {
  observation: BackendObservation;
  reward: BackendReward;
  done: boolean;
  info: BackendStepInfo;
}

export interface GradeResponse {
  task_id: string;
  score: number;
  score_range: [number, number];
}

export interface TaskInfo {
  task_id: string;
  difficulty: string;
  max_steps: number;
  description: string;
}

// --------------------------------------------------------------------------
// API functions
// --------------------------------------------------------------------------

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function healthCheck(): Promise<{ status: string; environment: string }> {
  return apiFetch("/health");
}

export async function getTasks(): Promise<{ tasks: TaskInfo[] }> {
  return apiFetch("/tasks");
}

export async function resetEnvironment(
  taskId: string,
  personality: string,
  seed: number = 42
): Promise<ResetResponse> {
  return apiFetch("/reset", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, personality, seed }),
  });
}

export async function stepEnvironment(actionType: string): Promise<StepResponse> {
  return apiFetch("/step", {
    method: "POST",
    body: JSON.stringify({ action_type: actionType }),
  });
}

export async function getState(): Promise<Record<string, unknown>> {
  return apiFetch("/state");
}

export async function gradeEpisode(
  taskId: string,
  initialObs: BackendObservation,
  finalObs: BackendObservation,
  cumulativeReward: number,
  stepCount: number
): Promise<GradeResponse> {
  return apiFetch("/grade", {
    method: "POST",
    body: JSON.stringify({
      task_id: taskId,
      initial_obs: initialObs,
      final_obs: finalObs,
      cumulative_reward: cumulativeReward,
      step_count: stepCount,
    }),
  });
}
