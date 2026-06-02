import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Flag,
  FlaskConical,
  Info,
  Leaf,
  MinusCircle,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Upload,
  Utensils,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { interpretLabs, type RawMarker } from '@/lib/labs/interpret'
import type { Sex } from '@/lib/labs/reference-ranges'
import { translateExam, type ActionSeverity, type TranslatedMarker } from '@/lib/labs/diet-translation'
import { ExamGoalSync } from './exam-goal-sync'

interface AiGoals {
  kcal?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  water_ml?: number
  flags?: string[]
  habits?: string[]
  priority_micros?: string[]
  rationale?: string
}

interface LabRow {
  id: string
  marker: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
  measured_at: string
  upload_id: string | null
}

function profileSex(raw: string | null | undefined): Sex {
  if (raw === 'male') return 'M'
  if (raw === 'female') return 'F'
  return 'any'
}

function severityChip(severity: ActionSeverity) {
  switch (severity) {
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
          <ShieldAlert className="h-3 w-3" /> Crítico
        </span>
      )
    case 'altered':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
          <TrendingDown className="h-3 w-3" /> Alterado
        </span>
      )
    case 'attention':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          <Info className="h-3 w-3" /> Atenção
        </span>
      )
  }
}

function statusBadge(status: string | null) {
  if (!status) return null
  const map: Record<string, { text: string; cls: string }> = {
    critical_low: { text: 'Crítico baixo', cls: 'bg-rose-100 text-rose-700' },
    critical_high: { text: 'Crítico alto', cls: 'bg-rose-100 text-rose-700' },
    low: { text: 'Baixo', cls: 'bg-orange-100 text-orange-700' },
    high: { text: 'Alto', cls: 'bg-orange-100 text-orange-700' },
    borderline_low: { text: 'Limítrofe baixo', cls: 'bg-amber-100 text-amber-800' },
    borderline_high: { text: 'Limítrofe alto', cls: 'bg-amber-100 text-amber-800' },
    optimal: { text: 'Ótimo', cls: 'bg-emerald-100 text-emerald-700' },
  }
  const entry = map[status]
  if (!entry) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.cls}`}>
      {entry.text}
    </span>
  )
}

const FLAG_COPY: Record<string, { label: string; explain: string }> = {
  low_glycemic: {
    label: 'Baixo índice glicêmico',
    explain: 'Priorizar carboidratos integrais, controlar porção e combinar com proteína/fibra.',
  },
  cardio_focus: {
    label: 'Foco cardiovascular',
    explain: 'Fibra solúvel, peixes gordos e padrão mediterrâneo para baixar LDL e inflamação.',
  },
  anti_inflammatory: {
    label: 'Anti-inflamatório',
    explain: 'Ômega-3, antioxidantes vegetais e menos ultraprocessados.',
  },
  vit_d_priority: {
    label: 'Prioridade vitamina D',
    explain: 'Sol + peixes gordos + avaliação de suplementação.',
  },
  b12_priority: {
    label: 'Prioridade B12',
    explain: 'Reforçar fontes animais (ou suplementar se vegano).',
  },
  iron_focus: {
    label: 'Foco em ferro',
    explain: 'Ferro heme + vitamina C nas refeições; sem café junto da comida.',
  },
  magnesium_priority: {
    label: 'Prioridade magnésio',
    explain: 'Oleaginosas, folhas verdes e leguminosas diariamente.',
  },
  liver_caution: {
    label: 'Cuidado hepático',
    explain: 'Suspender álcool, reduzir açúcar e ultraprocessados.',
  },
  renal_caution: {
    label: 'Cuidado renal',
    explain: 'Modular proteína e sódio, hidratação consistente.',
  },
  low_purine: {
    label: 'Baixa em purinas',
    explain: 'Menos vísceras, frutos do mar e cerveja.',
  },
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export default async function ExamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, labsRes, uploadsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('age, biological_sex, ai_daily_goals, ai_goals_generated_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('lab_results')
      .select('id, marker, value, unit, reference_min, reference_max, measured_at, upload_id')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('lab_uploads')
      .select('id, original_filename, parsed_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const profile = profileRes.data
  const labs: LabRow[] = labsRes.data ?? []
  const uploads = uploadsRes.data ?? []
  const goals = (profile?.ai_daily_goals as AiGoals | null) ?? null
  const goalFlags = goals?.flags ?? []

  // Empty state — no lab results saved yet.
  if (labs.length === 0) {
    return (
      <div className="space-y-6 page-enter">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sans">Exames</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Quando você subir um exame, eu interpreto cada marcador e mostro como adaptar sua dieta a partir deles.
          </p>
        </div>
        <Card className="border-0 shadow-sm p-8 text-center space-y-4">
          <FlaskConical className="mx-auto h-10 w-10 text-primary/40" />
          <p className="text-sm text-muted-foreground font-body">
            Ainda não há exames registrados.
          </p>
          <Link
            href="/health-data"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Upload className="h-4 w-4" />
            Subir primeiro exame
          </Link>
        </Card>
      </div>
    )
  }

  // Pick the most recent measured_at as "the latest exam", then take all rows
  // from that date so we group same-day extractions together (a single laudo
  // tipically has one date but multiple rows from different markers).
  const latestDate = labs[0].measured_at
  const latestLabs = labs.filter((l) => l.measured_at === latestDate)
  const historyDates = Array.from(new Set(labs.map((l) => l.measured_at)))

  const sex = profileSex(profile?.biological_sex)
  const age = typeof profile?.age === 'number' ? profile.age : 30

  const rawMarkers: RawMarker[] = latestLabs.map((l) => ({
    marker: l.marker,
    value: Number(l.value),
    unit: l.unit,
    reference_min: l.reference_min,
    reference_max: l.reference_max,
  }))
  const interpreted = interpretLabs(rawMarkers, sex, age)
  const translated = translateExam(interpreted.markers)

  const actionable: TranslatedMarker[] = translated.items.filter((t) => t.translation !== null)
  const optimal: TranslatedMarker[] = translated.items.filter((t) => !t.translation && t.marker.status === 'optimal')
  const unknown: TranslatedMarker[] = translated.items.filter(
    (t) => !t.translation && t.marker.status !== 'optimal',
  )

  const examFlagsNotInGoals = translated.goalFlags.filter((f) => !goalFlags.includes(f))
  const goalsGeneratedAt = profile?.ai_goals_generated_at as string | null | undefined
  const goalsRecentVsExam =
    goalsGeneratedAt && goalsGeneratedAt >= `${latestDate}T00:00:00`

  return (
    <div className="space-y-6 page-enter">
      {/* Trigger goal regen if exam is newer than goals. Runs once on mount. */}
      <ExamGoalSync
        latestExamDate={latestDate}
        goalsGeneratedAt={goalsGeneratedAt ?? null}
      />

      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Exames e dieta</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Exame de <strong>{formatDateBR(latestDate)}</strong> · {interpreted.markers.length} marcadores lidos · {actionable.length} com ação sugerida na dieta.
        </p>
      </div>

      {/* Rollup chips */}
      <div className="flex flex-wrap gap-1.5">
        {interpreted.rollup.optimal > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            {interpreted.rollup.optimal} ótimos
          </span>
        )}
        {interpreted.rollup.borderline > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            <Info className="h-3 w-3" />
            {interpreted.rollup.borderline} limítrofes
          </span>
        )}
        {interpreted.rollup.out_of_range > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
            <TrendingDown className="h-3 w-3" />
            {interpreted.rollup.out_of_range} fora da faixa
          </span>
        )}
        {interpreted.rollup.critical > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
            <ShieldAlert className="h-3 w-3" />
            {interpreted.rollup.critical} críticos
          </span>
        )}
      </div>

      {/* Sync card — how this exam translates into your daily plan */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-[#1a3a2a] to-[#0f2318] p-6 text-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Como este exame ajusta sua dieta</h2>
            <p className="text-xs text-white/60 font-body">
              {goalsRecentVsExam
                ? 'Suas metas diárias já estão sincronizadas com este exame.'
                : 'Vou recalcular suas metas diárias usando esses marcadores.'}
            </p>
          </div>
        </div>

        {translated.goalFlags.length > 0 ? (
          <div className="space-y-2.5">
            {translated.goalFlags.map((flag) => {
              const copy = FLAG_COPY[flag]
              if (!copy) return null
              const active = goalFlags.includes(flag)
              return (
                <div
                  key={flag}
                  className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-white/80" />
                      <p className="text-sm font-semibold">{copy.label}</p>
                    </div>
                    {active && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                        <CheckCircle2 className="h-2.5 w-2.5" /> ativo no plano
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 font-body leading-relaxed">{copy.explain}</p>
                </div>
              )
            })}
            {examFlagsNotInGoals.length > 0 && !goalsRecentVsExam && (
              <p className="text-[11px] text-white/60 font-body pt-1">
                Estou recalculando suas metas com base neste exame — recarregue a tela em alguns segundos para ver as novas calorias, proteína e micros sugeridos.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
            <p className="text-sm">
              Nenhum marcador deste exame exige mudança grande no plano. Continue com a estratégia atual e revise no próximo exame.
            </p>
          </div>
        )}

        {goals?.rationale && (
          <p className="text-[11px] text-white/60 font-body mt-4 leading-relaxed">
            <strong>Plano atual:</strong> {goals.rationale}
          </p>
        )}
      </Card>

      {/* Actionable markers — each with diet translation */}
      {actionable.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
              Marcadores com ação sugerida
            </h2>
            <span className="text-xs text-muted-foreground">{actionable.length}</span>
          </div>
          <div className="space-y-3">
            {actionable.map((item, i) => {
              const t = item.translation!
              const m = item.marker
              const ref =
                m.reference_min !== null || m.reference_max !== null
                  ? `Ref: ${m.reference_min ?? '<'}${m.reference_min !== null && m.reference_max !== null ? '–' : ''}${m.reference_max ?? ''} ${m.unit}`
                  : null
              return (
                <Card
                  key={`${m.canonical ?? m.rawMarker}-${i}`}
                  className="border-0 shadow-sm p-5 space-y-3"
                >
                  {/* Header: name + value + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground">
                          {m.label ?? m.rawMarker}
                        </h3>
                        {statusBadge(m.status)}
                      </div>
                      {ref && <p className="text-[11px] text-muted-foreground font-body mt-0.5">{ref}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">
                        {m.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-body">{m.unit}</p>
                    </div>
                  </div>

                  {/* Severity + why */}
                  <div className="flex items-start gap-2">
                    {severityChip(t.severity)}
                  </div>
                  <p className="text-sm text-foreground/80 font-body leading-relaxed">{t.why}</p>

                  {/* Macro impact */}
                  {t.macroImpact && (
                    <div className="rounded-lg bg-primary/5 p-3 flex items-start gap-2">
                      <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                          Ajuste no plano
                        </p>
                        <p className="text-sm text-foreground/80 font-body">{t.macroImpact}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {t.actions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60 mb-2">
                        O que fazer
                      </p>
                      <ul className="space-y-1.5">
                        {t.actions.map((a, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm font-body text-foreground/85">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>{a.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Foods */}
                  {(t.foods.emphasize.length > 0 || t.foods.reduce.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {t.foods.emphasize.length > 0 && (
                        <div className="rounded-lg bg-emerald-50 p-3">
                          <p className="text-[11px] font-semibold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                            <Leaf className="h-3 w-3" /> Inclua mais
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {t.foods.emphasize.map((f) => (
                              <span key={f} className="text-[11px] bg-white text-emerald-800 rounded-full px-2 py-0.5 font-body">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {t.foods.reduce.length > 0 && (
                        <div className="rounded-lg bg-rose-50 p-3">
                          <p className="text-[11px] font-semibold text-rose-800 mb-1.5 flex items-center gap-1.5">
                            <MinusCircle className="h-3 w-3" /> Reduza
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {t.foods.reduce.map((f) => (
                              <span key={f} className="text-[11px] bg-white text-rose-800 rounded-full px-2 py-0.5 font-body">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source */}
                  {m.source && (
                    <p className="text-[10px] text-muted-foreground font-body italic pt-1">
                      Faixa de referência: {m.source}
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Optimal markers — compact */}
      {optimal.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
            Marcadores em ótimo estado
          </h2>
          <Card className="border-0 shadow-sm p-4">
            <ul className="divide-y divide-border/40">
              {optimal.map((item, i) => {
                const m = item.marker
                return (
                  <li
                    key={`${m.canonical ?? m.rawMarker}-${i}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-foreground truncate">{m.label ?? m.rawMarker}</span>
                    </div>
                    <span className="text-foreground/70 tabular-nums shrink-0 text-xs">
                      {m.value} {m.unit}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>
      )}

      {/* Unknown / extra markers — saved but not in our reference library */}
      {unknown.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
            Outros marcadores lidos
          </h2>
          <Card className="border-0 shadow-sm p-4">
            <p className="text-[11px] text-muted-foreground font-body mb-3">
              Não temos faixa clínica padronizada no app para estes — seu nutri/médico interpreta usando a referência do laboratório.
            </p>
            <ul className="divide-y divide-border/40">
              {unknown.map((item, i) => {
                const m = item.marker
                const ref =
                  m.reference_min !== null || m.reference_max !== null
                    ? `${m.reference_min ?? '<'}${m.reference_min !== null && m.reference_max !== null ? '–' : ''}${m.reference_max ?? ''}`
                    : null
                return (
                  <li
                    key={`${m.rawMarker}-${i}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="font-medium text-foreground truncate">{m.rawMarker}</span>
                    <span className="text-right shrink-0 text-xs">
                      <span className="text-foreground/80 tabular-nums">{m.value} {m.unit}</span>
                      {ref && <span className="text-muted-foreground ml-1.5">({ref})</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>
      )}

      {/* History */}
      {historyDates.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">Histórico</h2>
          <Card className="border-0 shadow-sm p-4">
            <ul className="space-y-2 text-sm">
              {historyDates.slice(0, 8).map((date) => {
                const count = labs.filter((l) => l.measured_at === date).length
                const isLatest = date === latestDate
                return (
                  <li key={date} className="flex items-center justify-between font-body">
                    <span className={isLatest ? 'font-semibold text-foreground' : 'text-foreground/70'}>
                      {formatDateBR(date)}
                      {isLatest && <span className="ml-2 text-[10px] text-primary">(atual)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{count} marcadores</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>
      )}

      {/* Footer CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/health-data"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-muted/50"
        >
          <Upload className="h-4 w-4" />
          Subir novo exame
        </Link>
        <Link
          href="/plan"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Utensils className="h-4 w-4" />
          Ver meu plano ajustado
        </Link>
      </div>

      {/* Hidden context for nutri linking discussion */}
      {uploads[0]?.parsed_at && (
        <p className="text-[10px] text-muted-foreground font-body text-center">
          Última interpretação automática: {new Date(uploads[0].parsed_at).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  )
}
