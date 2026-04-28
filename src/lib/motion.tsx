"use client"

import { useRef, Fragment } from "react"
import { motion, useInView, useScroll, useTransform, type Variants } from "framer-motion"

// ─── Fade Up on scroll ────────────────────────────────────────────────────────
export function FadeUp({
  children,
  delay = 0,
  duration = 0.7,
  className,
  once = true,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
  once?: boolean
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger children ─────────────────────────────────────────────────────────
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.08,
  once = true,
}: {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  once?: boolean
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: "-60px" })

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
    },
  }

  return (
    <motion.div
      ref={ref}
      variants={container}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const item: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  )
}

// ─── Scale In ─────────────────────────────────────────────────────────────────
export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Parallax wrapper ─────────────────────────────────────────────────────────
export function Parallax({
  children,
  speed = 0.3,
  className,
}: {
  children: React.ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, -speed * 100])

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

// ─── Text Reveal (word-by-word) ───────────────────────────────────────────────
export function TextReveal({
  text,
  className,
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  const words = text.split(" ")

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <motion.span
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  )
}

// ─── Counter animation ────────────────────────────────────────────────────────
export function Counter({
  target,
  suffix = "",
  prefix = "",
  duration = 2,
  className,
}: {
  target: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.span ref={ref} className={className}>
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {prefix}
          <CounterNumber target={target} duration={duration} />
          {suffix}
        </motion.span>
      ) : (
        <span className="opacity-0">{prefix}0{suffix}</span>
      )}
    </motion.span>
  )
}

function CounterNumber({ target, duration }: { target: number; duration: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      onAnimationStart={() => {
        if (!ref.current || !isInView) return
        const el = ref.current
        let start = 0
        const startTime = performance.now()
        const animate = (now: number) => {
          const elapsed = (now - startTime) / 1000
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          const current = Math.round(eased * target)
          if (current !== start) {
            el.textContent = current.toString()
            start = current
          }
          if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
      }}
    >
      0
    </motion.span>
  )
}

// ─── Magnetic hover ───────────────────────────────────────────────────────────
export function MagneticHover({
  children,
  className,
  strength = 0.3,
}: {
  children: React.ReactNode
  className?: string
  strength?: number
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1 + strength * 0.07 }}
      whileTap={{ scale: 1 - strength * 0.07 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  )
}

// ─── Blur fade in ─────────────────────────────────────────────────────────────
export function BlurIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, filter: "blur(12px)" }}
      animate={isInView ? { opacity: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Gradient Orb ─────────────────────────────────────────────────────────────
export function GradientOrb({
  color,
  size = 400,
  className,
}: {
  color: string
  size?: number
  className?: string
}) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -20, 30, 0],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}
