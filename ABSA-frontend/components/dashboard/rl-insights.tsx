"use client"

import { useState } from "react"
import { Brain, TableIcon, BookOpen, History, ArrowRight, TrendingUp, TrendingDown, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  type RLState,
  type LearningEvent,
  type ActionType,
  type StateKey,
  ACTION_LABELS,
} from "@/lib/rl-engine"

interface RLInsightsProps {
  rlState: RLState
  learningHistory: LearningEvent[]
}

const STATE_LABELS: Record<StateKey, string> = {
  low_energy: "Low Energy",
  high_screen: "High Screen Time",
  late_night: "Late Night",
  productive: "Productive",
  distracted: "Distracted",
}

const STATE_COLORS: Record<StateKey, { bg: string; text: string; border: string }> = {
  low_energy: { bg: "bg-[oklch(0.75_0.18_60)]/15", text: "text-[oklch(0.75_0.18_60)]", border: "border-[oklch(0.75_0.18_60)]/30" },
  high_screen: { bg: "bg-[oklch(0.6_0.2_25)]/15", text: "text-[oklch(0.6_0.2_25)]", border: "border-[oklch(0.6_0.2_25)]/30" },
  late_night: { bg: "bg-[oklch(0.72_0.18_280)]/15", text: "text-[oklch(0.72_0.18_280)]", border: "border-[oklch(0.72_0.18_280)]/30" },
  productive: { bg: "bg-[oklch(0.72_0.18_145)]/15", text: "text-[oklch(0.72_0.18_145)]", border: "border-[oklch(0.72_0.18_145)]/30" },
  distracted: { bg: "bg-[oklch(0.68_0.2_195)]/15", text: "text-[oklch(0.68_0.2_195)]", border: "border-[oklch(0.68_0.2_195)]/30" },
}

const ACTIONS: ActionType[] = [
  "delay_notification",
  "block_app",
  "suggest_workout",
  "suggest_break",
  "suggest_sleep",
  "noop",
]

