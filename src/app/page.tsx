"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown, ArrowRight, Star } from "lucide-react"

// ─── FAQ DATA ───────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "Como a IA analisa minha refeição?",
    a: "Você fotografa o prato. Nossa IA identifica cada alimento, estima porções com base em referências visuais e calcula macros, fibras, impacto glicêmico e score nutricional — tudo em menos de 3 segundos.",
  },
  {
    q: "Precisa de equipamento especial?",
    a: "Não. Basta a câmera do seu celular. A Salus funciona com qualquer smartphone iOS ou Android.",
  },
  {
    q: "Os dados são seguros?",
    a: "Sim. Seus dados são criptografados e nunca são vendidos. Você pode exportar ou deletar tudo a qualquer momento.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Cancele online a qualquer momento, sem burocracia e sem multa.",
  },
  {
    q: "A Salus funciona para dietas específicas?",
    a: "Sim. Durante o onboarding você define seus objetivos e restrições — sem glúten, vegano, low-carb, cetogênica — e a IA adapta todas as análises e recomendações.",
  },
]

// ─── PROTOCOLS ───────────────────────────────────────────────────────────────
const protocols = [
  {
    tag: "Perimenopausa",
    title: "Nutrição hormonal inteligente",
    desc: "Suporte ao equilíbrio hormonal com foco em fitoestrogênios, magnésio e ômegas.",
    color: "#c4614a",
  },
  {
    tag: "Quarto Trimestre",
    title: "Recuperação pós-parto",
    desc: "Proteína, ferro e colina para recuperação e amamentação.",
    color: "#1a3a2a",
  },
  {
    tag: "Longevidade 40+",
    title: "Comer para envelhecer bem",
    desc: "Resistência à insulina, microbioma e densidade óssea — tudo monitorado.",
    color: "#4a7c4a",
  },
  {
    tag: "Atleta Plant-Based",
    title: "Performance sem carne",
    desc: "Proteína completa, creatina e B12 para quem treina sem animal.",
    color: "#c8a538",
  },
]

