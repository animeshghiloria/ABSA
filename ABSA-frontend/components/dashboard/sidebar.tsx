"use client"

import {
  Play, Pause, RotateCcw, LayoutDashboard, Brain,
  LineChart, History, Sparkles, Wifi, WifiOff, Radio
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type ViewType = "dashboard" | "rl-insights"

interface SidebarProps {
  isRunning: boolean
  onToggleRunning: () => void
  onReset: () => void
  scenario: string
  onScenarioChange: (value: string) => void
  taskId: string
  onTaskChange: (value: string) => void
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  learningUpdates: number
  liveMode: boolean
  onLiveModeToggle: () => void
  backendStatus: "connected" | "disconnected" | "checking"
}

export function Sidebar({
  isRunning,
  onToggleRunning,
  onReset,
  scenario,
  onScenarioChange,
  taskId,
  onTaskChange,
  currentView,
  onViewChange,
  learningUpdates,
  liveMode,
  onLiveModeToggle,
  backendStatus,
}: SidebarProps) {
  const navItems = [
    {
      id: "dashboard" as ViewType,
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview",
    },
    {
      id: "rl-insights" as ViewType,
      label: "RL Insights",
      icon: Brain,
      description: "Learning",
      badge: learningUpdates > 0 ? learningUpdates : undefined,
    },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-sidebar/90 backdrop-blur-xl border-r border-sidebar-border flex flex-col overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.18_280)] via-[oklch(0.68_0.2_195)] to-[oklch(0.72_0.18_145)] flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar",
              backendStatus === "connected"
                ? "bg-[oklch(0.72_0.18_145)] animate-pulse"
                : backendStatus === "checking"
                ? "bg-[oklch(0.75_0.18_60)] animate-pulse"
                : "bg-[oklch(0.6_0.02_270)]"
            )} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground tracking-tight">ABSA</h1>
            <p className="text-xs text-muted-foreground">Adaptive Behavior Agent</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="px-4 pt-3">
        <button
          onClick={onLiveModeToggle}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 border",
            liveMode
              ? "bg-[oklch(0.72_0.18_145)]/10 border-[oklch(0.72_0.18_145)]/30 text-[oklch(0.72_0.18_145)]"
              : "bg-secondary/50 border-border/50 text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            {liveMode ? <Radio className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="font-medium">{liveMode ? "Live Mode" : "Offline Mode"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {backendStatus === "connected" ? (
              <Wifi className="w-3 h-3 text-[oklch(0.72_0.18_145)]" />
            ) : (
              <WifiOff className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-[10px]">
              {backendStatus === "connected" ? "Connected" : backendStatus === "checking" ? "Checking..." : "Offline"}
            </span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium px-3 mb-2">
          Navigation
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
              currentView === item.id
                ? "bg-gradient-to-r from-primary/20 to-accent/10 text-sidebar-foreground border border-primary/30"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className={cn(
              "w-4 h-4",
              currentView === item.id && "text-primary"
            )} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/20 text-primary">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium px-3 mb-2">
          Agent Controls
        </p>
        <Button
          onClick={onToggleRunning}
          className={cn(
            "w-full justify-start gap-3 h-11 rounded-xl transition-all duration-300 font-medium",
            isRunning
              ? "bg-[oklch(0.72_0.18_145)]/15 text-[oklch(0.72_0.18_145)] hover:bg-[oklch(0.72_0.18_145)]/25 border border-[oklch(0.72_0.18_145)]/30"
              : "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          )}
          variant={isRunning ? "ghost" : "default"}
        >
          {isRunning ? (
            <>
              <div className="relative">
                <Pause className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[oklch(0.72_0.18_145)] animate-pulse" />
              </div>
              Pause Agent
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Agent
            </>
          )}
        </Button>

        <Button
          onClick={onReset}
          variant="outline"
          className="w-full justify-start gap-3 h-11 rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Agent
        </Button>
      </div>

      {/* Task Selector */}
      <div className="p-4 pt-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium px-3 mb-2">
          Task
        </p>
        <Select value={taskId} onValueChange={onTaskChange}>
          <SelectTrigger className="w-full h-11 rounded-xl bg-sidebar-accent/50 border-sidebar-border/50 hover:bg-sidebar-accent transition-colors">
            <SelectValue placeholder="Select task" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="screen_time_reducer">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.18_145)]" />
                Easy — Screen Time
              </div>
            </SelectItem>
            <SelectItem value="habit_streak_builder">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.75_0.18_60)]" />
                Medium — Habit Streak
              </div>
            </SelectItem>
            <SelectItem value="full_absa">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.6_0.2_25)]" />
                Hard — Full ABSA
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Personality Selector */}
      <div className="p-4 pt-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium px-3 mb-2">
          Personality
        </p>
        <Select value={scenario} onValueChange={onScenarioChange}>
          <SelectTrigger className="w-full h-11 rounded-xl bg-sidebar-accent/50 border-sidebar-border/50 hover:bg-sidebar-accent transition-colors">
            <SelectValue placeholder="Select personality" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="disciplined">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.18_145)]" />
                Disciplined
              </div>
            </SelectItem>
            <SelectItem value="balanced">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.18_280)]" />
                Balanced
              </div>
            </SelectItem>
            <SelectItem value="struggling">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.6_0.2_25)]" />
                Struggling
              </div>
            </SelectItem>
            <SelectItem value="impulsive">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.75_0.18_60)]" />
                Impulsive
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="mt-auto p-4 border-t border-sidebar-border/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sidebar-accent/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <LineChart className="w-3 h-3 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Updates</span>
            </div>
            <p className="text-lg font-semibold text-sidebar-foreground">{learningUpdates}</p>
          </div>
          <div className="bg-sidebar-accent/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <History className="w-3 h-3 text-accent" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              isRunning ? "text-[oklch(0.72_0.18_145)]" : "text-muted-foreground"
            )}>
              {isRunning ? "Learning" : "Paused"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