export function RLInsights({ rlState, learningHistory }: RLInsightsProps) {
  const [selectedTab, setSelectedTab] = useState("q-table")

  // Get the learned policy (best action for each state)
  const getLearnedPolicy = () => {
    const states = Object.keys(rlState.qTable) as StateKey[]
    return states.map((state) => {
      const actions = rlState.qTable[state]
      let bestAction: ActionType = "noop"
      let bestValue = -Infinity
      let totalValue = 0
      let actionCount = 0

      Object.entries(actions).forEach(([action, value]) => {
        totalValue += Math.abs(value)
        actionCount++
        if (value > bestValue) {
          bestValue = value
          bestAction = action as ActionType
        }
      })

      const avgValue = totalValue / actionCount
      const confidence = avgValue > 0 ? Math.min((bestValue / avgValue) * 50, 100) : 0

      return {
        state,
        bestAction,
        bestValue,
        confidence: Math.round(confidence),
      }
    })
  }

  const policy = getLearnedPolicy()

  const getQValueColor = (value: number) => {
    if (value > 0.5) return "bg-[oklch(0.72_0.18_145)] text-white"
    if (value > 0) return "bg-[oklch(0.72_0.18_145)]/60 text-[oklch(0.72_0.18_145)]"
    if (value < -0.5) return "bg-[oklch(0.6_0.2_25)] text-white"
    if (value < 0) return "bg-[oklch(0.6_0.2_25)]/60 text-[oklch(0.6_0.2_25)]"
    return "bg-muted/30 text-muted-foreground"
  }

  return (
    <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 overflow-hidden">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.18_280)] to-[oklch(0.68_0.2_195)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">RL Learning Insights</h2>
              <p className="text-xs text-muted-foreground">
                Explore what the agent has learned
              </p>
            </div>
          </div>
          <TabsList className="bg-secondary/50 rounded-xl p-1">
            <TabsTrigger value="q-table" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TableIcon className="w-4 h-4 mr-2" />
              Q-Table
            </TabsTrigger>
            <TabsTrigger value="policy" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="w-4 h-4 mr-2" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Q-Table View */}
        <TabsContent value="q-table" className="p-6 m-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Q-values represent learned action preferences for each state</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[oklch(0.72_0.18_145)]" />
                  <span>Preferred</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[oklch(0.6_0.2_25)]" />
                  <span>Avoided</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">State</th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="text-center py-3 px-2 text-muted-foreground font-medium text-xs">
                        {ACTION_LABELS[action].split(" ").slice(0, 2).join(" ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(rlState.qTable) as StateKey[]).map((state) => {
                    const bestAction = policy.find((p) => p.state === state)?.bestAction
                    const stateColors = STATE_COLORS[state]
                    
                    return (
                      <tr key={state} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border",
                            stateColors.bg,
                            stateColors.text,
                            stateColors.border
                          )}>
                            {STATE_LABELS[state]}
                          </span>
                        </td>
                        {ACTIONS.map((action) => {
                          const value = rlState.qTable[state][action]
                          const isBest = action === bestAction
                          
                          return (
                            <td key={action} className="py-3 px-2 text-center">
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center w-14 h-8 rounded-lg text-xs font-mono font-medium transition-all",
                                  getQValueColor(value),
                                  isBest && "ring-2 ring-primary ring-offset-2 ring-offset-card"
                                )}
                              >
                                {value.toFixed(2)}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Learned Policy View */}
        <TabsContent value="policy" className="p-6 m-0">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The agent has learned these optimal actions for each user state:
            </p>
            
            <div className="grid gap-3">
              {policy.map(({ state, bestAction, bestValue, confidence }) => {
                const stateColors = STATE_COLORS[state]
                
                return (
                  <div
                    key={state}
                    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      stateColors.bg
                    )}>
                      <Sparkles className={cn("w-5 h-5", stateColors.text)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium",
                          stateColors.bg,
                          stateColors.text
                        )}>
                          {STATE_LABELS[state]}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {ACTION_LABELS[bestAction]}
                        </span>
                      </div>
                      
                      {/* Confidence bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              confidence > 60 ? "bg-[oklch(0.72_0.18_145)]" : 
                              confidence > 30 ? "bg-[oklch(0.75_0.18_60)]" : "bg-[oklch(0.68_0.2_195)]"
                            )}
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16">
                          {confidence}% conf.
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-lg font-bold text-foreground">
                        {bestValue.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground">Q-value</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* Learning History View */}
        <TabsContent value="history" className="p-6 m-0">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recent Q-value updates showing how the agent learns from each interaction:
            </p>
            
            {learningHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No learning events yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start the agent to see learning in action
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                {learningHistory.map((event) => {
                  const stateColors = STATE_COLORS[event.state]
                  const isPositive = event.qValueAfter > event.qValueBefore
                  const change = event.qValueAfter - event.qValueBefore
                  
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-4 rounded-xl border transition-colors",
                        event.outcome === "accepted"
                          ? "bg-[oklch(0.72_0.18_145)]/5 border-[oklch(0.72_0.18_145)]/20"
                          : "bg-[oklch(0.6_0.2_25)]/5 border-[oklch(0.6_0.2_25)]/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            event.outcome === "accepted"
                              ? "bg-[oklch(0.72_0.18_145)]/20 text-[oklch(0.72_0.18_145)]"
                              : "bg-[oklch(0.6_0.2_25)]/20 text-[oklch(0.6_0.2_25)]"
                          )}>
                            {event.outcome === "accepted" ? "Accepted" : "Ignored"}
                          </span>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          isPositive ? "text-[oklch(0.72_0.18_145)]" : "text-[oklch(0.6_0.2_25)]"
                        )}>
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {change >= 0 ? "+" : ""}{change.toFixed(3)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs",
                          stateColors.bg,
                          stateColors.text
                        )}>
                          {STATE_LABELS[event.state]}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground">{ACTION_LABELS[event.action]}</span>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>Q: {event.qValueBefore.toFixed(3)}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className={isPositive ? "text-[oklch(0.72_0.18_145)]" : "text-[oklch(0.6_0.2_25)]"}>
                          {event.qValueAfter.toFixed(3)}
                        </span>
                        <span className="text-muted-foreground/60">
                          (reward: {event.reward >= 0 ? "+" : ""}{event.reward.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
