"use client"

import * as React from "react"
import { Search, X, Loader2 } from "@/components/icons"
import { cn } from "@/lib/utils"

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onValueChange: (value: string) => void
  onClear?: () => void
  loading?: boolean
  /** Soft (white card) or inset (muted, sits inside a section). */
  tone?: "soft" | "inset"
}

// Polished, brand-tuned search input. The bespoke magnifier sits in a
// leading slot, the lens "blooms" (scales + tints terracotta) on focus,
// and a clear affordance appears once there's a query.
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { value, onValueChange, onClear, loading, tone = "soft", className, placeholder = "Buscar…", ...props },
    ref,
  ) {
    const [focused, setFocused] = React.useState(false)
    const hasValue = value.length > 0

    return (
      <div
        className={cn(
          "group relative flex items-center gap-2.5 rounded-2xl border px-3.5 transition-all duration-200",
          tone === "soft"
            ? "border-[#e4ddd4] bg-white"
            : "border-transparent bg-[#1a3a2a]/[0.04]",
          focused
            ? "border-[#1a3a2a]/40 shadow-[0_1px_0_0_rgba(26,58,42,0.04),0_8px_24px_-12px_rgba(26,58,42,0.25)] ring-2 ring-[#1a3a2a]/10"
            : "hover:border-[#1a3a2a]/20",
          className,
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 flex-shrink-0 items-center justify-center transition-all duration-200",
            focused ? "scale-110 text-[#c4614a]" : "text-[#1a3a2a]/40",
          )}
        >
          {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Search className="h-[18px] w-[18px]" />}
        </span>

        <input
          ref={ref}
          type="text"
          inputMode="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e) }}
          placeholder={placeholder}
          className="h-11 flex-1 bg-transparent text-sm font-medium text-[#1a3a2a] outline-none placeholder:font-normal placeholder:text-[#1a3a2a]/40"
          {...props}
        />

        {hasValue && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => { onValueChange(""); onClear?.() }}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#1a3a2a]/40 transition-colors hover:bg-[#1a3a2a]/[0.06] hover:text-[#1a3a2a] active:scale-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  },
)
