"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  BarChart3,
  ShoppingCart,
  Check,
  ArrowRight,
  Star,
  Sparkles,
  ChevronRight,
  Zap,
  Brain,
  Calendar,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card-strong border-b border-border/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                  <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                </svg>
              </div>
              <span className="font-sans font-bold text-xl text-primary tracking-tight">Salus</span>
            </Link>

            <div className="hidden sm:flex items-center gap-8">
              <a href="#como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Como funciona</a>
              <a href="#recursos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
              <a href="#planos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Entrar
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-full bg-primary px-5 text-sm font-semibold shadow-md hover:bg-primary-hover transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Começar grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-mesh" />
        <div className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-20 -left-32 w-80 h-80 rounded-full bg-accent/[0.04] blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="animate-fade-up mb-8">
              <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide border border-primary/10">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent" />
                Nutrição de precisão com IA
              </Badge>
            </div>

            <h1 className="animate-fade-up font-sans font-bold text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight text-foreground max-w-4xl" style={{ animationDelay: "100ms" }}>
              Nutrição de precisão{" "}
              <span className="text-primary relative inline-block">
                que funciona.
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C50 3 150 2 298 8" stroke="#d97742" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>
            </h1>

            <p className="animate-fade-up mt-8 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed font-body" style={{ animationDelay: "200ms" }}>
              Foto a refeição. Receba seu score nutricional. Peça as compras em um toque.
              A plataforma que fecha o ciclo entre{" "}
              <em className="text-foreground not-italic font-medium">saber</em> e{" "}
              <em className="text-foreground not-italic font-medium">fazer</em>.
            </p>

            <div className="animate-fade-up flex flex-col sm:flex-row gap-4 mt-12" style={{ animationDelay: "300ms" }}>
              <Link href="/auth/signup">
                <Button size="lg" className="h-14 gap-2.5 rounded-full bg-primary px-10 text-base font-semibold shadow-lg transition-all hover:bg-primary-hover hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]">
                  Começar grátis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button variant="outline" size="lg" className="h-14 rounded-full border-2 border-primary/20 px-10 text-base font-semibold text-primary hover:bg-primary/5 transition-all">
                  Ver como funciona
                </Button>
              </a>
            </div>

            <div className="animate-fade-up mt-12 flex items-center gap-3" style={{ animationDelay: "400ms" }}>
              <div className="flex -space-x-2">
                {["bg-primary", "bg-accent", "bg-success", "bg-warning", "bg-info"].map((bg, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${bg} ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white`}>
                    {["AJ", "MK", "SR", "LP", "TC"][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground font-body">
                <span className="font-semibold text-foreground">2.400+</span> pessoas comendo melhor
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="animate-fade-up mt-16 flex justify-center" style={{ animationDelay: "500ms" }}>
            <div className="relative w-full max-w-sm">
              <div className="rounded-[2.5rem] bg-white shadow-lg ring-1 ring-black/5 p-3 mx-auto">
                <div className="rounded-[2rem] bg-gradient-to-b from-background to-muted overflow-hidden">
                  <div className="h-12 flex items-center justify-center">
                    <div className="w-28 h-6 rounded-full bg-black/80" />
                  </div>
                  <div className="px-6 pb-8 pt-4 space-y-5">
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Score de Hoje</p>
                      <div className="relative w-28 h-28">
                        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
                          <circle cx="56" cy="56" r="48" fill="none" stroke="#e6e0d4" strokeWidth="6" opacity="0.5" />
                          <circle cx="56" cy="56" r="48" fill="none" stroke="#4a6b4a" strokeWidth="6" strokeLinecap="round" strokeDasharray="301.6" strokeDashoffset="84" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-sans font-bold text-3xl text-primary">72</span>
                          <span className="text-[9px] font-medium tracking-widest uppercase text-muted-foreground">Bom</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary">Última Refeição</span>
                        <span className="text-[10px] font-bold text-white bg-primary rounded-full px-2 py-0.5">92</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">Bowl de Salmão e Quinoa</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary font-medium">613 kcal</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-primary font-medium">50g proteína</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/5 py-2.5">
                      <span className="text-lg">🔥</span>
                      <span className="text-sm font-semibold text-foreground">Sequência de 5 dias</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 top-24 animate-float rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/5" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">IA Nutricional</p>
                    <p className="text-xs font-semibold text-foreground">+3 tipos de plantas hoje</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-border/60 bg-white/40 backdrop-blur-sm py-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 text-center">
            {[
              { value: "82%", label: "relatam mais energia" },
              { value: "3,2x", label: "mais diversidade vegetal" },
              { value: "94%", label: "precisão na detecção" },
              { value: "< 3s", label: "tempo de análise" },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="font-sans font-bold text-3xl sm:text-4xl text-primary">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground font-body">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">Como Funciona</p>
            <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground leading-tight">
              Quatro passos para<br />comer com precisão
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", icon: Camera, title: "Foto a refeição", description: "Tire uma foto. A IA identifica cada ingrediente e estima porções em segundos.", iconBg: "bg-primary/10", iconColor: "text-primary" },
              { step: "02", icon: BarChart3, title: "Receba seu score", description: "Veja fibras, impacto glicêmico e qualidade nutricional — pontuados de 0 a 100.", iconBg: "bg-accent/10", iconColor: "text-accent" },
              { step: "03", icon: Brain, title: "Nutri IA 24/7", description: "Nudges personalizados baseados nos seus exames, objetivos e hábitos reais.", iconBg: "bg-success/10", iconColor: "text-success" },
              { step: "04", icon: ShoppingCart, title: "Lista de compras", description: "Seu plano vira lista de mercado — enviado para Rappi ou iFood Mercado em um toque.", iconBg: "bg-info/10", iconColor: "text-info" },
            ].map((item, i) => (
              <div key={i} className="group relative rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/[0.04] hover-lift">
                <span className="absolute top-6 right-6 font-sans font-bold text-4xl text-border/50">{item.step}</span>
                <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center mb-5`}>
                  <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-body">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS / DARK SECTION */}
      <section id="recursos" className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#3d5a3d] to-[#2a3d2a]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">
            <div>
              <Badge variant="outline" className="mb-8 rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90">
                O que o ZOE nunca construiu
              </Badge>
              <h2 className="font-sans font-bold text-4xl sm:text-5xl text-white leading-tight mb-6">
                Do plano semanal ao carrinho em segundos
              </h2>
              <p className="text-lg text-white/70 leading-relaxed mb-10 font-body">
                Chega de copiar ingredientes para o bloco de notas. A Salus transforma seu plano alimentar em lista de compras e envia direto para o Rappi ou iFood Mercado.
              </p>
              <ul className="space-y-4">
                {[
                  "Consolidação inteligente de ingredientes entre todas as receitas",
                  "Marque o que já tem em casa — lista recalcula automaticamente",
                  "Exportação em um toque para Rappi, iFood Mercado ou área de transferência",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/80 text-sm leading-relaxed font-body">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-md rounded-3xl bg-white/[0.08] backdrop-blur-xl p-6 ring-1 ring-white/10">
                <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-semibold text-foreground text-base">Lista de Compras</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-body">Do seu plano de 7 dias</p>
                      </div>
                      <Badge className="bg-muted text-primary hover:bg-muted rounded-full px-3 text-xs font-semibold">Pronto</Badge>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { name: "Espinafre orgânico", qty: "2 maços", price: "R$ 8,90" },
                        { name: "Salmão selvagem", qty: "700g", price: "R$ 64,90" },
                        { name: "Quinoa", qty: "1 pacote", price: "R$ 18,90" },
                        { name: "Mirtilos", qty: "2 caixinhas", price: "R$ 22,90" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-background p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-body">{item.qty}</span>
                            <span className="text-xs font-semibold text-primary">{item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-body">Total estimado/semana</span>
                      <span className="font-sans font-bold text-xl text-primary">R$ 312,40</span>
                    </div>
                    <Button className="w-full mt-4 rounded-xl bg-primary h-12 text-sm font-semibold shadow-md hover:bg-primary-hover transition-all">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Enviar para o Rappi
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-4">Planos</p>
            <h2 className="font-sans font-bold text-4xl sm:text-5xl text-foreground leading-tight mb-4">
              Comece grátis, evolua quando quiser
            </h2>
            <p className="text-muted-foreground text-lg font-body">14 dias grátis. Cancele quando quiser.</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            {/* Grátis */}
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/[0.04] hover-lift">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-1">Grátis</h3>
                <p className="text-sm text-muted-foreground font-body">Comece a transformação</p>
              </div>
              <div className="mb-8">
                <span className="font-sans font-bold text-5xl text-foreground">R$ 0</span>
                <span className="text-muted-foreground ml-1 font-body">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  { text: "3 fotos por dia", active: true },
                  { text: "Score nutricional básico", active: true },
                  { text: "Detecção de alimentos por IA", active: true },
                  { text: "Planos alimentares personalizados", active: false },
                  { text: "Lista de compras automática", active: false },
                  { text: "Insights avançados", active: false },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className={`w-4 h-4 flex-shrink-0 ${item.active ? "text-primary" : "text-border"}`} />
                    <span className={`text-sm font-body ${item.active ? "text-foreground" : "text-muted-foreground/50"}`}>{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-semibold">
                  Começar grátis
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-3xl bg-white p-8 shadow-xl ring-2 ring-primary hover-lift">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent px-4 py-1 rounded-full text-white text-xs font-semibold shadow-md">
                  <Star className="w-3 h-3 mr-1 fill-white" />
                  Mais Popular
                </Badge>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-foreground mb-1">Pro</h3>
                <p className="text-sm text-muted-foreground font-body">Tudo que você precisa</p>
              </div>
              <div className="mb-8">
                <span className="font-sans font-bold text-5xl text-primary">R$ 59</span>
                <span className="text-muted-foreground ml-1 font-body">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Fotos ilimitadas",
                  "Score nutricional avançado",
                  "Detecção de alimentos por IA",
                  "Planos alimentares personalizados",
                  "Lista de compras automática",
                  "Insights e tendências avançadas",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-4 h-4 flex-shrink-0 text-primary" />
                    <span className="text-sm font-medium text-foreground font-body">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button className="w-full h-12 rounded-xl bg-primary font-semibold shadow-md hover:bg-primary-hover transition-all gap-2">
                  Iniciar 14 dias grátis
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Nutri Pro callout */}
          <div className="mx-auto max-w-4xl mt-6">
            <div className="rounded-3xl bg-muted/60 p-8 ring-1 ring-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Nutricionista Pro</h3>
                  <p className="text-sm text-muted-foreground font-body mt-0.5">Gerencie pacientes, planos e chat clínico com IA — R$ 149/mês</p>
                </div>
              </div>
              <Link href="/auth/signup?role=nutricionista">
                <Button variant="outline" className="rounded-xl border-2 border-primary/30 text-primary font-semibold hover:bg-primary/5 whitespace-nowrap">
                  Saber mais
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-white/30 py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                  <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                </svg>
              </div>
              <span className="font-sans font-bold text-xl text-primary">Salus</span>
            </Link>
            <p className="text-sm text-muted-foreground text-center max-w-md font-body">
              Nutrição de precisão movida por ciência e IA. Foto, score, compras — a forma mais inteligente de comer.
            </p>
            <div className="flex gap-8 text-xs text-muted-foreground font-body">
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
            </div>
            <p className="text-xs text-muted-foreground/60 font-body">
              &copy; {new Date().getFullYear()} Salus. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
