// Maps the messy free-text marker names that come back from Brazilian lab PDFs
// (Fleury, Sabin, DASA, Hermes Pardini, Delboni, etc.) onto the canonical keys
// the goal engine and reference ranges understand.
//
// The matcher is intentionally permissive: it strips accents, lowercases,
// removes punctuation, and looks for key tokens. False positives are worse than
// false negatives, so when in doubt we leave the marker as "extra" — the
// nutricionista still sees it on the laudo.

import { KNOWN_MARKER_KEYS } from './lab-ranges.ts'

export type CanonicalMarker = (typeof KNOWN_MARKER_KEYS)[number]

interface AliasRule {
  canonical: CanonicalMarker
  // All tokens must be present (AND). Tokens are matched on the normalized
  // string (no accents, lowercase, no punctuation, single spaces).
  tokens: string[]
  // Optional: at least one of these must NOT be present. Useful to disambiguate
  // (e.g. "colesterol total" vs "colesterol HDL"). Empty = no exclusion.
  excludeTokens?: string[]
  // Optional unit hint to break ties when two rules match.
  unitHint?: string
}

// Order matters: more specific rules go first.
const ALIASES: AliasRule[] = [
  // ── Glucose / glycemia
  { canonical: 'glucose', tokens: ['glicose', 'jejum'] },
  { canonical: 'glucose', tokens: ['glicemia', 'jejum'] },
  { canonical: 'glucose', tokens: ['glicose'], excludeTokens: ['pos', 'tolerancia', 'urina'] },
  { canonical: 'glucose', tokens: ['glicemia'], excludeTokens: ['pos', 'tolerancia'] },

  // ── HbA1c
  { canonical: 'hba1c', tokens: ['hemoglobina', 'glicada'] },
  { canonical: 'hba1c', tokens: ['hemoglobina', 'glicosilada'] },
  { canonical: 'hba1c', tokens: ['hba1c'] },
  { canonical: 'hba1c', tokens: ['a1c'] },

  // ── Lipids — order: HDL/LDL first, total last (otherwise "colesterol" alone wins)
  { canonical: 'hdl', tokens: ['colesterol', 'hdl'] },
  { canonical: 'hdl', tokens: ['hdl', 'c'] },
  { canonical: 'hdl', tokens: ['hdl'] },
  { canonical: 'ldl', tokens: ['colesterol', 'ldl'] },
  { canonical: 'ldl', tokens: ['ldl', 'c'] },
  { canonical: 'ldl', tokens: ['ldl'] },
  { canonical: 'triglycerides', tokens: ['triglicerideos'] },
  { canonical: 'triglycerides', tokens: ['triglicerides'] },
  { canonical: 'triglycerides', tokens: ['triglicerios'] },
  { canonical: 'triglycerides', tokens: ['triglicerideos', 'sericos'] },
  { canonical: 'triglycerides', tokens: ['tg'], excludeTokens: ['o', 'p'] },
  { canonical: 'total_cholesterol', tokens: ['colesterol', 'total'] },
  { canonical: 'total_cholesterol', tokens: ['colesterol'], excludeTokens: ['hdl', 'ldl', 'vldl', 'nao'] },

  // ── Vitamin D — many labels: 25-OH, 25(OH), 25 hidroxi, calcidiol, vitamina D
  { canonical: 'vitaminD', tokens: ['25', 'hidroxi', 'vitamina', 'd'] },
  { canonical: 'vitaminD', tokens: ['25', 'oh', 'vitamina', 'd'] },
  { canonical: 'vitaminD', tokens: ['25', 'oh', 'd'] },
  { canonical: 'vitaminD', tokens: ['calcidiol'] },
  { canonical: 'vitaminD', tokens: ['vitamina', 'd', '3'] },
  { canonical: 'vitaminD', tokens: ['vitamina', 'd'], excludeTokens: ['1', '25', 'ativa'] },

  // ── Ferritin
  { canonical: 'ferritin', tokens: ['ferritina'] },

  // ── B12
  { canonical: 'b12', tokens: ['vitamina', 'b12'] },
  { canonical: 'b12', tokens: ['cianocobalamina'] },
  { canonical: 'b12', tokens: ['cobalamina'] },
  { canonical: 'b12', tokens: ['b12'] },

  // ── Thyroid
  { canonical: 'tsh', tokens: ['tsh'] },
  { canonical: 'tsh', tokens: ['hormonio', 'tireoestimulante'] },
  { canonical: 'tsh', tokens: ['tireotrofina'] },
  { canonical: 't4_free', tokens: ['t4', 'livre'] },
  { canonical: 't4_free', tokens: ['tiroxina', 'livre'] },
  { canonical: 't4_free', tokens: ['ft4'] },

  // ── Renal
  { canonical: 'creatinine', tokens: ['creatinina'], excludeTokens: ['urina', 'depuracao', 'clearance'] },
  { canonical: 'urea', tokens: ['ureia'] },
  { canonical: 'urea', tokens: ['uria'] },
  { canonical: 'uric_acid', tokens: ['acido', 'urico'] },

  // ── Liver
  { canonical: 'alt', tokens: ['alanina', 'aminotransferase'] },
  { canonical: 'alt', tokens: ['alt'] },
  { canonical: 'alt', tokens: ['tgp'] },
  { canonical: 'ast', tokens: ['aspartato', 'aminotransferase'] },
  { canonical: 'ast', tokens: ['ast'] },
  { canonical: 'ast', tokens: ['tgo'] },
  { canonical: 'ggt', tokens: ['gama', 'gt'] },
  { canonical: 'ggt', tokens: ['gama', 'glutamil'] },
  { canonical: 'ggt', tokens: ['ggt'] },

  // ── CBC
  { canonical: 'hemoglobin', tokens: ['hemoglobina'], excludeTokens: ['glicada', 'glicosilada'] },
  { canonical: 'hematocrit', tokens: ['hematocrito'] },

  // ── Inflammation
  { canonical: 'crp', tokens: ['proteina', 'c', 'reativa', 'ultra'] },
  { canonical: 'crp', tokens: ['pcr', 'us'] },
  { canonical: 'crp', tokens: ['pcr', 'ultra'] },
  { canonical: 'crp', tokens: ['proteina', 'c', 'reativa'] },
  { canonical: 'crp', tokens: ['pcr'], excludeTokens: ['urina'] },

  // ── Electrolytes
  { canonical: 'magnesium', tokens: ['magnesio'] },
  { canonical: 'sodium', tokens: ['sodio'], excludeTokens: ['urina', '24'] },
  { canonical: 'potassium', tokens: ['potassio'], excludeTokens: ['urina', '24'] },
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean)
}

export function canonicalizeMarker(
  rawMarker: string,
  unit?: string | null,
): CanonicalMarker | null {
  if (!rawMarker) return null
  const tokens = tokenize(rawMarker)
  if (tokens.length === 0) return null
  const tokenSet = new Set(tokens)
  const normalizedUnit = unit ? normalize(unit) : null

  const matches: AliasRule[] = []
  for (const rule of ALIASES) {
    const allPresent = rule.tokens.every((t) => tokenSet.has(t))
    if (!allPresent) continue
    const noneExcluded =
      !rule.excludeTokens || rule.excludeTokens.every((t) => !tokenSet.has(t))
    if (!noneExcluded) continue
    matches.push(rule)
  }

  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0].canonical

  if (normalizedUnit) {
    const byUnit = matches.find(
      (m) => m.unitHint && normalize(m.unitHint) === normalizedUnit,
    )
    if (byUnit) return byUnit.canonical
  }
  return matches[0].canonical
}
