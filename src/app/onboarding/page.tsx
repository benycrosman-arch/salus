"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  Activity,
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
} from "lucide-react"

type Sex = "male" | "female" | "non-binary" | "prefer-not-to-say"
type ActivityLevel = "sedentary" | "moderate" | "active" | "athlete"
type DietType = "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "paleo"

interface OnboardingData {
  age: number | ""
  sex: Sex | ""
  height: number | ""
  weight: number | ""
  activityLevel: ActivityLevel | ""
  city: string
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
  gutHealth: {
    bowelRegularity: number
    bloatingFrequency: number
    energyAfterMeals: number
    antibioticHistory: boolean
    fermentedFoodConsumption: number
    plantDiversity: number
    digestiveComfort: number
    stoolConsistency: number
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    age: "",
    sex: "",
    height: "",
    weight: "",
    activityLevel: "",
    city: "",
    goals: [],
    dietType: "",
    allergies: [],
    labs: { glucose: "", hba1c: "", hdl: "", ldl: "", triglycerides: "", vitaminD: "", ferritin: "", b12: "" },
    gutHealth: {
      bowelRegularity: 3,
      bloatingFrequency: 3,
      energyAfterMeals: 3,
      antibioticHistory: false,
      fermentedFoodConsumption: 3,
      plantDiversity: 3,
      digestiveComfort: 3,
      stoolConsistency: 3,
    },
  })
  const [showGutScore, setShowGutScore] = useState(false)

  const totalSteps = 5
  const progress = (currentStep / totalSteps) * 100

  const getGutScore = () => {
    const { gutHealth } = data
    const antibioticValue = gutHealth.antibioticHistory ? 2 : 4
    return Math.round(
      ((gutHealth.bowelRegularity + gutHealth.bloatingFrequency + gutHealth.energyAfterMeals +
        antibioticValue + gutHealth.fermentedFoodConsumption + gutHealth.plantDiversity +
        gutHealth.digestiveComfort + gutHealth.stoolConsistency) / 40) * 100
    )
  }

  const getGutDescription = (score: number) => {
    if (score >= 80) return "Excelente — seu intestino está em ótima forma!"
    if (score >= 60) return "Bom — há espaço para melhorias"
    if (score >= 40) return "Regular — vamos trabalhar na sua saúde intestinal"
    return "Precisa de atenção — vamos reconstruir seu microbioma"
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowGutScore(true)
      setTimeout(() => router.push("/dashboard"), 3000)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
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
    switch (currentStep) {
      case 1: return data.age && data.sex && data.height && data.weight && data.activityLevel
      case 2: return data.goals.length > 0
      case 3: return data.dietType
      case 4: case 5: return true
      default: return false
    }
  }

  const stepTitles = [
    "Perfil",
    "Objetivos",
    "Alimentação",
    "Exames",
    "Saúde Intestinal",
  ]

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
          <p className="text-muted-foreground font-body">Vamos personalizar sua jornada nutricional</p>
        </div>

        {/* Progress */}
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

        <Card className="shadow-md border-border">
          <CardContent className="pt-6">

            {/* STEP 1 — Perfil */}
            {currentStep === 1 && (
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
            {currentStep === 2 && (
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
                    { value: "gut-health", icon: Activity, label: "Saúde intestinal" },
                    { value: "blood-sugar", icon: Droplet, label: "Controle glicêmico" },
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
            {currentStep === 3 && (
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
            {currentStep === 4 && (
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

            {/* STEP 5 — Saúde intestinal */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {!showGutScore ? (
                  <>
                    <div>
                      <CardTitle className="text-2xl mb-1">Saúde intestinal</CardTitle>
                      <CardDescription className="font-body">Nos ajude a entender sua linha de base digestiva</CardDescription>
                    </div>
                    <div className="space-y-5">
                      {[
                        { key: "bowelRegularity", label: "Regularidade intestinal", min: "Irregular", max: "Diária" },
                        { key: "bloatingFrequency", label: "Frequência de inchaço abdominal", min: "Diário", max: "Nunca" },
                        { key: "energyAfterMeals", label: "Energia após as refeições", min: "Cansado", max: "Energizado" },
                        { key: "fermentedFoodConsumption", label: "Consumo de alimentos fermentados", min: "Nunca", max: "Diário" },
                        { key: "plantDiversity", label: "Diversidade de plantas por semana", min: "<5", max: ">30" },
                        { key: "digestiveComfort", label: "Conforto digestivo geral", min: "Ruim", max: "Excelente" },
                        { key: "stoolConsistency", label: "Consistência das fezes", min: "Irregular", max: "Ideal" },
                      ].map(({ key, label, min, max }) => (
                        <div key={key}>
                          <Label className="mb-2 block text-sm font-body">{label}</Label>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-14 shrink-0 font-body">{min}</span>
                            <input type="range" min="1" max="5"
                              value={data.gutHealth[key as keyof typeof data.gutHealth] as number}
                              onChange={(e) => setData({ ...data, gutHealth: { ...data.gutHealth, [key]: parseInt(e.target.value) } })}
                              className="flex-1" />
                            <span className="text-xs text-muted-foreground w-14 text-right shrink-0 font-body">{max}</span>
                            <Badge variant="secondary" className="ml-1 w-8 justify-center text-xs">
                              {data.gutHealth[key as keyof typeof data.gutHealth] as number}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <div>
                        <Label className="mb-2 block text-sm font-body">Tomou antibióticos nos últimos 2 anos?</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Button type="button" variant={data.gutHealth.antibioticHistory ? "default" : "outline"}
                            onClick={() => setData({ ...data, gutHealth: { ...data.gutHealth, antibioticHistory: true } })}>
                            Sim
                          </Button>
                          <Button type="button" variant={!data.gutHealth.antibioticHistory ? "default" : "outline"}
                            onClick={() => setData({ ...data, gutHealth: { ...data.gutHealth, antibioticHistory: false } })}>
                            Não
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 animate-in fade-in duration-500">
                    <div className="mb-6">
                      <Activity className="w-16 h-16 text-primary mx-auto mb-4" />
                      <CardTitle className="text-2xl mb-2">Sua Saúde Intestinal Inicial</CardTitle>
                    </div>
                    <div className="text-6xl font-bold text-primary mb-2 font-sans">{getGutScore()}</div>
                    <div className="text-sm text-muted-foreground font-body">/100</div>
                    <p className="text-base text-muted-foreground mt-3 font-body">{getGutDescription(getGutScore())}</p>
                    <p className="text-sm text-muted-foreground mt-8 font-body">Redirecionando para o seu painel...</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {!showGutScore && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1} className="gap-2 font-body">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 min-w-32 font-semibold">
              {currentStep === totalSteps ? "Concluir" : "Continuar"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
