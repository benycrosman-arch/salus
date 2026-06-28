import * as React from "react"
import type { LucideIcon } from "lucide-react"

// ============================================================
// Salus Icon System — "Duotone Organic"
//
// A bespoke, hand-drawn icon language for Salus. Every glyph is a
// soft duotone: an outline stroke in `currentColor` over a faint
// `currentColor` body fill, so an icon "fills in" wherever the
// surrounding text color goes solid (e.g. the active nav item on the
// forest-green pill). Botanical, rounded, calm — tuned to the radish
// mark and the serif wordmark instead of stock line icons.
//
// Drop-in compatible with lucide-react: same prop surface (`size`,
// `className`, `strokeWidth`, SVG passthrough) and typed as LucideIcon
// so existing call sites (`<Home className="h-5 w-5" />`) are untouched.
// ============================================================

export interface SalusIconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  size?: number | string
  /**
   * Force the duotone body on/off. Defaults to "auto": the body is
   * always present at a low opacity, which reads as duotone on light
   * surfaces and as a subtle inner glow on solid ones.
   */
  filled?: boolean
}

// Shared low-opacity body. Pulled into a constant so every icon shares
// the exact same duotone weight.
export const BODY = 0.16

export function Body({ d, opacity = BODY }: { d: string; opacity?: number }) {
  return <path d={d} fill="currentColor" fillOpacity={opacity} stroke="none" />
}

export function createIcon(
  displayName: string,
  render: () => React.ReactNode,
): LucideIcon {
  const Comp = React.forwardRef<SVGSVGElement, SalusIconProps>(function SalusIcon(
    { size = 24, strokeWidth, className, filled, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={(strokeWidth as number | undefined) ?? 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        data-salus-icon={displayName}
        data-filled={filled ? "" : undefined}
        {...rest}
      >
        {render()}
      </svg>
    )
  })
  Comp.displayName = displayName
  // Our forwardRef component satisfies every call site that expects a
  // LucideIcon (className/size/SVG props). The structural shapes differ
  // only in lucide's internal generics, so we assert the public type.
  return Comp as unknown as LucideIcon
}
