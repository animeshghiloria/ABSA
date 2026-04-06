"use client"

import { Sparkles } from "lucide-react"

interface InsightCardProps {
  insight: string
}

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card/60 to-accent/10 backdrop-blur-xl border border-primary/20 p-6 transition-all duration-500 hover:border-primary/30">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse" />
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            AI Insight
          </span>
        </div>

        <p className="text-lg font-medium text-foreground leading-relaxed">
          {insight}
        </p>
      </div>
    </div>
  )
}
