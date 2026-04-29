"use client"

import Link from "next/link"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Check, ChevronDown, ArrowRight, Star, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FadeUp,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
  Parallax,
  TextReveal,
  Counter,
  BlurIn,
  GradientOrb,
  MagneticHover,
} from "@/lib/motion"

const faqs = [
  {
    q: "Como a IA analisa minha refeição?",
    a: "Você fotografa o prato. Nossa IA identifica cada alimento, estima porções com base em referências visuais e calcula macros, fibras, efeito no açúcar no sangue e score nutricional — tudo em menos de 3 segundos.",
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
    a: "Sim. Durante o onboarding você define seus objetivos e restrições — sem glúten, vegano, low-carb, keto — e a IA adapta todas as análises e recomendações.",
  },
]

const protocols = [
  {
    tag: "Pré-menopausa",
    title: "Nutrição hormonal inteligente",
    desc: "Suporte ao equilíbrio hormonal com foco em compostos vegetais tipo-hormônio, magnésio e ômegas.",
    color: "#c4614a",
  },
  {
    tag: "Quarto Trimestre",
    title: "Recuperação pós-parto",
    desc: "Proteína, ferro e nutrientes do ovo e fígado para recuperação e amamentação.",
    color: "#1a3a2a",
  },
  {
    tag: "Longevidade 40+",
    title: "Comer para envelhecer bem",
    desc: "Resistência à insulina, bactérias boas do intestino e ossos fortes — tudo monitorado.",
    color: "#4a7c4a",
  },
  {
    tag: "Atleta Plant-Based",
    title: "Performance sem carne",
    desc: "Proteína completa, creatina e B12 para quem treina sem animal.",
    color: "#c8a538",
  },
]