// ─── TESTIMONIALS ────────────────────────────────────────────────────────────
const testimonials = [
  {
    quote: "Parei de contar calorias manualmente. Fotografo, vejo o score, ajusto. Simples assim.",
    name: "Marina K.",
    role: "Designer, 34 anos",
  },
  {
    quote: "Finalmente entendi o que estava atrapalhando meu sono. Era o café da tarde com alto GI.",
    name: "André S.",
    role: "Engenheiro, 41 anos",
  },
  {
    quote: "Uso com meus pacientes. A adesão aumentou 3x porque eles veem o impacto em tempo real.",
    name: "Dra. Laura P.",
    role: "Nutricionista",
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1a3a2a]">
      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf8f4]/90 backdrop-blur-md border-b border-[#e4ddd4]/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#1a3a2a] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                  <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                </svg>
              </div>
              <span className="font-serif text-xl text-[#1a3a2a] italic">Salus</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#como-funciona" className="text-sm font-medium text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors">Como funciona</a>
              <a href="#protocolos" className="text-sm font-medium text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors">Protocolos</a>
              <a href="#planos" className="text-sm font-medium text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors">Planos</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="text-sm font-medium text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors hidden sm:block">
                Entrar
              </Link>
              <Link href="/auth/signup">
                <Button className="h-9 rounded-full bg-[#1a3a2a] px-5 text-sm font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all">
                  14 dias grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32 overflow-hidden">
        {/* Soft background blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#c4614a]/[0.05] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#1a3a2a]/[0.04] blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c4614a]/20 bg-[#c4614a]/5 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c4614a] animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase text-[#c4614a]">IA Nutricional</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.92] tracking-tight text-[#1a3a2a] max-w-5xl">
              Coma com inteligência.{" "}
              <em className="italic text-[#c4614a]">Sinta a diferença</em>
              {" "}em dias.
            </h1>

            <p className="mt-8 max-w-xl text-lg sm:text-xl text-[#1a3a2a]/60 leading-relaxed">
              Fotografe o prato. A IA analisa, pontua e sugere. O ciclo mais curto entre saber e comer bem.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-10">
              <Link href="/auth/signup">
                <Button className="h-14 gap-2 rounded-full bg-[#1a3a2a] px-10 text-base font-semibold text-white shadow-lg hover:bg-[#1a3a2a]/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Começar grátis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button variant="outline" className="h-14 rounded-full border-[#1a3a2a]/20 px-10 text-base font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition-all">
                  Ver como funciona
                </Button>
              </a>
            </div>

            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#1a3a2a", "#c4614a", "#4a7c4a", "#c8a538", "#5c7a94"].map((bg, i) => (
                  <div key={i} className="w-8 h-8 rounded-full ring-2 ring-[#faf8f4] flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: bg }}>
                    {["MK", "AR", "LP", "SR", "TC"][i]}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-sm text-[#1a3a2a]/50">
                <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#c4614a] text-[#c4614a]" />)}</div>
                <span className="font-medium text-[#1a3a2a]">2.400+</span> pessoas comendo melhor
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="mt-20 flex justify-center">
            <div className="relative w-full max-w-[340px]">
              {/* Phone frame */}
              <div className="rounded-[3rem] bg-[#1a3a2a] p-3 shadow-2xl ring-1 ring-[#1a3a2a]">
                <div className="rounded-[2.4rem] bg-[#faf8f4] overflow-hidden">
                  {/* Status bar */}
                  <div className="h-10 bg-[#1a3a2a] flex items-center justify-center">
                    <div className="w-24 h-5 rounded-full bg-black" />
                  </div>

                  {/* App content */}
                  <div className="p-5 space-y-4">
                    <div className="text-center">
                      <p className="text-[9px] font-semibold tracking-widest uppercase text-[#1a3a2a]/40">Seu dia em três números</p>
                    </div>

                    {/* Three macro circles */}
                    <div className="flex justify-around items-center">
                      {[
                        { label: "Proteína", val: 78, color: "#1a3a2a", max: 100 },
                        { label: "Fibras", val: 92, color: "#c4614a", max: 100 },
                        { label: "Gordura", val: 61, color: "#4a7c4a", max: 100 },
                      ].map(({ label, val, color, max }) => {
                        const r = 26
                        const circ = 2 * Math.PI * r
                        const offset = circ - (val / max) * circ
                        return (
                          <div key={label} className="flex flex-col items-center gap-1.5">
                            <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                              <circle cx="32" cy="32" r={r} fill="none" stroke="#e4ddd4" strokeWidth="5" />
                              <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                            </svg>
                            <div className="absolute flex flex-col items-center" style={{ marginTop: "6px" }}>
                            </div>
                            <span className="text-[9px] font-semibold text-[#1a3a2a]/50 uppercase tracking-wider">{label}</span>
                            <span className="text-sm font-bold text-[#1a3a2a] -mt-1">{val}%</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Meal card */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/40">Última Refeição</span>
                        <div className="w-7 h-7 rounded-full bg-[#1a3a2a] flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white">96</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#1a3a2a]">Salmão + Greens</p>
                      <div className="flex gap-1.5 mt-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#1a3a2a]/5 text-[#1a3a2a] font-medium">580 kcal</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#c4614a]/10 text-[#c4614a] font-medium">48g prot</span>
                      </div>
                    </div>

                    {/* Next bite suggestion */}
                    <div className="rounded-xl bg-[#c4614a]/8 border border-[#c4614a]/15 p-3 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#c4614a] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[8px] text-white font-bold">IA</span>
                      </div>
                      <p className="text-[10px] text-[#1a3a2a]/70 leading-relaxed">
                        Adicione <strong className="text-[#1a3a2a]">mirtilos</strong> no próximo snack — você está com baixo índice de antioxidantes hoje.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -right-6 top-28 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/[0.06] animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#c4614a]/10 flex items-center justify-center">
                    <span className="text-sm">🎯</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-[#1a3a2a]/40">Score de hoje</p>
                    <p className="text-sm font-bold text-[#1a3a2a]">96 · Excelente</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section className="border-y border-[#e4ddd4]/60 bg-white/50 py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 text-center">
            {[
              { value: "82%", label: "relatam mais energia em 2 semanas" },
              { value: "3.2×", label: "mais diversidade de plantas" },
              { value: "94%", label: "precisão na detecção de alimentos" },
              { value: "< 3s", label: "tempo médio de análise" },
            ].map(({ value, label }, i) => (
              <div key={i}>
                <div className="font-serif text-4xl sm:text-5xl italic text-[#1a3a2a]">{value}</div>
                <div className="mt-1.5 text-xs text-[#1a3a2a]/50 leading-snug max-w-[120px] mx-auto">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────── */}
      <section id="como-funciona" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-16 max-w-xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Como funciona</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Da foto ao insight em quatro passos.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                title: "Fotografe",
                desc: "Tire uma foto do prato. A IA detecta cada alimento e estima porções em segundos.",
                bg: "bg-[#1a3a2a]",
                text: "text-white",
              },
              {
                n: "02",
                title: "Receba o score",
                desc: "Fibras, impacto glicêmico e qualidade nutricional — pontuados de 0 a 100.",
                bg: "bg-white",
                text: "text-[#1a3a2a]",
              },
              {
                n: "03",
                title: "IA Nutri 24/7",
                desc: "Nudges personalizados baseados nos seus objetivos, exames e hábitos.",
                bg: "bg-[#c4614a]",
                text: "text-white",
              },
              {
                n: "04",
                title: "Lista de compras",
                desc: "Seu plano vira lista de mercado — enviado para Rappi ou iFood em um toque.",
                bg: "bg-white",
                text: "text-[#1a3a2a]",
              },
            ].map(({ n, title, desc, bg, text }, i) => (
              <div key={i} className={`rounded-3xl p-8 ${bg} ring-1 ring-black/[0.04]`}>
                <span className={`font-serif italic text-6xl leading-none ${text} opacity-20`}>{n}</span>
                <h3 className={`mt-4 text-lg font-semibold ${text}`}>{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${text} opacity-70`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROTOCOLOS ──────────────────────────────────── */}
      <section id="protocolos" className="py-24 sm:py-32 bg-[#1a3a2a]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Protocolos</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-white max-w-xl">
              Nutrição personalizada para cada fase da vida.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {protocols.map(({ tag, title, desc, color }, i) => (
              <div key={i} className="group rounded-3xl bg-white/[0.06] p-8 ring-1 ring-white/10 hover:bg-white/[0.1] transition-all cursor-default">
                <div className="mb-4 inline-flex">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${color}20`, color }}>
                    {tag}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTEMUNHOS ─────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Testemunhos</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Confiança silenciosa. Todo dia.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map(({ quote, name, role }, i) => (
              <div key={i} className="rounded-3xl bg-white p-8 ring-1 ring-black/[0.04] shadow-sm">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#c4614a] text-[#c4614a]" />
                  ))}
                </div>
                <p className="text-base text-[#1a3a2a]/80 leading-relaxed mb-6 font-serif italic">
                  &ldquo;{quote}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-semibold text-[#1a3a2a]">{name}</p>
                  <p className="text-xs text-[#1a3a2a]/40 mt-0.5">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ──────────────────────────────────────── */}
      <section id="planos" className="py-24 sm:py-32 bg-[#f0ebe3]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Planos</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Pague por uma cozinha,<br />não por um rastreador.
            </h2>
            <p className="mt-4 text-[#1a3a2a]/50 text-sm">14 dias grátis. Cancele quando quiser.</p>
          </div>

          <div className="mt-14 mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
            {/* Grátis */}
            <div className="rounded-3xl bg-white p-10 ring-1 ring-black/[0.05]">
              <p className="text-xs font-semibold tracking-widest uppercase text-[#1a3a2a]/40 mb-1">Essencial</p>
              <h3 className="font-serif text-3xl italic text-[#1a3a2a]">Grátis</h3>
              <p className="text-sm text-[#1a3a2a]/50 mt-1">Para começar</p>
              <div className="my-8 h-px bg-[#e4ddd4]" />
              <ul className="space-y-3 mb-10">
                {[
                  ["3 fotos por dia", true],
                  ["Score nutricional básico", true],
                  ["Detecção por IA", true],
                  ["Planos personalizados", false],
                  ["Lista de compras", false],
                  ["Insights avançados", false],
                ].map(([text, active], j) => (
                  <li key={j} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-[#1a3a2a]" : "bg-[#e4ddd4]"}`}>
                      <Check className={`w-3 h-3 ${active ? "text-white" : "text-[#e4ddd4]"}`} />
                    </div>
                    <span className={`text-sm ${active ? "text-[#1a3a2a]" : "text-[#1a3a2a]/30"}`}>{text as string}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button variant="outline" className="w-full h-13 rounded-full border-2 border-[#1a3a2a]/20 font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5 py-4">
                  Começar grátis
                </Button>
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-3xl bg-[#1a3a2a] p-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[#c4614a] px-4 py-1 text-xs font-semibold text-white shadow-md">
                  Mais popular
                </span>
              </div>
              <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-1">Pro</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif text-3xl italic text-white">R$ 59</span>
                <span className="text-white/50 text-sm">/mês</span>
              </div>
              <p className="text-sm text-white/50 mt-1">Tudo que você precisa</p>
              <div className="my-8 h-px bg-white/10" />
              <ul className="space-y-3 mb-10">
                {[
                  "Fotos ilimitadas",
                  "Score nutricional avançado",
                  "Detecção por IA",
                  "Planos personalizados",
                  "Lista de compras automática",
                  "Insights e tendências",
                ].map((item, j) => (
                  <li key={j} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-white/80">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button className="w-full h-13 rounded-full bg-white font-semibold text-[#1a3a2a] hover:bg-white/90 transition-all py-4">
                  Iniciar 14 dias grátis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">FAQ</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Perguntas frequentes
            </h2>
          </div>

          <div className="divide-y divide-[#e4ddd4]">
            {faqs.map(({ q, a }, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left gap-4"
                >
                  <span className="font-medium text-[#1a3a2a]">{q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#1a3a2a]/40 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="pb-5 text-sm text-[#1a3a2a]/60 leading-relaxed">
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-[#1a3a2a]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 text-center">
          <h2 className="font-serif text-4xl sm:text-6xl italic leading-tight text-white max-w-3xl mx-auto">
            Comece a comer com inteligência.{" "}
            <em className="text-[#c4614a]">14 dias grátis.</em>
          </h2>
          <p className="mt-6 text-white/50 text-lg max-w-md mx-auto">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link href="/auth/signup">
              <Button className="h-14 rounded-full bg-white px-10 text-base font-semibold text-[#1a3a2a] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Criar conta grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-[#e4ddd4]/60 bg-[#faf8f4] py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a3a2a] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                  <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                </svg>
              </div>
              <span className="font-serif text-lg italic text-[#1a3a2a]">Salus</span>
            </Link>
            <div className="flex gap-6 text-xs text-[#1a3a2a]/40">
              <a href="#" className="hover:text-[#1a3a2a]/70 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-[#1a3a2a]/70 transition-colors">Termos</a>
              <a href="#" className="hover:text-[#1a3a2a]/70 transition-colors">Suporte</a>
            </div>
            <p className="text-xs text-[#1a3a2a]/30">
              &copy; {new Date().getFullYear()} Salus. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
