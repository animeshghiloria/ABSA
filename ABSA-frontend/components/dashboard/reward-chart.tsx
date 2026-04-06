"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from "recharts"

interface RewardChartProps {
  data: { step: number; reward: number; cumulative: number }[]
}

export function RewardChart({ data }: RewardChartProps) {
  const latestCumulative = data.length > 0 ? data[data.length - 1].cumulative : 0
  const isPositive = latestCumulative >= 0

  return (
    <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-[oklch(0.72_0.18_145)]" />
          ) : (
            <TrendingDown className="w-4 h-4 text-[oklch(0.6_0.2_25)]" />
          )}
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Reward Over Time
          </h2>
        </div>
        <div className={`text-sm font-mono font-medium ${isPositive ? "text-[oklch(0.72_0.18_145)]" : "text-[oklch(0.6_0.2_25)]"}`}>
          Σ = {latestCumulative >= 0 ? "+" : ""}{latestCumulative.toFixed(2)}
        </div>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.72 0.18 280)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.72 0.18 280)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="stepRewardGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.68 0.2 195)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="oklch(0.68 0.2 195)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.25 0.03 270)"
              vertical={false}
            />
            <XAxis
              dataKey="step"
              tick={{ fontSize: 11, fill: "oklch(0.6 0.02 270)" }}
              axisLine={{ stroke: "oklch(0.25 0.03 270)" }}
              tickLine={false}
              label={{ value: "Step", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "oklch(0.6 0.02 270)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "oklch(0.6 0.02 270)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.15 0.02 270)",
                borderColor: "oklch(0.25 0.03 270)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "oklch(0.95 0.01 270)",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === "cumulative" ? "Cumulative" : "Step Reward",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "oklch(0.6 0.02 270)" }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="oklch(0.72 0.18 280)"
              strokeWidth={2}
              fill="url(#cumulativeGrad)"
              name="Cumulative"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="reward"
              stroke="oklch(0.68 0.2 195)"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "oklch(0.68 0.2 195)" }}
              name="Step Reward"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
