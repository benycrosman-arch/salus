"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Leaf,
  User,
  UserCircle,
  Minus,
  Armchair,
  Footprints,
  Bike,
  Dumbbell,
  Target,
  Zap,
  Droplet,
  Clock,
  Apple,
  Wheat,
  Milk,
  Fish,
  Egg,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Heart,
  Moon,
  TrendingUp,
  Loader2,
  Stethoscope,
  Users,
  FileText,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { callEdgeFunction } from "@/lib/ai-client"
import { createClient } from "@/lib/supabase/client"

type Sex = "male" | "female" | "non-binary" | "prefer-not-to-say"
type ActivityLevel = "sedentary" | "moderate" | "active" | "athlete"
type DietType = "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "paleo"
type Role = "user" | "nutricionista" | ""

interface OnboardingData {
  role: Role
  nutriProtocol: string
  age: number | ""
  sex: Sex | ""
  height: number | ""
  weight: number | ""
  activityLevel: ActivityLevel | ""
  city: string
  phone: string
  goals: string[]
  dietType: DietType | ""
  allergies: string[]
  labs: {
    glucose: number | ""
    hba1c: number | ""
    hdl: number | ""
    ldl: number | ""
    triglycerides: number | ""
    vitaminD: number | ""
    ferritin: number | ""
    b12: number | ""
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [data, setData] = useState<OnboardingData>({
    role: "",
    nutriProtocol: "",
    age: "",
    sex: "",
    height: "",
    weight: "",
    activityLevel: "",
    city: "",
    phone: "",
    goals: [],
    dietType: "",
    allergies: [],
    labs: { glucose: "", hba1c: "", hdl: "", ldl: "", triglycerides: "", vitaminD: "", ferritin: "", b12: "" },
  })
  const [saving, setSaving] = useState(false)

  // Recognise the existing account on mount: if onboarding is already done, skip
  // straight to the destination. If the role is already set on the profile (from
  // signup or a prior partial run), pre-fill it and skip the role-picker step.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/auth/login?next=/onboarding')
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return

        if (profile?.onboarding_completed) {
          router.replace(profile.role === 'nutricionista' ? '/nutri' : '/dashboard')
          return
        }

        if (profile?.role === 'nutricionista') {
          // They picked nutri at signup — jump straight to the protocol step.
          setData((prev) => ({ ...prev, role: 'nutricionista' }))
          setCurrentStep(1)
        } else if (profile?.role === 'user') {
          setData((prev) => ({ ...prev, role: 'user' }))
          setCurrentStep(1)
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => { cancelled = true }
  }, [router, supabase])

