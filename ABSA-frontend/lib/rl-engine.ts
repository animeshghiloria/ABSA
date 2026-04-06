"use client"

/**
 * lib/rl-engine.ts
 * ----------------
 * Q-Learning RL engine that works in two modes:
 *   1. OFFLINE: fully client-side simulation (original behaviour)
 *   2. LIVE:    calls the FastAPI backend for state transitions
 *
 * Actions match the backend's ActionType enum.
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type ActionType =
  | "delay_notification"
  | "block_app"
  | "suggest_workout"
  | "suggest_break"
  | "suggest_sleep"
  | "noop"

export type StateKey =
  | "low_energy"
  | "high_screen"
  | "late_night"
  | "productive"
  | "distracted"

export type Outcome = "accepted" | "ignored"

export interface TimelineEvent {
  id: string
  time: string
  action: ActionType
  actionLabel: string
  outcome: Outcome | null
  pending: boolean
  reward?: number
  rewardBreakdown?: Record<string, number>
}

export interface UserState {
  screenTime: number
  addictionScore: number
  energyLevel: number
  habitStreak: number
  focusLevel: number
  motivation: number
  fatigue: number
  frustration: number
  timeOfDay: string
  step: number
}

export interface RLState {
  qTable: Record<string, Record<ActionType, number>>
  explorationRate: number
  learningRate: number
  discountFactor: number
}

export interface LearningEvent {
  id: string
  timestamp: string
  state: StateKey
  action: ActionType
  outcome: Outcome
  reward: number
  qValueBefore: number
  qValueAfter: number
}

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

export const ACTION_LABELS: Record<ActionType, string> = {
  delay_notification: "Delayed Notification",
  block_app: "Blocked App",
  suggest_workout: "Suggested Workout",
  suggest_break: "Suggested Break",
  suggest_sleep: "Suggested Sleep",
  noop: "No Action",
}

export const ACTION_ICONS: Record<ActionType, string> = {
  delay_notification: "bell-off",
  block_app: "shield-off",
  suggest_workout: "dumbbell",
  suggest_break: "coffee",
  suggest_sleep: "moon",
  noop: "circle-dot",
}

export const SCENARIO_STATES: Record<string, UserState> = {
  // Map to backend personality presets
  disciplined: {
    screenTime: 2.5, addictionScore: 20, energyLevel: 85,
    habitStreak: 10, focusLevel: 80, motivation: 90,
    fatigue: 10, frustration: 5, timeOfDay: "morning", step: 0,
  },
  balanced: {
    screenTime: 5.0, addictionScore: 50, energyLevel: 60,
    habitStreak: 3, focusLevel: 55, motivation: 60,
    fatigue: 30, frustration: 15, timeOfDay: "morning", step: 0,
  },
  struggling: {
    screenTime: 8.0, addictionScore: 85, energyLevel: 35,
    habitStreak: 0, focusLevel: 30, motivation: 25,
    fatigue: 65, frustration: 40, timeOfDay: "morning", step: 0,
  },
  impulsive: {
    screenTime: 7.0, addictionScore: 70, energyLevel: 55,
    habitStreak: 1, focusLevel: 35, motivation: 45,
    fatigue: 40, frustration: 30, timeOfDay: "morning", step: 0,
  },
}

const ALL_ACTIONS: ActionType[] = [
  "delay_notification", "block_app", "suggest_workout",
  "suggest_break", "suggest_sleep", "noop",
]

const ALL_STATES: StateKey[] = [
  "low_energy", "high_screen", "late_night", "productive", "distracted",
]

// --------------------------------------------------------------------------
// Q-Table initialisation
// --------------------------------------------------------------------------

function initializeQTable(): Record<string, Record<ActionType, number>> {
  const qTable: Record<string, Record<ActionType, number>> = {}

  for (const state of ALL_STATES) {
    qTable[state] = {} as Record<ActionType, number>
    for (const action of ALL_ACTIONS) {
      qTable[state][action] = Math.random() * 0.5
    }
  }

  // Prior knowledge (soft biases)
  qTable["low_energy"]["suggest_break"] = 0.7
  qTable["low_energy"]["suggest_sleep"] = 0.6
  qTable["high_screen"]["block_app"] = 0.6
  qTable["high_screen"]["delay_notification"] = 0.5
  qTable["late_night"]["suggest_sleep"] = 0.8
  qTable["productive"]["noop"] = 0.7
  qTable["distracted"]["delay_notification"] = 0.6
  qTable["distracted"]["block_app"] = 0.5

  return qTable
}

// --------------------------------------------------------------------------
// State determination
// --------------------------------------------------------------------------

export function determineState(userState: UserState): StateKey {
  const hour = new Date().getHours()

  if (hour >= 22 || hour < 6) return "late_night"
  if (userState.energyLevel < 40) return "low_energy"
  if (userState.screenTime > 6) return "high_screen"
  if (userState.addictionScore < 40 && userState.habitStreak > 5) return "productive"
  return "distracted"
}

// --------------------------------------------------------------------------
// Action selection (ε-greedy)
// --------------------------------------------------------------------------

export function selectAction(rlState: RLState, currentState: StateKey): ActionType {
  // Exploration
  if (Math.random() < rlState.explorationRate) {
    return ALL_ACTIONS[Math.floor(Math.random() * ALL_ACTIONS.length)]
  }

  // Exploitation — pick best Q-value
  const qValues = rlState.qTable[currentState]
  let bestAction = ALL_ACTIONS[0]
  let bestValue = qValues[bestAction]

  for (const action of ALL_ACTIONS) {
    if (qValues[action] > bestValue) {
      bestValue = qValues[action]
      bestAction = action
    }
  }

  return bestAction
}

// --------------------------------------------------------------------------
// Reward calculation (offline mode)
// --------------------------------------------------------------------------

export function calculateReward(
  action: ActionType,
  outcome: Outcome,
  userState: UserState,
): number {
  const baseReward = outcome === "accepted" ? 1.0 : -0.5

  let bonus = 0
  if (action === "suggest_sleep" && new Date().getHours() >= 22) {
    bonus = outcome === "accepted" ? 0.3 : 0
  }
  if (action === "suggest_break" && userState.screenTime > 4) {
    bonus = outcome === "accepted" ? 0.2 : 0
  }
  if (action === "block_app" && userState.addictionScore > 60) {
    bonus = outcome === "accepted" ? 0.25 : 0
  }
  if (action === "noop" && userState.addictionScore < 40) {
    bonus = 0.1 // good to leave productive users alone
  }

  return baseReward + bonus
}

// --------------------------------------------------------------------------
// Q-Table update
// --------------------------------------------------------------------------

export function updateQTable(
  rlState: RLState,
  currentState: StateKey,
  action: ActionType,
  outcome: Outcome,
  nextState: StateKey,
  userState: UserState,
): RLState {
  const reward = calculateReward(action, outcome, userState)

  const nextStateValues = Object.values(rlState.qTable[nextState])
  const maxNextQ = Math.max(...nextStateValues)

  const currentQ = rlState.qTable[currentState][action]
  const newQ =
    currentQ +
    rlState.learningRate * (reward + rlState.discountFactor * maxNextQ - currentQ)

  const newQTable = { ...rlState.qTable }
  newQTable[currentState] = { ...newQTable[currentState], [action]: newQ }

  const newExplorationRate = Math.max(0.1, rlState.explorationRate * 0.995)

  return {
    ...rlState,
    qTable: newQTable,
    explorationRate: newExplorationRate,
  }
}

// --------------------------------------------------------------------------
// Initialise RL state
// --------------------------------------------------------------------------

export function createInitialRLState(): RLState {
  return {
    qTable: initializeQTable(),
    explorationRate: 0.3,
    learningRate: 0.1,
    discountFactor: 0.9,
  }
}

// --------------------------------------------------------------------------
// User-response simulation (offline mode)
// --------------------------------------------------------------------------

export function simulateUserResponse(
  action: ActionType,
  userState: UserState,
  scenario: string,
): Outcome {
  const hour = new Date().getHours()
  let acceptProb = 0.5

  // Action appropriateness
  if (action === "suggest_sleep" && hour >= 22) acceptProb += 0.3
  if (action === "suggest_break" && userState.screenTime > 4) acceptProb += 0.2
  if (action === "block_app" && userState.addictionScore > 60) acceptProb -= 0.2
  if (action === "suggest_workout" && userState.energyLevel > 50) acceptProb += 0.15
  if (action === "delay_notification") acceptProb += 0.15
  if (action === "noop") return "accepted"

  // Scenario modifiers
  if (scenario === "struggling") {
    acceptProb -= 0.1
  } else if (scenario === "disciplined") {
    acceptProb += 0.2
  }

  // Frustration reduces compliance
  acceptProb -= (userState.frustration / 100) * 0.2

  acceptProb = Math.max(0.1, Math.min(0.9, acceptProb))
  return Math.random() < acceptProb ? "accepted" : "ignored"
}

// --------------------------------------------------------------------------
// User-state update (offline mode)
// --------------------------------------------------------------------------

export function updateUserState(
  userState: UserState,
  action: ActionType,
  outcome: Outcome,
): UserState {
  const s = { ...userState }

  if (outcome === "accepted") {
    switch (action) {
      case "suggest_break":
        s.screenTime = Math.max(0, s.screenTime - 0.3)
        s.energyLevel = Math.min(100, s.energyLevel + 5)
        s.addictionScore = Math.max(0, s.addictionScore - 2)
        s.focusLevel = Math.min(100, s.focusLevel + 4)
        s.fatigue = Math.max(0, s.fatigue - 3)
        break
      case "block_app":
        s.screenTime = Math.max(0, s.screenTime - 0.5)
        s.addictionScore = Math.max(0, s.addictionScore - 3)
        s.frustration = Math.min(100, s.frustration + 4)
        break
      case "suggest_sleep":
        s.energyLevel = Math.min(100, s.energyLevel + 10)
        s.habitStreak += 1
        s.fatigue = Math.max(0, s.fatigue - 8)
        break
      case "delay_notification":
        s.focusLevel = Math.min(100, s.focusLevel + 5)
        s.screenTime = Math.max(0, s.screenTime - 0.2)
        s.addictionScore = Math.max(0, s.addictionScore - 1)
        break
      case "suggest_workout":
        s.energyLevel = Math.min(100, s.energyLevel + 8)
        s.screenTime = Math.max(0, s.screenTime - 0.4)
        s.habitStreak += 1
        s.motivation = Math.min(100, s.motivation + 5)
        break
      case "noop":
        // Natural drift
        s.screenTime += 0.1
        s.fatigue = Math.min(100, s.fatigue + 1)
        break
    }
  } else {
    // Ignored actions
    s.screenTime += 0.1
    s.addictionScore = Math.min(100, s.addictionScore + 1)
    s.frustration = Math.min(100, s.frustration + 2)
  }

  s.step += 1
  return s
}

// --------------------------------------------------------------------------
// Insight generation
// --------------------------------------------------------------------------

export function generateInsight(rlState: RLState, userState: UserState): string {
  const currentState = determineState(userState)
  const qValues = rlState.qTable[currentState]

  const sortedActions = Object.entries(qValues).sort(
    ([, a], [, b]) => b - a,
  )

  const bestAction = sortedActions[0][0] as ActionType
  const worstAction = sortedActions[sortedActions.length - 1][0] as ActionType

  const insights = [
    `In "${currentState.replace("_", " ")}" state, the agent prefers ${ACTION_LABELS[bestAction].toLowerCase()} (Q=${qValues[bestAction].toFixed(2)}) over ${ACTION_LABELS[worstAction].toLowerCase()}.`,
    `${rlState.explorationRate > 0.2 ? "Exploring new strategies" : "Exploiting learned patterns"}. Exploration rate: ${(rlState.explorationRate * 100).toFixed(0)}%.`,
    `${userState.energyLevel < 40 ? "⚠️ Low energy detected." : "Energy stable."} ${userState.addictionScore > 60 ? "⚠️ High addiction risk — prioritising intervention." : "Addiction manageable."}`,
    `Habit streak: ${userState.habitStreak} days. ${userState.habitStreak > 7 ? "Excellent momentum! 🔥" : "Building towards consistency."}`,
    `Screen time at ${userState.screenTime.toFixed(1)}h. ${userState.screenTime > 6 ? "Agent escalating interventions." : userState.screenTime < 3 ? "Great progress!" : "Moderate — room for improvement."}`,
  ]

  return insights[Math.floor(Math.random() * insights.length)]
}

// --------------------------------------------------------------------------
// Helper: convert backend observation → UserState
// --------------------------------------------------------------------------

export function backendObsToUserState(obs: Record<string, unknown>): UserState {
  return {
    screenTime: obs.screen_time as number,
    addictionScore: Math.round((obs.addiction_score as number) * 100),
    energyLevel: Math.round((obs.energy as number) * 100),
    habitStreak: obs.habit_streak as number,
    focusLevel: Math.round((obs.focus_level as number) * 100),
    motivation: Math.round((obs.motivation as number) * 100),
    fatigue: Math.round((obs.fatigue as number) * 100),
    frustration: Math.round((obs.frustration as number) * 100),
    timeOfDay: obs.time_of_day as string,
    step: obs.step as number,
  }
}
