import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Mail, Calendar, Target, Activity, UtensilsCrossed,
  CreditCard, FlaskConical, AlertCircle, CheckCircle, User, Phone,
} from "lucide-react"
import { SignOutButton } from "./sign-out-button"

const GOAL_LABELS: Record<string, string> = {
  "lose-weight": "Perder peso",
  "build-muscle": "Ganhar massa muscular",
  "more-energy": "Mais energia",
  "gut-health": "Saúde intestinal",
  "blood-sugar": "Controle do açúcar no sangue",
  "sleep": "Melhorar o sono",
  "longevity": "Longevidade",
  "performance": "Performance esportiva",
  "heart-health": "Saúde cardiovascular",
}

const DIET_LABELS: Record<string, string> = {
  omnivore: "Onívoro",
  vegetarian: "Vegetariano",
  vegan: "Vegano",
  pescatarian: "Pescetariano",
  keto: "Low-carb / Keto",
  paleo: "Paleo",
}

const ALLERGY_LABELS: Record<string, string> = {
  gluten: "Glúten",
  dairy: "Lactose",
  seafood: "Frutos do mar",
  nuts: "Oleaginosas",
  soy: "Soja",
  eggs: "Ovos",
}

async function getProfileData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, prefsRes, labsRes] = await Promise.all([
    supabase.from('profiles').select('name, plan, created_at, age, biological_sex, height_cm, weight_kg, city, activity_level, phone').eq('id', user.id).single(),
    supabase.from('user_preferences').select('goals, diet_type, allergies, gut_score').eq('user_id', user.id).single(),
    supabase.from('lab_results').select('marker, value, unit').eq('user_id', user.id).order('measured_at', { ascending: false }),
  ])

  return {
    user,
    profile: profileRes.data,
    prefs: prefsRes.data,
    labs: labsRes.data ?? [],
  }
}

