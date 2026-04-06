"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Monitor, Activity, Zap, Flame, Brain, Heart, Battery, Eye, Target } from "lucide-react"
import { Sidebar, type ViewType } from "@/components/dashboard/sidebar"
import { StatCard } from "@/components/dashboard/stat-card"
import { Timeline } from "@/components/dashboard/timeline"
import { InsightCard } from "@/components/dashboard/insight-card"
import { RLInsights } from "@/components/dashboard/rl-insights"
import { EpisodeScore } from "@/components/dashboard/episode-score"
import { RewardChart } from "@/components/dashboard/reward-chart"
import {
  resetEnvironment,
  stepEnvironment,
  gradeEpisode,
  healthCheck,
  type BackendObservation,
  type BackendReward,
} from "@/lib/api"
import {
  createInitialRLState,
  determineState,
  selectAction,
  updateQTable,
  simulateUserResponse,
  updateUserState,
  generateInsight,
  calculateReward,
  backendObsToUserState,
  ACTION_LABELS,
  SCENARIO_STATES,
  type RLState,
  type UserState,
  type TimelineEvent,
  type ActionType,
  type LearningEvent,
} from "@/lib/rl-engine"

type ConnectionStatus = "connected" | "disconnected" | "checking"

export default function Dashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [scenario, setScenario] = useState("balanced")
  const [taskId, setTaskId] = useState("full_absa")
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [currentInsight, setCurrentInsight] = useState("Press Start to begin the agent...")
  const [learningHistory, setLearningHistory] = useState<LearningEvent[]>([])
  const [currentView, setCurrentView] = useState<ViewType>("dashboard")
  const [liveMode, setLiveMode] = useState(true)
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>("checking")

  // Episode state
  const [episodeDone, setEpisodeDone] = useState(false)
  const [episodeScore, setEpisodeScore] = useState<number | null>(null)
  const [maxSteps, setMaxSteps] = useState(20)
  const [rewardHistory, setRewardHistory] = useState<{ step: number; reward: number; cumulative: number }[]>([])

  // RL State
  const [rlState, setRlState] = useState<RLState>(() => createInitialRLState())

  // User State
  const [userState, setUserState] = useState<UserState>(() => SCENARIO_STATES.balanced)

  // Backend references
  const initialObsRef = useRef<BackendObservation | null>(null)
  const cumulativeRewardRef = useRef(0)

  // Previous values for trend calculation
  const prevUserStateRef = useRef<UserState>(userState)

  // Calculate trends
  const screenTimeTrend = Math.round((userState.screenTime - prevUserStateRef.current.screenTime) * 10)
  const addictionTrend = userState.addictionScore - prevUserStateRef.current.addictionScore
  const energyTrend = userState.energyLevel - prevUserStateRef.current.energyLevel
  const streakTrend = userState.habitStreak - prevUserStateRef.current.habitStreak

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck()
        setBackendStatus("connected")
      } catch {
        setBackendStatus("disconnected")
        setLiveMode(false)
      }
    }
    checkBackend()
    const interval = setInterval(checkBackend, 15000)
    return () => clearInterval(interval)
  }, [])

  // Handle scenario/task changes → reset episode
  useEffect(() => {
    handleReset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, taskId])

  // ----------------------------------------------------------------
  // LIVE MODE: Backend-driven step
  // ----------------------------------------------------------------
  const processLiveStep = useCallback(async () => {
    if (episodeDone) return

    const currentState = determineState(userState)
    const selectedAction = selectAction(rlState, currentState)

    const now = new Date()
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    })

    // Pending event
    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      time: timeString,
      action: selectedAction,
      actionLabel: ACTION_LABELS[selectedAction],
      outcome: null,
      pending: true,
    }
    setEvents((prev) => [newEvent, ...prev.slice(0, 19)])

    try {
      const result = await stepEnvironment(selectedAction)
      const obs = result.observation
      const reward = result.reward
      const info = result.info
      const complied = info.user_complied
      const outcome = complied ? "accepted" as const : "ignored" as const

      cumulativeRewardRef.current += reward.total

      // Update event
      setEvents((prev) =>
        prev.map((e) =>
          e.id === newEvent.id
            ? { ...e, outcome, pending: false, reward: reward.total, rewardBreakdown: reward as unknown as Record<string, number> }
            : e
        )
      )

      // Q-Table update
      const qBefore = rlState.qTable[currentState][selectedAction]
      const nextState = determineState(backendObsToUserState(obs as unknown as Record<string, unknown>))
      const newRlState = updateQTable(rlState, currentState, selectedAction, outcome, nextState, userState)
      setRlState(newRlState)
      const qAfter = newRlState.qTable[currentState][selectedAction]

      // Learning history
      setLearningHistory((prev) => [{
        id: Date.now().toString(),
        timestamp: timeString,
        state: currentState,
        action: selectedAction,
        outcome,
        reward: reward.total,
        qValueBefore: qBefore,
        qValueAfter: qAfter,
      }, ...prev.slice(0, 49)])

      // Reward chart
      setRewardHistory((prev) => [...prev, {
        step: info.step,
        reward: reward.total,
        cumulative: cumulativeRewardRef.current,
      }])

      // Update user state from backend
      prevUserStateRef.current = userState
      const newUserState = backendObsToUserState(obs as unknown as Record<string, unknown>)
      setUserState(newUserState)

      // Insight
      setCurrentInsight(generateInsight(newRlState, newUserState))

      // Episode done?
      if (result.done) {
        setEpisodeDone(true)
        setIsRunning(false)

        // Grade the episode
        if (initialObsRef.current) {
          try {
            const gradeResult = await gradeEpisode(
              taskId,
              initialObsRef.current,
              obs,
              cumulativeRewardRef.current,
              info.step,
            )
            setEpisodeScore(gradeResult.score)
            setCurrentInsight(`Episode complete! Score: ${(gradeResult.score * 100).toFixed(1)}%. ${info.done_reason === "user_too_frustrated" ? "⚠️ User became too frustrated." : "All steps used."}`)
          } catch {
            setCurrentInsight(`Episode complete. ${info.done_reason || "Max steps reached."}`)
          }
        }
      }
    } catch (err) {
      // Backend error — fall back
      setEvents((prev) =>
        prev.map((e) =>
          e.id === newEvent.id ? { ...e, outcome: "ignored", pending: false } : e
        )
      )
      setCurrentInsight(`⚠️ Backend error: ${err instanceof Error ? err.message : "unknown"}`)
    }
  }, [rlState, userState, taskId, episodeDone])

  // ----------------------------------------------------------------
  // OFFLINE MODE: Client-side step
  // ----------------------------------------------------------------
  const processOfflineStep = useCallback(() => {
    const currentState = determineState(userState)
    const selectedAction = selectAction(rlState, currentState)

    const now = new Date()
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    })

    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      time: timeString,
      action: selectedAction,
      actionLabel: ACTION_LABELS[selectedAction],
      outcome: null,
      pending: true,
    }
    setEvents((prev) => [newEvent, ...prev.slice(0, 19)])

    setTimeout(() => {
      const outcome = simulateUserResponse(selectedAction, userState, scenario)

      setEvents((prev) =>
        prev.map((e) =>
          e.id === newEvent.id ? { ...e, outcome, pending: false } : e
        )
      )

      const qBefore = rlState.qTable[currentState][selectedAction]
      const nextState = determineState(userState)
      const newRlState = updateQTable(rlState, currentState, selectedAction, outcome, nextState, userState)
      setRlState(newRlState)
      const qAfter = newRlState.qTable[currentState][selectedAction]

      const reward = calculateReward(selectedAction, outcome, userState)

      setLearningHistory((prev) => [{
        id: Date.now().toString(),
        timestamp: timeString,
        state: currentState,
        action: selectedAction,
        outcome,
        reward,
        qValueBefore: qBefore,
        qValueAfter: qAfter,
      }, ...prev.slice(0, 49)])

      cumulativeRewardRef.current += reward
      setRewardHistory((prev) => [...prev, {
        step: prev.length + 1,
        reward,
        cumulative: cumulativeRewardRef.current,
      }])

      prevUserStateRef.current = userState
      const newUserState = updateUserState(userState, selectedAction, outcome)
      setUserState(newUserState)

      setCurrentInsight(generateInsight(newRlState, newUserState))
    }, 1500)
  }, [rlState, userState, scenario])

  // ----------------------------------------------------------------
  // Step loop
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!isRunning || episodeDone) return

    const step = liveMode ? processLiveStep : processOfflineStep

    const initialTimeout = setTimeout(step, 800)
    const interval = setInterval(step, liveMode ? 4000 : 6000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [isRunning, episodeDone, liveMode, processLiveStep, processOfflineStep])

  // ----------------------------------------------------------------
  // Reset
  // ----------------------------------------------------------------
  const handleReset = async () => {
    setIsRunning(false)
    setEpisodeDone(false)
    setEpisodeScore(null)
    setEvents([])
    setRewardHistory([])
    setRlState(createInitialRLState())
    setLearningHistory([])
    cumulativeRewardRef.current = 0
    initialObsRef.current = null

    if (liveMode && backendStatus === "connected") {
      try {
        const data = await resetEnvironment(taskId, scenario)
        const obs = data.observation
        setMaxSteps(data.max_steps)
        initialObsRef.current = obs
        const newState = backendObsToUserState(obs as unknown as Record<string, unknown>)
        setUserState(newState)
        prevUserStateRef.current = newState
        setCurrentInsight(`Environment reset. Task: ${taskId.replace(/_/g, " ")} (${data.max_steps} steps). Press Start.`)
      } catch {
        setCurrentInsight("⚠️ Failed to connect to backend. Falling back to offline mode.")
        setLiveMode(false)
        const initState = SCENARIO_STATES[scenario as keyof typeof SCENARIO_STATES] || SCENARIO_STATES.balanced
        setUserState(initState)
        prevUserStateRef.current = initState
      }
    } else {
      const initState = SCENARIO_STATES[scenario as keyof typeof SCENARIO_STATES] || SCENARIO_STATES.balanced
      setUserState(initState)
      prevUserStateRef.current = initState
      setCurrentInsight("Offline mode. Press Start to begin simulation.")
    }
  }

  // Format screen time
  const formatScreenTimeMinutes = (hours: number) => Math.round(hours * 60)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[oklch(0.15_0.03_270)]">
      <Sidebar
        isRunning={isRunning}
        onToggleRunning={() => {
          if (!isRunning && episodeDone) {
            handleReset()
          }
          setIsRunning(!isRunning)
        }}
        onReset={handleReset}
        scenario={scenario}
        onScenarioChange={setScenario}
        taskId={taskId}
        onTaskChange={setTaskId}
        currentView={currentView}
        onViewChange={setCurrentView}
        learningUpdates={learningHistory.length}
        liveMode={liveMode}
        onLiveModeToggle={() => {
          setLiveMode(!liveMode)
          handleReset()
        }}
        backendStatus={backendStatus}
      />

      {/* Main Content */}
      <main className="ml-72 p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          {currentView === "dashboard" ? (
            <div className="space-y-8">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
                  <p className="text-sm text-muted-foreground mt-1">Monitor agent behavior and user state</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[oklch(0.72_0.18_145)] animate-pulse' : episodeDone ? 'bg-[oklch(0.75_0.18_60)]' : 'bg-muted-foreground'}`} />
                    <span>{isRunning ? 'Learning' : episodeDone ? 'Done' : 'Paused'}</span>
                  </div>
                  <span className="text-border">|</span>
                  <span>Mode: <span className="text-primary font-medium">{liveMode ? '🔴 Live' : '⚡ Offline'}</span></span>
                  <span className="text-border">|</span>
                  <span>Explore: <span className="text-primary font-medium">{Math.round(rlState.explorationRate * 100)}%</span></span>
                  <span className="text-border">|</span>
                  <span>State: <span className="text-accent font-medium">{determineState(userState).replace("_", " ")}</span></span>
                </div>
              </div>

              {/* Episode Score (when done) */}
              {episodeDone && (
                <EpisodeScore
                  score={episodeScore}
                  cumulativeReward={cumulativeRewardRef.current}
                  stepsUsed={rewardHistory.length}
                  maxSteps={maxSteps}
                  taskId={taskId}
                />
              )}

              {/* State Snapshot — 8 metrics */}
              <section>
                <h2 className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-medium">
                  State Snapshot
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Screen Time"
                    value={formatScreenTimeMinutes(userState.screenTime)}
                    format="time"
                    trend={screenTimeTrend}
                    icon={Monitor}
                    color="primary"
                  />
                  <StatCard
                    label="Addiction Score"
                    value={Math.round(userState.addictionScore)}
                    format="percentage"
                    trend={addictionTrend}
                    icon={Activity}
                    color="destructive"
                  />
                  <StatCard
                    label="Energy Level"
                    value={Math.round(userState.energyLevel)}
                    format="percentage"
                    trend={energyTrend}
                    icon={Zap}
                    color="warning"
                  />
                  <StatCard
                    label="Habit Streak"
                    value={userState.habitStreak}
                    unit="days"
                    trend={streakTrend}
                    icon={Flame}
                    color="positive"
                  />
                </div>
                {/* Secondary metrics row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <StatCard
                    label="Focus Level"
                    value={Math.round(userState.focusLevel)}
                    format="percentage"
                    icon={Eye}
                    color="accent"
                  />
                  <StatCard
                    label="Motivation"
                    value={Math.round(userState.motivation)}
                    format="percentage"
                    icon={Target}
                    color="positive"
                  />
                  <StatCard
                    label="Fatigue"
                    value={Math.round(userState.fatigue)}
                    format="percentage"
                    icon={Battery}
                    color="warning"
                  />
                  <StatCard
                    label="Frustration"
                    value={Math.round(userState.frustration)}
                    format="percentage"
                    icon={Heart}
                    color="destructive"
                  />
                </div>
              </section>

              {/* Reward Chart */}
              {rewardHistory.length > 0 && (
                <section>
                  <RewardChart data={rewardHistory} />
                </section>
              )}

              {/* Behavior Timeline */}
              <section className="min-h-[400px]">
                <Timeline events={events} />
              </section>

              {/* Insight Card */}
              <section>
                <InsightCard insight={currentInsight} />
              </section>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground tracking-tight">RL Insights</h1>
                  <p className="text-sm text-muted-foreground mt-1">Explore what the agent has learned through reinforcement learning</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border/50">
                  <span>Total Updates: <span className="text-primary font-medium">{learningHistory.length}</span></span>
                  <span className="text-border">|</span>
                  <span>Learning Rate: <span className="text-accent font-medium">{rlState.learningRate}</span></span>
                </div>
              </div>

              {/* RL Insights Panel */}
              <RLInsights rlState={rlState} learningHistory={learningHistory} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
