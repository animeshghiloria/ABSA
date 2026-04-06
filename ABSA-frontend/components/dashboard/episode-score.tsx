"use client"

import { Trophy, Target, Clock, TrendingUp } from "lucide-react"

interface EpisodeScoreProps {
  score: number | null
  cumulativeReward: number
  stepsUsed: number
  maxSteps: number
  taskId: string
}

const TASK_LABELS: Record<string, string> = {
  screen_time_reducer: "Screen Time Reducer",
  habit_streak_builder: "Habit Streak Builder",
  full_absa: "Full ABSA — Multi-Objective",
}

const DIFFICULTY_COLORS: Record<string, string> = {
  screen_time_reducer: "text-[oklch(0.72_0.18_145)]",
  habit_streak_builder: "text-[oklch(0.75_0.18_60)]",
  full_absa: "text-[oklch(0.6_0.2_25)]",
}

export function EpisodeScore({ score, cumulativeReward, stepsUsed, maxSteps, taskId }: EpisodeScoreProps) {
  const scorePercent = score !== null ? Math.round(score * 100) : null
  const scoreColor =
    scorePercent !== null
      ? scorePercent >= 70
        ? "text-[oklch(0.72_0.18_145)]"
        : scorePercent >= 40
        ? "text-[oklch(0.75_0.18_60)]"
        : "text-[oklch(0.6_0.2_25)]"
      : "text-muted-foreground"

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card/60 to-accent/10 backdrop-blur-xl border border-primary/20 p-6">
      {/* Decorative corners */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/15 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-tr-full" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Episode Complete</h3>
            <p className="text-xs text-muted-foreground">{TASK_LABELS[taskId] || taskId}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Score */}
          <div className="bg-card/40 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Score</span>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${scoreColor}`}>
              {scorePercent !== null ? `${scorePercent}%` : "—"}
            </p>
          </div>

          {/* Cumulative Reward */}
          <div className="bg-card/40 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Reward</span>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${cumulativeReward >= 0 ? "text-[oklch(0.72_0.18_145)]" : "text-[oklch(0.6_0.2_25)]"}`}>
              {cumulativeReward >= 0 ? "+" : ""}{cumulativeReward.toFixed(1)}
            </p>
          </div>

          {/* Steps */}
          <div className="bg-card/40 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Steps</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {stepsUsed}<span className="text-lg text-muted-foreground">/{maxSteps}</span>
            </p>
          </div>

          {/* Difficulty */}
          <div className="bg-card/40 rounded-xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Difficulty</span>
            </div>
            <p className={`text-2xl font-bold tracking-tight capitalize ${DIFFICULTY_COLORS[taskId] || "text-foreground"}`}>
              {taskId === "screen_time_reducer" ? "Easy" : taskId === "habit_streak_builder" ? "Medium" : "Hard"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