const testimonials = [
  {
    quote: "Parei de contar calorias manualmente. Fotografo, vejo o score, ajusto. Simples assim.",
    name: "Marina K.",
    role: "Designer, 34 anos",
  },
  {
    quote: "Finalmente entendi o que estava atrapalhando meu sono. Era o café da tarde que subia demais meu açúcar no sangue.",
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
  const t = useTranslations('landing')
  const tPricing = useTranslations('landing.plans')
  const tp = useTranslations('pricing')

  return (
    <div className="grain-overlay min-h-screen bg-[#faf8f4] text-[#1a3a2a] overflow-hidden">
      {/* ── NAV ─────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#faf8f4]/90 backdrop-blur-md border-b border-[#e4ddd4]/60"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-8 h-8 rounded-lg bg-[#1a3a2a] flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                  <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                </svg>
              </motion.div>
              <span className="font-serif text-xl text-[#1a3a2a] italic">Salus</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                { href: "#como-funciona", label: t('nav.howItWorks') },
                { href: "#protocolos", label: t('nav.protocols') },
                { href: "#planos", label: t('nav.plans') },
              ].map(({ href, label }, i) => (
                <motion.a
                  key={href}
                  href={href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  className="text-sm font-medium text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors"
                >
                  {label}
                </motion.a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                <LanguageSwitcher />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Link href="/auth/login" className="text-sm font-medium text-[#1a3a2a]/60 hover:text-[#1a3a2a] transition-colors hidden sm:block">
                  {t('nav.signIn')}
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
              >
                <Link href="/auth/signup">
                  <Button className="h-9 rounded-full bg-[#1a3a2a] px-5 text-sm font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all">
                    {t('nav.cta')}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO WITH CONTAINER SCROLL ─────────────────── */}
      <section className="relative overflow-hidden">
        {/* ── TOP AURORA ANIMATION ──────────────────────── */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[600px] pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(196,97,74,0.11) 0%, rgba(200,165,56,0.05) 45%, transparent 80%)",
            }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              top: "-120px",
              left: "8%",
              width: "550px",
              height: "550px",
              background: "radial-gradient(circle, rgba(26,58,42,0.09) 0%, transparent 70%)",
              filter: "blur(90px)",
            }}
            animate={{ x: [0, 70, -40, 0], y: [0, 35, 20, 0], scale: [1, 1.08, 0.96, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              top: "-80px",
              right: "8%",
              width: "450px",
              height: "450px",
              background: "radial-gradient(circle, rgba(200,165,56,0.08) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
            animate={{ x: [0, -55, 30, 0], y: [0, 45, -25, 0], scale: [1, 0.93, 1.07, 1] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              top: "200px",
              left: "30%",
              width: "380px",
              height: "380px",
              background: "radial-gradient(circle, rgba(196,97,74,0.05) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, 40, -30, 0], y: [0, -30, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 9 }}
          />
        </motion.div>

        <GradientOrb color="rgba(196,97,74,0.08)" size={600} className="top-20 -right-40" />
        <GradientOrb color="rgba(26,58,42,0.06)" size={500} className="bottom-20 -left-40" />
        <GradientOrb color="rgba(200,165,56,0.05)" size={350} className="top-1/2 left-1/3" />

        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center pt-20">
              <BlurIn delay={0.2}>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c4614a]/20 bg-[#c4614a]/5 px-4 py-1.5">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#c4614a]"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#c4614a]">IA Nutricional</span>
                </div>
              </BlurIn>

              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.92] tracking-tight text-[#1a3a2a] max-w-5xl">
                <TextReveal text="Coma com inteligência." delay={0.3} />
                <br />
                <span className="inline-block">
                  <TextReveal text="Sinta a diferença" delay={0.6} className="italic text-[#c4614a]" />
                </span>
                <br />
                <TextReveal text="em dias." delay={0.9} />
              </h1>

              <FadeUp delay={1.1}>
                <p className="mt-8 max-w-xl text-lg sm:text-xl text-[#1a3a2a]/60 leading-relaxed text-center">
                  Fotografe o prato. A IA analisa, pontua e sugere. O ciclo mais curto entre saber e comer bem.
                </p>
              </FadeUp>

              <FadeUp delay={1.3}>
                <div className="flex flex-col sm:flex-row gap-3 mt-10">
                  <Link href="/auth/signup">
                    <MagneticHover>
                      <Button className="h-14 gap-2 rounded-full bg-[#1a3a2a] px-10 text-base font-semibold text-white shadow-lg hover:bg-[#1a3a2a]/90 transition-all">
                        {t('hero.primaryCta')}
                        <motion.span
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.span>
                      </Button>
                    </MagneticHover>
                  </Link>
                  <a href="#como-funciona">
                    <Button variant="outline" className="h-14 rounded-full border-[#1a3a2a]/20 px-10 text-base font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition-all">
                      Ver como funciona
                    </Button>
                  </a>
                </div>
              </FadeUp>

              <FadeUp delay={1.5}>
                <div className="mt-10 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["#1a3a2a", "#c4614a", "#4a7c4a", "#c8a538", "#5c7a94"].map((bg, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.6 + i * 0.08, type: "spring", stiffness: 300 }}
                        className="w-8 h-8 rounded-full ring-2 ring-[#faf8f4] flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: bg }}
                      >
                        {["MK", "AR", "LP", "SR", "TC"][i]}
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#1a3a2a]/50">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 2 + i * 0.06, type: "spring" }}
                        >
                          <Star className="w-3.5 h-3.5 fill-[#c4614a] text-[#c4614a]" />
                        </motion.span>
                      ))}
                    </div>
                    <span className="font-medium text-[#1a3a2a]">2.400+</span> pessoas comendo melhor
                  </div>
                </div>
              </FadeUp>
            </div>
          }
        >
          {/* Dashboard mockup inside the 3D scroll card */}
          <div className="h-full w-full p-6 md:p-8 overflow-hidden">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-[#1a3a2a] flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                        <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                      </svg>
                    </div>
                    <span className="font-serif text-lg italic text-[#1a3a2a]">Salus</span>
                  </div>
                  <p className="text-xs text-[#1a3a2a]/60">Seu dia em três números</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[#c4614a]/8 px-3 py-1.5">
                  <span className="text-sm">🔥</span>
                  <span className="text-xs font-semibold text-[#c4614a]">5 dias</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 ring-1 ring-black/[0.04]">
                <div className="flex justify-around items-center">
                  {[
                    { label: "Proteína", val: 78, color: "#1a3a2a" },
                    { label: "Fibras", val: 92, color: "#c4614a" },
                    { label: "Gordura", val: 61, color: "#4a7c4a" },
                  ].map(({ label, val, color }) => {
                    const r = 32
                    const circ = 2 * Math.PI * r
                    const offset = circ - (val / 100) * circ
                    return (
                      <div key={label} className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                            <circle cx="40" cy="40" r={r} fill="none" stroke="#e4ddd4" strokeWidth="6" />
                            <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-[#1a3a2a]">{val}%</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-[#1a3a2a]/50 uppercase tracking-wider">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a2a]/60">Última Refeição</span>
                    <div className="w-8 h-8 rounded-full bg-[#1a3a2a] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">96</span>
                    </div>
                  </div>
                  <p className="text-base font-semibold text-[#1a3a2a]">Salmão + Greens</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1a3a2a]/5 text-[#1a3a2a] font-medium">580 kcal</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#c4614a]/8 text-[#c4614a] font-medium">48g proteína</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#4a7c4a]/8 text-[#4a7c4a] font-medium">Pouco açúcar</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#1a3a2a] p-5 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Próximo bite</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Adicione <strong className="text-white">mirtilos</strong> no próximo snack — baixo índice de antioxidantes hoje.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section className="relative border-y border-[#e4ddd4]/60 bg-white/50 py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <StaggerContainer className="grid grid-cols-2 gap-10 sm:grid-cols-4 text-center" staggerDelay={0.12}>
            {[
              { value: 82, suffix: "%", label: "relatam mais energia em 2 semanas" },
              { value: 3.2, suffix: "×", label: "mais diversidade de plantas", decimals: true },
              { value: 94, suffix: "%", label: "precisão na detecção de alimentos" },
              { value: 3, prefix: "< ", suffix: "s", label: "tempo médio de análise" },
            ].map(({ value, suffix, prefix, label, decimals }, i) => (
              <StaggerItem key={i}>
                <div className="font-serif text-4xl sm:text-5xl italic text-[#1a3a2a]">
                  {prefix}
                  {decimals ? (
                    <Counter target={value} duration={2.5} suffix="" />
                  ) : (
                    <Counter target={value} duration={2} />
                  )}
                  {suffix}
                </div>
                <div className="mt-1.5 text-xs text-[#1a3a2a]/50 leading-snug max-w-[120px] mx-auto">{label}</div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────── */}
      <section id="como-funciona" className="relative py-24 sm:py-32">
        <GradientOrb color="rgba(26,58,42,0.04)" size={400} className="-top-20 right-0" />

        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp className="mb-16 max-w-xl">
            <motion.p
              className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4"
              initial={{ width: 0 }}
              whileInView={{ width: "auto" }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Como funciona
            </motion.p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              <TextReveal text="Da foto ao insight em quatro passos." />
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.1}>
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
                desc: "Fibras, efeito no açúcar no sangue e qualidade nutricional — pontuados de 0 a 100.",
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
              <StaggerItem key={i}>
                <MagneticHover>
                  <div className={`rounded-3xl p-8 ${bg} ring-1 ring-black/[0.04] h-full group cursor-default`}>
                    <motion.span
                      className={`font-serif italic text-6xl leading-none ${text} opacity-20 block`}
                      whileHover={{ opacity: 0.4, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {n}
                    </motion.span>
                    <h3 className={`mt-4 text-lg font-semibold ${text}`}>{title}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${text} opacity-70`}>{desc}</p>
                  </div>
                </MagneticHover>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── PROTOCOLOS ──────────────────────────────────── */}
      <section id="protocolos" className="relative py-24 sm:py-32 bg-[#1a3a2a] overflow-hidden">
        <GradientOrb color="rgba(196,97,74,0.1)" size={500} className="top-0 right-0" />
        <GradientOrb color="rgba(74,124,74,0.08)" size={400} className="bottom-0 left-0" />

        <div className="mx-auto max-w-6xl px-5 sm:px-8 relative z-10">
          <FadeUp className="mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Protocolos</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-white max-w-xl">
              <TextReveal text="Nutrição personalizada para cada fase da vida." className="text-white" />
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-4 sm:grid-cols-2" staggerDelay={0.12}>
            {protocols.map(({ tag, title, desc, color }, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="group rounded-3xl bg-white/[0.06] p-8 ring-1 ring-white/10 cursor-default h-full"
                  whileHover={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    y: -4,
                    transition: { duration: 0.3 },
                  }}
                >
                  <div className="mb-4 inline-flex">
                    <motion.span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: `${color}20`, color }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {tag}
                    </motion.span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── SOCIAL PROOF MARQUEE ─────────────────────────── */}
      <section className="py-8 border-b border-[#e4ddd4]/60 overflow-hidden bg-white/30">
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex gap-8 items-center">
              {[
                "Análise por IA em tempo real",
                "Score nutricional inteligente",
                "Plano semanal personalizado",
                "Lista de compras automática",
                "Protocolos especializados",
                "2.400+ usuários satisfeitos",
                "94% de precisão",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c4614a]" />
                  <span className="text-sm font-medium text-[#1a3a2a]/50">{text}</span>
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── TESTEMUNHOS ─────────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <Parallax speed={0.15} className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <GradientOrb color="rgba(196,97,74,0.04)" size={300} className="top-20 left-20" />
        </Parallax>

        <div className="mx-auto max-w-6xl px-5 sm:px-8 relative z-10">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Testemunhos</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Confiança silenciosa. Todo dia.
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-6 md:grid-cols-3" staggerDelay={0.15}>
            {testimonials.map(({ quote, name, role }, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className="rounded-3xl bg-white p-8 ring-1 ring-black/[0.04] shadow-sm h-full"
                  whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-[#c4614a] text-[#c4614a]" />
                    ))}
                  </div>
                  <p className="text-base text-[#1a3a2a]/80 leading-relaxed mb-6 font-serif italic">
                    &ldquo;{quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a3a2a]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#1a3a2a]">{name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1a3a2a]">{name}</p>
                      <p className="text-xs text-[#1a3a2a]/60 mt-0.5">{role}</p>
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── PLANOS ──────────────────────────────────────── */}
      <section id="planos" className="relative py-24 sm:py-32 bg-[#f0ebe3]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp className="text-center mb-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">{tPricing('kicker')}</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              {tPricing('headline1')}<br />{tPricing('headline2')}
            </h2>
            <p className="mt-4 text-[#1a3a2a]/50 text-sm">{t('plans.subtitle')}</p>
          </FadeUp>

          {/* Three consumer tiers */}
          <div className="mt-14 mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {/* FREE */}
            <ScaleIn delay={0.1}>
              <div className="rounded-3xl bg-white p-8 ring-1 ring-black/[0.05] h-full flex flex-col">
                <p className="text-xs font-semibold tracking-widest uppercase text-[#1a3a2a]/60 mb-1">{tp('free.name')}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-serif text-3xl italic text-[#1a3a2a]">{tp('free.price')}</span>
                  <span className="text-[#1a3a2a]/50 text-sm">{tp('free.period')}</span>
                </div>
                <p className="text-sm text-[#1a3a2a]/50 mt-1">{tp('free.note')}</p>
                <div className="my-6 h-px bg-[#e4ddd4]" />
                <ul className="space-y-3 mb-8 flex-1">
                  {tPricing.raw('free.features').map((text: string, j: number) => (
                    <li key={j} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#1a3a2a]">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-[#1a3a2a]">{text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full h-12 rounded-full border-2 border-[#1a3a2a]/20 font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5">
                    {tPricing('free.cta')}
                  </Button>
                </Link>
              </div>
            </ScaleIn>

            {/* ESSENCIAL */}
            <ScaleIn delay={0.18}>
              <div className="relative rounded-3xl bg-white p-8 ring-1 ring-[#c4614a]/30 shadow-md h-full flex flex-col">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#c4614a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {tp('badges.mostPopular')}
                </span>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-1">{tp('essencial.name')}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-serif text-3xl italic text-[#1a3a2a]">{tp('essencial.price')}</span>
                  <span className="text-[#1a3a2a]/50 text-sm">{tp('essencial.period')}</span>
                </div>
                <p className="text-sm text-[#1a3a2a]/60 mt-1">{tp('essencial.note')}</p>
                <div className="my-6 h-px bg-[#e4ddd4]" />
                <ul className="space-y-3 mb-8 flex-1">
                  {tPricing.raw('essencial.features').map((text: string, j: number) => (
                    <li key={j} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[#c4614a]">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-[#1a3a2a]">{text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <MagneticHover>
                    <Button className="w-full h-12 rounded-full bg-[#c4614a] font-semibold text-white hover:bg-[#c4614a]/90">
                      {tPricing('essencial.cta')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </MagneticHover>
                </Link>
              </div>
            </ScaleIn>

            {/* PRO */}
            <ScaleIn delay={0.26}>
              <div className="relative rounded-3xl bg-[#1a3a2a] p-8 h-full flex flex-col">
                <p className="text-xs font-semibold tracking-widest uppercase text-white/60 mb-1">{tp('pro.name')}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-serif text-3xl italic text-white">{tp('pro.price')}</span>
                  <span className="text-white/50 text-sm">{tp('pro.period')}</span>
                </div>
                <p className="text-sm text-white/50 mt-1">{tp('pro.note')}</p>
                <div className="my-6 h-px bg-white/10" />
                <ul className="space-y-3 mb-8 flex-1">
                  {tPricing.raw('pro.features').map((text: string, j: number) => (
                    <li key={j} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-white/80">{text}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full h-12 rounded-full border-2 border-white/20 bg-transparent font-semibold text-white hover:bg-white/10">
                    {tPricing('pro.cta')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </ScaleIn>
          </div>

          {/* NUTRI COMMISSION ROW — referral channel, not a paid plan */}
          <div className="mt-12 max-w-4xl mx-auto">
            <ScaleIn delay={0.32}>
              <div className="rounded-3xl bg-gradient-to-br from-[#1a3a2a] to-[#0f2519] p-8 sm:p-10 ring-1 ring-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex-1">
                  <span className="inline-block rounded-full bg-[#c8a538]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c8a538] mb-3">
                    {tp('nutri.kicker')}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl italic text-white leading-tight">
                    {tp('nutri.headline')}
                  </h3>
                  <p className="text-sm text-white/70 mt-2 max-w-lg">{tp('nutri.tagline')}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 max-w-md text-xs text-white/60">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c8a538]" />
                      <span>{tp('nutri.bullet1')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c8a538]" />
                      <span>{tp('nutri.bullet2')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c8a538]" />
                      <span>{tp('nutri.bullet3')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#c8a538]" />
                      <span>{tp('nutri.bullet4')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="font-serif text-3xl sm:text-4xl italic text-[#c8a538]">{tp('nutri.commissionLabel')}</p>
                  <p className="text-xs text-white/50 mt-1 max-w-[180px] sm:ml-auto">{tp('nutri.commissionNote')}</p>
                  <Link href="/onboarding-nutri">
                    <Button className="mt-5 h-12 rounded-full bg-[#c8a538] font-semibold text-[#1a3a2a] hover:bg-[#c8a538]/90 px-6">
                      {tPricing('nutri.cta')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </ScaleIn>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">FAQ</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Perguntas frequentes
            </h2>
          </FadeUp>

          <div className="divide-y divide-[#e4ddd4]">
            {faqs.map(({ q, a }, i) => (
              <FadeUp key={i} delay={i * 0.05}>
                <div>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  >
                    <span className="font-medium text-[#1a3a2a] group-hover:text-[#c4614a] transition-colors">{q}</span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ChevronDown className="w-4 h-4 text-[#1a3a2a]/60 flex-shrink-0" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-5 text-sm text-[#1a3a2a]/60 leading-relaxed">
                          {a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────── */}
      <section id="download" className="relative py-24 sm:py-32 bg-[#1a3a2a] overflow-hidden">
        <GradientOrb color="rgba(196,97,74,0.12)" size={500} className="top-0 right-0" />
        <GradientOrb color="rgba(74,124,74,0.1)" size={400} className="bottom-0 left-0" />

        <div className="mx-auto max-w-6xl px-5 sm:px-8 text-center relative z-10">
          <BlurIn>
            <h2 className="font-serif text-4xl sm:text-6xl italic leading-tight text-white max-w-3xl mx-auto">
              {t('bottomCta.title')}
            </h2>
          </BlurIn>
          <FadeUp delay={0.2}>
            <p className="mt-6 text-white/60 text-lg max-w-md mx-auto">
              {t('bottomCta.subtitle')}
            </p>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <Link href="/auth/signup">
                <MagneticHover strength={0.4}>
                  <Button className="h-14 rounded-full bg-white px-10 text-base font-semibold text-[#1a3a2a] hover:bg-white/90 transition-all">
                    {t('bottomCta.button')}
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </motion.span>
                  </Button>
                </MagneticHover>
              </Link>
            </div>
          </FadeUp>

          {/* App store badges */}
          <FadeUp delay={0.6}>
            <div className="mt-14 pt-10 border-t border-white/10">
              <p className="text-xs font-semibold tracking-widest uppercase text-white/60 mb-5">
                Baixe o app
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="#"
                  aria-label="Baixar na App Store"
                  className="inline-flex items-center gap-3 rounded-xl bg-black border border-white/10 px-5 py-3 text-white hover:bg-black/80 transition-colors"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] leading-tight opacity-70">Baixar na</div>
                    <div className="text-base leading-tight font-semibold">App Store</div>
                  </div>
                </a>
                <a
                  href="#"
                  aria-label="Disponível no Google Play"
                  className="inline-flex items-center gap-3 rounded-xl bg-black border border-white/10 px-5 py-3 text-white hover:bg-black/80 transition-colors"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path fill="#00d4ff" d="M3.6 20.9V3.1c0-.4.2-.7.4-.9l10.3 9.8-10.3 9.8c-.3-.2-.4-.5-.4-.9z" />
                    <path fill="#ffce00" d="M17.6 15.6l-3.2-3L17.6 9l4.1 2.3c.9.5.9 1.8 0 2.3l-4.1 2z" />
                    <path fill="#ff3a44" d="M14.4 12.6l3.2 3-13 7.3 9.8-10.3z" />
                    <path fill="#00f076" d="M14.4 12.6L4.6 2.3l13 7.3-3.2 3z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] leading-tight opacity-70">Disponível no</div>
                    <div className="text-base leading-tight font-semibold">Google Play</div>
                  </div>
                </a>
              </div>
              <p className="mt-4 text-xs text-white/60">
                Assinaturas pagas via Apple ID e Google Play.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-[#e4ddd4]/60 bg-[#faf8f4] py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp>
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
              <div className="flex gap-6 text-xs text-[#1a3a2a]/60">
                <Link href="/privacidade" className="hover:text-[#1a3a2a] transition-colors">Privacidade</Link>
                <Link href="/termos" className="hover:text-[#1a3a2a] transition-colors">Termos</Link>
                <a href="mailto:suporte@nulllabs.org" className="hover:text-[#1a3a2a] transition-colors">Suporte</a>
              </div>
              <p className="text-xs text-[#1a3a2a]/60">
                &copy; {new Date().getFullYear()} Salus. Todos os direitos reservados.
              </p>
            </div>

            {/* AI + health disclaimer */}
            <p className="mt-8 text-center text-[11px] leading-relaxed text-[#1a3a2a]/60 max-w-2xl mx-auto">
              A Salus usa IA para análise nutricional. Estimativas e recomendações são aproximações
              educacionais e <b>não substituem aconselhamento médico, nutricional ou diagnóstico
              profissional</b>. Consulte um profissional de saúde antes de mudanças significativas
              na sua dieta.
            </p>
          </FadeUp>
        </div>
      </footer>
    </div>
  )
}