export default async function ProfilePage() {
  const { user, profile, prefs, labs } = await getProfileData()

  const name = profile?.name || user.email?.split('@')[0] || 'Usuário'
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const planLabel = profile?.plan === 'pro' ? 'Pro' : profile?.plan === 'nutri_pro' ? 'Nutri Pro' : 'Gratuito'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  const goals: string[] = prefs?.goals ?? []
  const allergies: string[] = prefs?.allergies ?? []
  const gutScore = prefs?.gut_score ?? null
  const dietType = prefs?.diet_type ?? null

  // Pick key labs to highlight (most recent value per marker)
  const seenMarkers = new Set<string>()
  const keyLabs = labs.filter(l => {
    if (seenMarkers.has(l.marker)) return false
    seenMarkers.add(l.marker)
    return true
  }).slice(0, 4)

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-serif text-4xl italic text-[#1a3a2a]">Perfil</h1>
        <p className="mt-1 text-sm text-[#1a3a2a]/50">Suas informações e preferências de saúde</p>
      </div>

      {/* Profile Card */}
      <Card className="rounded-3xl border-0 bg-white p-8 shadow-lg ring-1 ring-black/[0.04]">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Avatar className="h-24 w-24 bg-[#1a3a2a] text-white ring-4 ring-[#1a3a2a]/10">
            <AvatarFallback className="font-serif text-2xl italic bg-[#1a3a2a] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
              <h2 className="font-serif text-2xl italic text-[#1a3a2a]">{name}</h2>
              <Badge className="bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 rounded-lg text-xs">
                {planLabel}
              </Badge>
            </div>
            <div className="space-y-1.5 text-sm text-[#1a3a2a]/50">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Calendar className="h-4 w-4" />
                <span>Membro desde {memberSince}</span>
              </div>
              {(profile?.city || profile?.age) && (
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <User className="h-4 w-4" />
                  <span>
                    {[
                      profile.age ? `${profile.age} anos` : null,
                      profile.city,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Phone className="h-4 w-4" />
                  <span>{profile.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Health Goals */}
      {goals.length > 0 && (
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c4614a]/10">
              <Target className="h-4 w-4 text-[#c4614a]" />
            </div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60">
              Seus objetivos
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {goals.map((goal) => (
              <Badge key={goal} variant="outline"
                className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 px-4 py-2 text-sm text-[#1a3a2a] rounded-xl">
                {GOAL_LABELS[goal] ?? goal}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Gut + Lab Summary */}
      {(gutScore !== null || keyLabs.length > 0) && (
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
              <Activity className="h-4 w-4 text-[#1a3a2a]" />
            </div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60">
              Saúde & Exames
            </h3>
          </div>

          <div className="space-y-6">
            {/* Gut score */}
            {gutScore !== null && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#1a3a2a]">Score intestinal</span>
                    <span className="font-serif text-lg text-[#1a3a2a]">{gutScore}/100</span>
                  </div>
                  <Progress value={gutScore} className="h-3 rounded-full" />
                  <p className="text-xs text-[#1a3a2a]/60">
                    {gutScore >= 80 ? "Excelente — seu intestino está em ótima forma!"
                      : gutScore >= 60 ? "Bom — há espaço para melhorias"
                      : gutScore >= 40 ? "Regular — vamos trabalhar na sua saúde intestinal"
                      : "Precisa de atenção — vamos reconstruir suas bactérias boas do intestino"}
                  </p>
                </div>
                {keyLabs.length > 0 && <Separator className="bg-[#e4ddd4]" />}
              </>
            )}

            {/* Lab results */}
            {keyLabs.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {keyLabs.map((lab) => {
                  const isAbnormal =
                    (lab.marker === 'HbA1c' && lab.value > 5.7) ||
                    (lab.marker === 'Glicose em jejum' && lab.value > 100) ||
                    (lab.marker === 'Vitamina D' && lab.value < 30) ||
                    (lab.marker === 'LDL' && lab.value > 130) ||
                    (lab.marker === 'Triglicérides' && lab.value > 150)

                  return (
                    <div key={lab.marker}
                      className={`flex items-start gap-3 rounded-2xl border p-4 ${
                        isAbnormal
                          ? "border-[#c4614a]/15 bg-[#c4614a]/[0.04]"
                          : "border-[#1a3a2a]/10 bg-[#1a3a2a]/[0.03]"
                      }`}>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isAbnormal ? "bg-[#c4614a]/10" : "bg-[#1a3a2a]/8"
                      }`}>
                        {isAbnormal
                          ? <AlertCircle className="h-4 w-4 text-[#c4614a]" />
                          : <CheckCircle className="h-4 w-4 text-[#1a3a2a]" />
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1a3a2a]">{lab.marker}</span>
                          <Badge variant="outline"
                            className={`text-xs rounded-md ${isAbnormal
                              ? "border-[#c4614a]/20 bg-[#c4614a]/8 text-[#c4614a]"
                              : "border-[#1a3a2a]/15 bg-[#1a3a2a]/8 text-[#1a3a2a]"
                            }`}>
                            {isAbnormal ? "Atenção" : "Normal"}
                          </Badge>
                        </div>
                        <p className="mt-1 font-serif text-xl text-[#1a3a2a]">
                          {lab.value}{" "}
                          <span className="text-sm font-sans font-normal text-[#1a3a2a]/60">{lab.unit}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Diet Preferences */}
      {(dietType || allergies.length > 0) && (
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
              <UtensilsCrossed className="h-4 w-4 text-[#1a3a2a]" />
            </div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60">
              Alimentação
            </h3>
          </div>
          <div className="space-y-4">
            {dietType && (
              <div>
                <p className="mb-2 text-xs font-medium text-[#1a3a2a]/60">Tipo de dieta</p>
                <Badge variant="outline"
                  className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 px-4 py-2 text-sm text-[#1a3a2a] rounded-xl">
                  {DIET_LABELS[dietType] ?? dietType}
                </Badge>
              </div>
            )}
            {allergies.length > 0 && (
              <>
                {dietType && <Separator className="bg-[#e4ddd4]" />}
                <div>
                  <p className="mb-2 text-xs font-medium text-[#1a3a2a]/60">Alergias e intolerâncias</p>
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((a) => (
                      <Badge key={a} variant="outline"
                        className="border-[#c4614a]/20 bg-[#c4614a]/5 px-3 py-1.5 text-sm text-[#c4614a] rounded-xl">
                        {ALLERGY_LABELS[a] ?? a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Account Actions */}
      <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
            <User className="h-4 w-4 text-[#1a3a2a]" />
          </div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#1a3a2a]/60">
            Conta
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/settings" className="contents">
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-[#1a3a2a]/10 text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Gerenciar assinatura
            </Button>
          </Link>
          <Link href="/health-data" className="contents">
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl border-[#1a3a2a]/10 text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              Atualizar exames
            </Button>
          </Link>
          <SignOutButton />
        </div>
      </Card>
    </div>
  )
}
