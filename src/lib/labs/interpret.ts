// Turns raw lab values into clinical context the goal engine and the UI can
// consume. Pure functions — no DB, no network. Inputs come from `parse-pdf.ts`
// or from manual entry in the onboarding form; outputs feed into the goal AI
// and the dashboard.

import {
  classifyValue,
  findRangeRule,
  type Band,
  type LabStatus,
  type RangeRule,
  type Sex,
} from './reference-ranges'
import { canonicalizeMarker } from './marker-aliases'

export interface RawMarker {
  marker: string                 // raw text from laudo OR canonical key
  value: number
  unit: string
  reference_min?: number | null
  reference_max?: number | null
}

export interface InterpretedMarker {
  // Echo of the raw input.
  rawMarker: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null

  // Set when we recognize the marker against the canonical library.
  canonical: string | null
  label: string | null
  status: LabStatus | null
  message: string | null
  flag: string | null
  source: string | null

  // True if the value falls outside the optimal band (any non-optimal status).
  outOfRange: boolean
}

export interface InterpretedLabs {
  markers: InterpretedMarker[]
  flags: string[]                // dedup'd flags suitable for the goal engine
  // Quick rollup the dashboard renders without re-iterating.
  rollup: {
    optimal: number
    borderline: number
    out_of_range: number
    critical: number
    total: number
  }
}

const NORMAL_STATUSES: LabStatus[] = ['optimal']

function isOutOfRange(status: LabStatus | null): boolean {
  return !!status && !NORMAL_STATUSES.includes(status)
}

function isCritical(status: LabStatus | null): boolean {
  return status === 'critical_low' || status === 'critical_high'
}

function isBorderline(status: LabStatus | null): boolean {
  return status === 'borderline_low' || status === 'borderline_high'
}

export function interpretMarker(
  raw: RawMarker,
  sex: Sex,
  age: number,
): InterpretedMarker {
  const canonical = canonicalizeMarker(raw.marker, raw.unit)
  let rule: RangeRule | null = null
  let band: Band | null = null
  if (canonical) {
    rule = findRangeRule(canonical, sex, age)
    if (rule) band = classifyValue(raw.value, rule.bands)
  }

  const status = band?.status ?? null
  return {
    rawMarker: raw.marker,
    value: raw.value,
    unit: raw.unit,
    reference_min: raw.reference_min ?? null,
    reference_max: raw.reference_max ?? null,
    canonical,
    label: rule?.label ?? null,
    status,
    message: band?.message ?? null,
    flag: band?.flag ?? null,
    source: rule?.source ?? null,
    outOfRange: isOutOfRange(status),
  }
}

export function interpretLabs(
  rawMarkers: RawMarker[],
  sex: Sex,
  age: number,
): InterpretedLabs {
  const markers = rawMarkers.map((m) => interpretMarker(m, sex, age))

  const flagSet = new Set<string>()
  let optimal = 0
  let borderline = 0
  let critical = 0
  let outOfRange = 0
  for (const m of markers) {
    if (m.flag) flagSet.add(m.flag)
    if (m.status === 'optimal') optimal++
    else if (isCritical(m.status)) critical++
    else if (isBorderline(m.status)) borderline++
    else if (m.outOfRange) outOfRange++
  }

  return {
    markers,
    flags: Array.from(flagSet),
    rollup: {
      optimal,
      borderline,
      out_of_range: outOfRange,
      critical,
      total: markers.length,
    },
  }
}

// Compact representation the goal AI consumes — drops the per-marker prose
// and keeps just the signals that matter for macro/micro decisions.
export interface LabSignal {
  marker: string
  canonical: string | null
  value: number
  unit: string
  status: LabStatus | null
  flag: string | null
  source: string | null
}

export function toLabSignals(interpreted: InterpretedLabs): LabSignal[] {
  return interpreted.markers.map((m) => ({
    marker: m.label ?? m.rawMarker,
    canonical: m.canonical,
    value: m.value,
    unit: m.unit,
    status: m.status,
    flag: m.flag,
    source: m.source,
  }))
}