  // Step 0 = role picker (only when role isn't set on the profile yet)
  // Nutri flow:    step 0 → step 1 (protocol) → save
  // Client flow:   step 0 → steps 1..4 (perfil → objetivos → alimentação → exames) → save
  const isNutri = data.role === "nutricionista"
  const totalSteps = isNutri ? 1 : 4
  const progress = currentStep === 0 ? 0 : (currentStep / totalSteps) * 100

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      setSaving(true)
      try {
        const res = await fetch("/api/user/complete-onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = typeof payload?.error === "string" ? payload.error : "Não foi possível salvar. Tente novamente."
          toast.error(msg)
          return
        }
        if (isNutri) {
          toast.success("Painel do nutricionista pronto.")
          router.push("/nutri")
          router.refresh()
        } else {
          // Fire-and-forget: trigger AI goal personalization in background.
          // The user lands on /dashboard while Sonnet 4.6 generates goals (~10s).
          // Dashboard polls or refreshes once it's ready.
          void triggerPersonalizedGoals()
          router.push("/dashboard")
          router.refresh()
        }
      } catch {
        toast.error("Erro de rede. Verifique sua conexão e tente novamente.")
      } finally {
        setSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const pickRole = (role: Role) => {
    setData((prev) => ({ ...prev, role }))
    // Auto-advance after a tiny delay so the user sees the selection
    setTimeout(() => setCurrentStep(1), 150)
  }

  const triggerPersonalizedGoals = async () => {
    try {
      // No await on outer caller — fire and forget. AbortController guards against hung sockets.
      await callEdgeFunction("ai-personalize-goals", {})
    } catch (err) {
      // Silent — dashboard works fine with Mifflin-St Jeor fallback if AI didn't run
      console.warn("personalize-goals failed silently:", err)
    }
  }

  const toggleGoal = (goal: string) =>
    setData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }))

  const toggleAllergy = (allergy: string) =>
    setData((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }))

  const canProceed = () => {
    if (currentStep === 0) return Boolean(data.role)
    if (isNutri) {
      // Nutri only has one step: protocol paragraph (min 60 chars)
      return data.nutriProtocol.trim().length >= 60
    }
    switch (currentStep) {
      case 1: return data.age && data.sex && data.height && data.weight && data.activityLevel
      case 2: return data.goals.length > 0
      case 3: return data.dietType
      case 4: return true
      default: return false
    }
  }

  const stepTitles = isNutri
    ? ["Protocolo"]
    : ["Perfil", "Objetivos", "Alimentação", "Exames"]

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 page-enter">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-primary font-sans tracking-tight">Salus</h1>
          </div>
          <p className="text-muted-foreground font-body">
            {currentStep === 0
              ? "Como você vai usar o Salus?"
              : isNutri
                ? "Configure seu painel de atendimento"
                : "Vamos personalizar sua jornada nutricional"}
          </p>
        </div>

        {/* Progress (hidden on role-picker step) */}
        {currentStep > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{stepTitles[currentStep - 1]}</span>
              <span className="text-sm text-muted-foreground font-body">Passo {currentStep} de {totalSteps}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between mt-2">
              {stepTitles.map((title, i) => (
                <span key={i} className={`text-[10px] font-medium ${i + 1 <= currentStep ? "text-primary" : "text-muted-foreground/50"}`}>
                  {title}
                </span>
              ))}
            </div>
          </div>
        )}

        <Card className="shadow-md border-border">
          <CardContent className="pt-6">

            {/* STEP 0 — Role picker */}
            {currentStep === 0 && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <CardTitle className="text-2xl mb-1">Conta de cliente ou nutricionista?</CardTitle>
                  <CardDescription className="font-body">
                    Você pode mudar isso depois entrando em contato com o suporte.
                  </CardDescription>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => pickRole("user")}
                    className={`group flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                      data.role === "user"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">Sou cliente</div>
                      <p className="text-sm text-muted-foreground font-body mt-0.5">
                        Quero acompanhar minha nutrição, receber análises por foto e planos personalizados.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => pickRole("nutricionista")}
                    className={`group flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                      data.role === "nutricionista"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">Sou nutricionista</div>
                      <p className="text-sm text-muted-foreground font-body mt-0.5">
                        Atendo clientes e quero usar a Salus pra acompanhar refeições, exames e planos
                        deles em um painel único.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1 (NUTRI) — Protocolo */}
            {isNutri && currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <CardTitle className="text-2xl mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Seu protocolo de atendimento
                  </CardTitle>
                  <CardDescription className="font-body">
                    Em 1 parágrafo, descreva como você atende seus clientes — abordagem, exames que pede,
                    estilo de plano alimentar, frequência de check-in. Esse texto guia a IA da Salus
                    quando ela responde por você no painel.
                  </CardDescription>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protocol">Protocolo</Label>
                  <Textarea
                    id="protocol"
                    placeholder="Ex.: Trabalho com nutrição funcional focada em saúde intestinal e equilíbrio hormonal. Solicito exames bioquímicos completos no início e a cada 3 meses. Planos alimentares são baseados em alimentos integrais, com flexibilidade prática para o dia a dia. Faço check-in semanal por mensagem e consulta presencial mensal..."
                    value={data.nutriProtocol}
                    onChange={(e) => setData({ ...data, nutriProtocol: e.target.value.slice(0, 4000) })}
                    rows={10}
                    className="font-body resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
                    <span>{data.nutriProtocol.trim().length < 60
                      ? `Mínimo 60 caracteres (${data.nutriProtocol.trim().length}/60)`
                      : "✓ Suficiente"}
                    </span>
                    <span>{data.nutriProtocol.length}/4000</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                  <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground font-body leading-relaxed">
                    <p className="font-semibold text-foreground mb-1">O que vem a seguir</p>
                    Ao concluir, você cai no <b>painel do nutricionista</b>. Lá você convida clientes
                    por e-mail, vê as refeições, exames e progresso de cada um, e usa a IA pra rascunhar
                    planos alimentares baseados no seu protocolo.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1 — Perfil */}
            {!isNutri && currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <CardTitle className="text-2xl mb-1">Seu perfil</CardTitle>
                  <CardDescription className="font-body">Nos ajude a entender seu ponto de partida</CardDescription>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Idade</Label>
                    <Input id="age" type="number" placeholder="30" value={data.age}
                      onChange={(e) => setData({ ...data, age: e.target.value ? parseInt(e.target.value) : "" })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" type="text" placeholder="São Paulo" value={data.city}
                      onChange={(e) => setData({ ...data, city: e.target.value })} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Celular (opcional)</Label>
                  <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="mb-3 block">Sexo biológico</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "male" as Sex, icon: User, label: "Masculino" },
                      { value: "female" as Sex, icon: UserCircle, label: "Feminino" },
                      { value: "non-binary" as Sex, icon: Minus, label: "Não-binário" },
                      { value: "prefer-not-to-say" as Sex, icon: Minus, label: "Prefiro não dizer" },
                    ].map(({ value, icon: Icon, label }) => (
                      <Button key={value} type="button" variant={data.sex === value ? "default" : "outline"}
                        className="h-auto py-3 flex flex-col items-center gap-2"
                        onClick={() => setData({ ...data, sex: value })}>
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input id="height" type="number" placeholder="170" value={data.height}
                      onChange={(e) => setData({ ...data, height: e.target.value ? parseInt(e.target.value) : "" })} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input id="weight" type="number" placeholder="70" value={data.weight}
                      onChange={(e) => setData({ ...data, weight: e.target.value ? parseInt(e.target.value) : "" })} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Nível de atividade</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "sedentary" as ActivityLevel, icon: Armchair, label: "Sedentário" },
                      { value: "moderate" as ActivityLevel, icon: Footprints, label: "Moderado" },
                      { value: "active" as ActivityLevel, icon: Bike, label: "Ativo" },
                      { value: "athlete" as ActivityLevel, icon: Dumbbell, label: "Atleta" },
                    ].map(({ value, icon: Icon, label }) => (
                      <Button key={value} type="button" variant={data.activityLevel === value ? "default" : "outline"}
                        className="h-auto py-4 flex flex-col items-center gap-2"
                        onClick={() => setData({ ...data, activityLevel: value })}>
                        <Icon className="w-6 h-6" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Objetivos */}
            {!isNutri && currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <CardTitle className="text-2xl mb-1">Seus objetivos</CardTitle>
                  <CardDescription className="font-body">Selecione todos que se aplicam</CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: "lose-weight", icon: Target, label: "Perder peso" },
                    { value: "build-muscle", icon: Dumbbell, label: "Ganhar massa" },
                    { value: "more-energy", icon: Zap, label: "Mais energia" },
                    { value: "blood-sugar", icon: Droplet, label: "Controle do açúcar no sangue" },
                    { value: "sleep", icon: Moon, label: "Melhorar o sono" },
                    { value: "longevity", icon: Clock, label: "Longevidade" },
                    { value: "performance", icon: TrendingUp, label: "Performance esportiva" },
                    { value: "heart-health", icon: Heart, label: "Saúde cardiovascular" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button key={value} type="button"
                      className={`px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 text-sm font-medium ${
                        data.goals.includes(value)
                          ? "bg-primary/10 text-primary border-primary"
                          : "bg-white text-muted-foreground border-border hover:border-primary/30"
                      }`}
                      onClick={() => toggleGoal(value)}>
                      <Icon className="w-4 h-4" />
                      {label}
                      {data.goals.includes(value) && <CheckCircle className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 — Dieta */}
            {!isNutri && currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <CardTitle className="text-2xl mb-1">Alimentação</CardTitle>
                  <CardDescription className="font-body">Como você se alimenta?</CardDescription>
                </div>
                <div>
                  <Label className="mb-3 block">Tipo de dieta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "omnivore" as DietType, label: "Onívoro" },
                      { value: "vegetarian" as DietType, label: "Vegetariano" },
                      { value: "vegan" as DietType, label: "Vegano" },
                      { value: "pescatarian" as DietType, label: "Pescetariano" },
                      { value: "keto" as DietType, label: "Low-carb/Keto" },
                      { value: "paleo" as DietType, label: "Paleo" },
                    ].map(({ value, label }) => (
                      <Button key={value} type="button" variant={data.dietType === value ? "default" : "outline"}
                        className="h-12" onClick={() => setData({ ...data, dietType: value })}>
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Alergias e intolerâncias (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "gluten", icon: Wheat, label: "Glúten" },
                      { value: "dairy", icon: Milk, label: "Lactose" },
                      { value: "seafood", icon: Fish, label: "Frutos do mar" },
                      { value: "nuts", icon: Apple, label: "Oleaginosas" },
                      { value: "soy", icon: Apple, label: "Soja" },
                      { value: "eggs", icon: Egg, label: "Ovos" },
                    ].map(({ value, icon: Icon, label }) => (
                      <Badge key={value} variant={data.allergies.includes(value) ? "default" : "outline"}
                        className="px-3 py-2 cursor-pointer text-sm hover:bg-primary/10 transition-colors"
                        onClick={() => toggleAllergy(value)}>
                        <Icon className="w-4 h-4 mr-1.5" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — Exames */}
            {!isNutri && currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <CardTitle className="text-2xl mb-1">Seus exames</CardTitle>
                  <CardDescription className="font-body">Opcional — seus resultados personalizam ainda mais o seu score</CardDescription>
                </div>
                <div className="space-y-4">
                  {[
                    { key: "glucose", label: "Glicose em jejum (mg/dL)", tooltip: "Mede o açúcar no sangue em jejum" },
                    { key: "hba1c", label: "HbA1c (%)", tooltip: "Média do açúcar nos últimos 2-3 meses" },
                    { key: "hdl", label: "HDL (mg/dL)", tooltip: "Colesterol bom" },
                    { key: "ldl", label: "LDL (mg/dL)", tooltip: "Colesterol ruim" },
                    { key: "triglycerides", label: "Triglicérides (mg/dL)", tooltip: "Gorduras no sangue" },
                    { key: "vitaminD", label: "Vitamina D (ng/mL)", tooltip: "Níveis de vitamina D" },
                    { key: "ferritin", label: "Ferritina (ng/mL)", tooltip: "Reserva de ferro" },
                    { key: "b12", label: "Vitamina B12 (pg/mL)", tooltip: "Vitamina B12" },
                  ].map(({ key, label, tooltip }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Label htmlFor={key} className="font-body">{label}</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent><p className="text-sm font-body">{tooltip}</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <Input id={key} type="number" step="0.1" placeholder="Opcional"
                          value={data.labs[key as keyof typeof data.labs]}
                          onChange={(e) => setData({ ...data, labs: { ...data.labs, [key]: e.target.value ? parseFloat(e.target.value) : "" } })} />
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground font-body" onClick={handleNext}>
                  Pular por enquanto
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0} className="gap-2 font-body">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canProceed() || saving} className="gap-2 min-w-32 font-semibold">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
            ) : (
              <>{currentStep === totalSteps ? "Concluir" : "Continuar"}<ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
