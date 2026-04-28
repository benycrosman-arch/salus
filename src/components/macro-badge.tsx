"use client"

import { cn } from "@/lib/utils"

interface MacroBadgeProps {
  label: string
  value: number
  unit: string
  color?: string
  className?: string
}

export function MacroBadge({ label, value, unit, color, className }: MacroBadgeProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl bg-[#faf8f4] px-3 py-2.5 min-w-[70px] ring-1 ring-black/[0.04]",
        className
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/60">
        {label}
      </span>
      <span
        className="font-display text-xl"
        style={color ? { color } : { color: "#1a3a2a" }}
      >
        {Math.round(value)}
      </span>
      <span className="text-[10px] text-[#1a3a2a]/60">{unit}</span>
    </div>
  )
}
