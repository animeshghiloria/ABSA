"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ColorType = "primary" | "destructive" | "warning" | "positive" | "accent"

interface StatCardProps {
  label: string
  value: number | string
  unit?: string
  trend?: number
  icon: LucideIcon
  format?: "number" | "time" | "percentage"
  color?: ColorType
}

const colorStyles: Record<ColorType, { icon: string; glow: string; border: string }> = {
  primary: {
    icon: "bg-[oklch(0.72_0.18_280)]/15 text-[oklch(0.72_0.18_280)]",
    glow: "from-[oklch(0.72_0.18_280)]/10",
    border: "group-hover:border-[oklch(0.72_0.18_280)]/30",
  },
  destructive: {
    icon: "bg-[oklch(0.6_0.2_25)]/15 text-[oklch(0.6_0.2_25)]",
    glow: "from-[oklch(0.6_0.2_25)]/10",
    border: "group-hover:border-[oklch(0.6_0.2_25)]/30",
  },
  warning: {
    icon: "bg-[oklch(0.75_0.18_60)]/15 text-[oklch(0.75_0.18_60)]",
    glow: "from-[oklch(0.75_0.18_60)]/10",
    border: "group-hover:border-[oklch(0.75_0.18_60)]/30",
  },
  positive: {
    icon: "bg-[oklch(0.72_0.18_145)]/15 text-[oklch(0.72_0.18_145)]",
    glow: "from-[oklch(0.72_0.18_145)]/10",
    border: "group-hover:border-[oklch(0.72_0.18_145)]/30",
  },
  accent: {
    icon: "bg-[oklch(0.68_0.2_195)]/15 text-[oklch(0.68_0.2_195)]",
    glow: "from-[oklch(0.68_0.2_195)]/10",
    border: "group-hover:border-[oklch(0.68_0.2_195)]/30",
  },
}

export function StatCard({
  label,
  value,
  unit,
  trend = 0,
  icon: Icon,
  format = "number",
  color = "primary",
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const timeout = setTimeout(() => {
      setDisplayValue(value)
      setIsAnimating(false)
    }, 150)
    return () => clearTimeout(timeout)
  }, [value])

  const formatValue = (val: number | string) => {
    if (typeof val === "string") return val
    if (format === "time") {
      const hours = Math.floor(val / 60)
      const minutes = val % 60
      return `${hours}h ${minutes}m`
    }
    if (format === "percentage") return `${val}%`
    return val.toString()
  }

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor =
    trend > 0
      ? "text-[oklch(0.72_0.18_145)]"
      : trend < 0
      ? "text-[oklch(0.6_0.2_25)]"
      : "text-muted-foreground"

  const styles = colorStyles[color]

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 p-5 transition-all duration-300 hover:bg-card/60 hover:translate-y-[-2px] hover:shadow-lg",
      styles.border
    )}>
      {/* Subtle glow effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        styles.glow
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-bold tracking-tight transition-all duration-300 ${
                isAnimating ? "opacity-50 scale-95" : "opacity-100 scale-100"
              }`}
            >
              {formatValue(displayValue)}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">{unit}</span>
            )}
          </div>
        </div>

        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          styles.icon
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Trend indicator */}
      <div className={`mt-3 flex items-center gap-1 text-xs ${trendColor}`}>
        <TrendIcon className="w-3 h-3" />
        <span>{Math.abs(trend)}% from yesterday</span>
      </div>
    </div>
  )
}
