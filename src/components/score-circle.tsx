"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ScoreCircleProps {
  score: number
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
  animated?: boolean
  showGlow?: boolean
}

function getScoreColor(score: number): { main: string; glow: string; bg: string } {
  if (score >= 80) return { main: "#1a3a2a", glow: "rgba(26, 58, 42, 0.15)", bg: "rgba(26, 58, 42, 0.06)" }
  if (score >= 60) return { main: "#2d8a56", glow: "rgba(45, 138, 86, 0.15)", bg: "rgba(45, 138, 86, 0.06)" }
  if (score >= 40) return { main: "#e09f3e", glow: "rgba(224, 159, 62, 0.15)", bg: "rgba(224, 159, 62, 0.06)" }
  return { main: "#dc2626", glow: "rgba(220, 38, 38, 0.15)", bg: "rgba(220, 38, 38, 0.06)" }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 60) return "Good"
  if (score >= 40) return "Fair"
  return "Needs Work"
}

export function ScoreCircle({
  score,
  size = 160,
  strokeWidth = 8,
  className,
  label,
  animated = true,
  showGlow = true,
}: ScoreCircleProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayScore / 100) * circumference
  const colors = getScoreColor(score)
  const center = size / 2

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score)
      return
    }

    let frame: number
    const duration = 1800
    const start = performance.now()

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score, animated])

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: showGlow ? `drop-shadow(0 0 20px ${colors.glow})` : undefined,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Subtle background glow */}
          <circle
            cx={center}
            cy={center}
            r={radius + 4}
            fill={colors.bg}
          />
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e7e2da"
            strokeWidth={strokeWidth}
            opacity={0.6}
          />
          {/* Score arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.main}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animated ? "none" : "stroke-dashoffset 0.3s ease",
            }}
          />
          {/* Leading dot */}
          {displayScore > 2 && (
            <circle
              cx={center + radius * Math.cos(((displayScore / 100) * 360 - 90) * Math.PI / 180)}
              cy={center + radius * Math.sin(((displayScore / 100) * 360 - 90) * Math.PI / 180)}
              r={strokeWidth / 2 + 2}
              fill={colors.main}
              opacity={0.9}
            />
          )}
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display leading-none"
            style={{
              color: colors.main,
              fontSize: size * 0.28,
            }}
          >
            {displayScore}
          </span>
          <span className="mt-1 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            {label || getScoreLabel(score)}
          </span>
        </div>
      </div>
    </div>
  )
}
