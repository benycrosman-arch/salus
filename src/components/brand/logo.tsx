import Image from "next/image"
import { cn } from "@/lib/utils"

// Single source of truth for the Salus brand mark (the radish glyph).
// Swap the asset here and it updates everywhere the logo is used.
export function SalusMark({
  size = 28,
  className,
  priority,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/salus-mark.png"
      alt="Salus"
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain", className)}
    />
  )
}

// Mark + "Salus" wordmark. Pass `word` to override the wordmark (e.g. "Salus Nutri").
export function SalusLogo({
  size = 30,
  className,
  wordClassName,
  word = "Salus",
  priority,
}: {
  size?: number
  className?: string
  wordClassName?: string
  word?: string
  priority?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <SalusMark size={size} priority={priority} />
      <span className={cn("font-serif italic text-[#1a3a2a]", wordClassName)}>{word}</span>
    </span>
  )
}
