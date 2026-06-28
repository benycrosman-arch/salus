"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SalusMark } from "@/components/brand/logo"
import { ChevronDown, ArrowRight, Sparkles, MessageCircle, Eye, TrendingUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FadeUp,
  StaggerContainer,
  StaggerItem,
  TextReveal,
  BlurIn,
  GradientOrb,
  MagneticHover,
} from "@/lib/motion"

// Beta-phase founder-led sales. Replace with Calendly / Tally form when ready.
const BETA_MAILTO =
  "mailto:suporte@nulllabs.org?subject=Convite%20Beta%20Salus%20para%20nutricionistas&body=Oi!%20Sou%20%5Bnome%5D%2C%20CRN%20%5BNN-NNNNN%5D%2C%20de%20%5Bcidade%5D.%0A%0AVi%20o%20Salus%20e%20queria%20entender%20como%20funciona%20o%20painel%20do%20nutri.%0A%0A%5Bbreve%20contexto%20da%20minha%20pr%C3%A1tica%5D"

const PROMISE = [
  {
    title: "Não substitui você.",
    body:
      "Você define o protocolo. A IA cuida da rotina. O paciente sente seu cuidado todo dia — mesmo nos dias em que ele não te procura.",
    icon: Eye,
    color: "#1a3a2a",
  },
  {
    title: "Mais próximo.",
    body:
      "Cada refeição registrada aparece pra você. Sem perguntar. Sem aquela conversa de \"como foi a semana?\" no começo de toda consulta.",
    icon: MessageCircle,
    color: "#c4614a",
  },
  {
    title: "Escalável.",
    body:
      "Mesma profundidade de cuidado, mais pacientes na agenda. Você multiplica presença sem virar plantão 24/7.",
    icon: TrendingUp,
    color: "#4a7c4a",
  },
]

const FEATURES = [
  {
    n: "01",
    tag: "Para o paciente",
    title: "Foto, não planilha.",
    body:
      "Ele fotografa o prato. A IA do Salus identifica alimentos, estima porções, calcula macros, fibras e impacto glicêmico. 3 segundos. Sem digitar nada.",
    bg: "bg-[#1a3a2a]",
    text: "text-white",
  },
  {
    n: "02",
    tag: "Para você",
    title: "Seu painel, o feed real.",
    body:
      "Abre o painel da paciente e vê o que ela comeu hoje, esta semana, este mês. Aderência ao protocolo, padrões que ela não conta porque nem percebe.",
    bg: "bg-white",
    text: "text-[#1a3a2a]",
  },
  {
    n: "03",
    tag: "Chat dedicado",
    title: "Mensagem sem misturar com a sua vida.",
    body:
      "Chat dentro do Salus, com histórico e contexto. Sem trocar WhatsApp pessoal. Você responde quando faz sentido — não quando o celular vibra.",
    bg: "bg-[#c4614a]",
    text: "text-white",
  },
  {
    n: "04",
    tag: "Engajamento automático",
    title: "Lembretes que parecem você.",
    body:
      "Nudges via WhatsApp gerados pela IA, calibrados pelo protocolo que você definiu. O paciente sente que está sendo cuidado. Você não digita um lembrete sequer.",
    bg: "bg-white",
    text: "text-[#1a3a2a]",
  },
]

const COMPARISON = [
  { row: "Saber o que o paciente comeu", before: "\"Lembra mais ou menos?\"", after: "Feed em tempo real" },
  { row: "Medir aderência ao plano", before: "Adivinhação na próxima consulta", after: "Métrica visível agora" },
  { row: "Acompanhamento entre sessões", before: "WhatsApp pessoal misturado com vida", after: "App dedicado, opt-in" },
  { row: "Escala da prática", before: "Mais paciente = menos profundidade", after: "Mesma profundidade, mais paciente" },
  { row: "Percepção de valor", before: "Cliente esquece o plano em 3 dias", after: "Cliente vê o plano funcionar todo dia" },
]

const TESTIMONIALS = [
  {
    quote:
      "Uso com meus pacientes. A adesão aumentou 3× porque eles veem o impacto em tempo real — e eu chego na consulta sabendo o que conversar.",
    name: "Dra. Laura P.",
    role: "Nutricionista clínica · CRN-3",
    placeholder: false,
  },
  {
    quote: "[PLACEHOLDER — substituir por depoimento real de nutri beta]",
    name: "[Nome, CRN]",
    role: "[Especialidade · Cidade]",
    placeholder: true,
  },
  {
    quote: "[PLACEHOLDER — substituir por depoimento real de nutri beta]",
    name: "[Nome, CRN]",
    role: "[Especialidade · Cidade]",
    placeholder: true,
  },
]

const FAQS = [
  {
    q: "Vai substituir o nutricionista?",
    a: "Não. Esse é o ponto inteiro do Salus. A IA cuida da rotina chata — contar macro, lembrar de tomar água, registrar refeição. Quem define protocolo, interpreta exame e segura a mão do paciente continua sendo você. O app só te dá olhos entre as consultas pra que cada sessão sua valha mais.",
  },
  {
    q: "Como o paciente entra no meu painel?",
    a: "Você gera um convite no Salus e envia (link ou QR). Em 30 segundos o paciente está no app, vinculado a você. A partir daí, cada refeição que ele registra aparece no seu painel — em tempo real.",
  },
  {
    q: "E LGPD? Dados sensíveis de saúde?",
    a: "Criptografia em repouso e em trânsito, infra na América do Sul (Supabase/AWS São Paulo), conformidade com LGPD. O paciente pode exportar ou deletar tudo a qualquer momento. Salus nunca vende dados. O vínculo paciente↔nutri só existe se ambos consentirem explicitamente.",
  },
  {
    q: "Funciona se o paciente já usa outro app de calorias?",
    a: "Funciona. Mas o paciente vai sentir que o Salus é diferente — ele sabe que você está do outro lado. A diferença entre logar pra si mesmo e logar pra alguém que vai ler é o que muda a aderência.",
  },
  {
    q: "Quanto custa para mim?",
    a: "Nada para entrar no beta. Estamos co-desenvolvendo o pricing com os primeiros nutris. A ideia é que faça sentido tanto pra quem atende 10 quanto pra quem atende 100 pacientes/mês.",
  },
]

export default function NutriLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
                className="flex items-center justify-center"
              >
                <SalusMark size={32} priority />
              </motion.div>
              <span className="font-serif text-xl text-[#1a3a2a] italic">Salus</span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-widest uppercase text-[#c4614a] border border-[#c4614a]/30 rounded-full px-2 py-0.5 ml-1">
                Para nutris
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                { href: "#promessa", label: "Promessa" },
                { href: "#como-funciona", label: "Como funciona" },
                { href: "#comparacao", label: "Salus vs hoje" },
                { href: "/paciente", label: "Para pacientes" },
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                <LanguageSwitcher />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <Link href="/auth/login?role=user">
                  <Button
                    variant="outline"
                    className="h-9 rounded-full border-[#1a3a2a]/20 bg-white px-4 text-sm font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5 hover:border-[#1a3a2a]/40 transition-all"
                  >
                    Sou paciente
                  </Button>
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
              >
                <Link href="/nutri">
                  <Button className="h-9 rounded-full bg-[#1a3a2a] px-5 text-sm font-semibold text-white hover:bg-[#1a3a2a]/90 transition-all">
                    Entrar
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <GradientOrb color="rgba(26,58,42,0.07)" size={600} className="top-0 -right-40" />
        <GradientOrb color="rgba(196,97,74,0.06)" size={500} className="bottom-0 -left-40" />

        <div className="mx-auto max-w-6xl px-5 sm:px-8 relative z-10">
          <BlurIn delay={0.2}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c4614a]/20 bg-[#c4614a]/5 px-4 py-1.5">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[#c4614a]"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-semibold tracking-widest uppercase text-[#c4614a]">
                Beta por indicação · Para nutricionistas
              </span>
            </div>
          </BlurIn>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight text-[#1a3a2a] max-w-4xl">
            <TextReveal text="Acompanhe o paciente" delay={0.3} />
            <br />
            <span className="inline-block">
              <TextReveal text="entre as consultas" delay={0.55} className="italic text-[#c4614a]" />
            </span>
            <br />
            <TextReveal text="— sem virar 24/7." delay={0.8} />
          </h1>

          <FadeUp delay={1.0}>
            <p className="mt-8 max-w-2xl text-lg sm:text-xl text-[#1a3a2a]/65 leading-relaxed">
              Salus é o app que seu paciente usa todos os dias.
              Foto do prato → IA analisa → você vê adesão, padrão real
              e os pontos exatos pra próxima conversa.
              <strong className="text-[#1a3a2a] block mt-3 not-italic font-medium">
                Não substitui você. Multiplica sua presença.
              </strong>
            </p>
          </FadeUp>

          <FadeUp delay={1.2}>
            <div className="flex flex-col sm:flex-row gap-3 mt-10">
              <a href={BETA_MAILTO}>
                <MagneticHover>
                  <Button className="h-14 gap-2 rounded-full bg-[#1a3a2a] px-10 text-base font-semibold text-white shadow-lg hover:bg-[#1a3a2a]/90 transition-all">
                    Pedir convite Beta
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </Button>
                </MagneticHover>
              </a>
              <a href="#como-funciona">
                <Button variant="outline" className="h-14 rounded-full border-[#1a3a2a]/20 px-10 text-base font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition-all">
                  Ver como funciona
                </Button>
              </a>
            </div>
          </FadeUp>

          <FadeUp delay={1.4}>
            <p className="mt-8 text-sm text-[#1a3a2a]/50 max-w-xl leading-relaxed">
              Estamos convidando por indicação na fase atual.
              Conversa de 15 min com o fundador, sem demo gravada,
              sem compromisso. Se fizer sentido, você entra no beta.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── PROMESSA (anti-objection triple) ─────────────── */}
      <section id="promessa" className="relative border-y border-[#e4ddd4]/60 bg-white/60 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp className="mb-14 max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">A promessa</p>
            <h2 className="font-serif text-3xl sm:text-4xl italic leading-tight text-[#1a3a2a]">
              Três coisas que o Salus faz pelo seu consultório.
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-5 md:grid-cols-3" staggerDelay={0.12}>
            {PROMISE.map(({ title, body, icon: Icon, color }, i) => (
              <StaggerItem key={i}>
                <div className="h-full rounded-3xl bg-[#faf8f4] p-8 ring-1 ring-black/[0.04] hover:ring-[#1a3a2a]/15 transition-all">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${color}12`, color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-2xl italic text-[#1a3a2a] mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#1a3a2a]/65">{body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── O PROBLEMA (narrative) ──────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <FadeUp>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">O problema</p>
            <h2 className="font-serif text-3xl sm:text-4xl italic leading-tight text-[#1a3a2a]">
              A consulta termina às 11h.
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-[#1a3a2a]/70">
              <p>
                O paciente sai motivado. Compra os ingredientes. Faz a semana toda direito.
              </p>
              <p>
                Na sexta tem aniversário no escritório. No sábado o churrasco do compadre.
                Domingo é dia de pizza. Segunda começa de novo — meio.
              </p>
              <p>
                E você? Descobre tudo isso — talvez — daqui a 30 dias.
                Na consulta que começa, sempre, do mesmo lugar:
                <em className="text-[#c4614a] not-italic font-medium"> &ldquo;como foi a semana?&rdquo;</em>
              </p>
              <p className="pt-3 font-serif italic text-2xl text-[#1a3a2a]">
                O Salus muda esse começo.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── COMO FUNCIONA ───────────────────────────────── */}
      <section id="como-funciona" className="relative py-24 sm:py-32 bg-[#f0ebe3]/60">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp className="mb-16 max-w-xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Como funciona</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              <TextReveal text="Quatro passos. Zero planilha." />
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-5 sm:grid-cols-2" staggerDelay={0.1}>
            {FEATURES.map(({ n, tag, title, body, bg, text }, i) => (
              <StaggerItem key={i}>
                <MagneticHover>
                  <div className={`rounded-3xl p-8 ${bg} ring-1 ring-black/[0.04] h-full group cursor-default`}>
                    <div className="flex items-start justify-between mb-5">
                      <span
                        className={`text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full ${
                          text.includes("white") ? "bg-white/15 text-white/80" : "bg-[#1a3a2a]/8 text-[#1a3a2a]/70"
                        }`}
                      >
                        {tag}
                      </span>
                      <motion.span
                        className={`font-serif italic text-5xl leading-none ${text} opacity-15`}
                        whileHover={{ opacity: 0.35, scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                      >
                        {n}
                      </motion.span>
                    </div>
                    <h3 className={`text-xl font-serif italic ${text} mb-3`}>{title}</h3>
                    <p className={`text-sm leading-relaxed ${text} opacity-75`}>{body}</p>
                  </div>
                </MagneticHover>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── COMPARISON ──────────────────────────────────── */}
      <section id="comparacao" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <FadeUp className="mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Hoje vs com Salus</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              O que muda na sua rotina.
            </h2>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="rounded-3xl bg-white ring-1 ring-black/[0.05] overflow-hidden">
              {/* header */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-[#e4ddd4]">
                <div className="px-6 py-4 text-xs font-semibold tracking-widest uppercase text-[#1a3a2a]/50">
                  Dimensão
                </div>
                <div className="px-6 py-4 text-xs font-semibold tracking-widest uppercase text-[#1a3a2a]/50 border-l border-[#e4ddd4]">
                  Hoje
                </div>
                <div className="px-6 py-4 text-xs font-semibold tracking-widest uppercase text-[#c4614a] border-l border-[#e4ddd4] bg-[#c4614a]/5">
                  Com Salus
                </div>
              </div>
              {COMPARISON.map(({ row, before, after }, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1.2fr_1fr_1fr] ${
                    i < COMPARISON.length - 1 ? "border-b border-[#e4ddd4]/70" : ""
                  }`}
                >
                  <div className="px-6 py-5 text-sm font-medium text-[#1a3a2a]">{row}</div>
                  <div className="px-6 py-5 text-sm text-[#1a3a2a]/55 border-l border-[#e4ddd4]/70 italic">
                    {before}
                  </div>
                  <div className="px-6 py-5 text-sm text-[#1a3a2a] border-l border-[#e4ddd4]/70 bg-[#c4614a]/[0.03] font-medium">
                    {after}
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── RETENÇÃO + PERCEPÇÃO DE VALOR ──────────────── */}
      <section className="relative py-24 sm:py-32 bg-[#1a3a2a] overflow-hidden">
        <GradientOrb color="rgba(196,97,74,0.12)" size={500} className="top-0 right-0" />
        <GradientOrb color="rgba(74,124,74,0.1)" size={400} className="bottom-0 left-0" />

        <div className="mx-auto max-w-5xl px-5 sm:px-8 relative z-10">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Retenção</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-white max-w-3xl mx-auto">
              Paciente que <span className="text-[#c4614a]">vê</span> o cuidado, volta.
            </h2>
            <p className="mt-6 text-white/65 max-w-xl mx-auto leading-relaxed">
              A maior dor da nutri independente não é conseguir paciente.
              É o paciente sumir depois da terceira consulta.
              O Salus dá motivo concreto pra ele voltar.
            </p>
          </FadeUp>

          <StaggerContainer className="grid gap-6 md:grid-cols-3 mt-12" staggerDelay={0.12}>
            {[
              {
                k: "Percepção de valor",
                v: "Ele sente seu cuidado",
                d: "todo dia, não só na sessão",
              },
              {
                k: "Aderência",
                v: "Padrão visível",
                d: "pra você e pra ele",
              },
              {
                k: "Conversa de consulta",
                v: "Começa em outro lugar",
                d: "não em \"como foi a semana?\"",
              },
            ].map(({ k, v, d }, i) => (
              <StaggerItem key={i}>
                <div className="rounded-3xl bg-white/[0.06] p-7 ring-1 ring-white/10 h-full">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#c4614a] mb-3">{k}</p>
                  <p className="font-serif text-2xl italic text-white">{v}</p>
                  <p className="text-sm text-white/55 mt-2">{d}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── TESTEMUNHOS ─────────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp className="mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Da nossa rede</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a] max-w-2xl">
              Nutris que já usam o Salus com pacientes.
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-6 md:grid-cols-3" staggerDelay={0.15}>
            {TESTIMONIALS.map(({ quote, name, role, placeholder }, i) => (
              <StaggerItem key={i}>
                <div
                  className={`rounded-3xl bg-white p-8 ring-1 ring-black/[0.04] shadow-sm h-full ${
                    placeholder ? "opacity-50 border-2 border-dashed border-[#1a3a2a]/15" : ""
                  }`}
                >
                  <p className="text-base text-[#1a3a2a]/80 leading-relaxed mb-6 font-serif italic">
                    &ldquo;{quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-5 border-t border-[#e4ddd4]/60">
                    <div className="w-10 h-10 rounded-full bg-[#1a3a2a]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#1a3a2a]">
                        {placeholder ? "?" : name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1a3a2a]">{name}</p>
                      <p className="text-xs text-[#1a3a2a]/60 mt-0.5">{role}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── PRICING TEASER ──────────────────────────────── */}
      <section className="relative py-24 sm:py-32 bg-[#f0ebe3]">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <FadeUp>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">Pricing</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              No beta, é de graça.
            </h2>
            <p className="mt-6 text-[#1a3a2a]/65 max-w-xl mx-auto leading-relaxed text-lg">
              Estamos definindo o modelo com os nutris que entram agora.
              A ideia é que faça sentido tanto pra quem atende 10 quanto
              pra quem atende 100 pacientes por mês.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <a href={BETA_MAILTO}>
                <MagneticHover>
                  <Button className="h-13 rounded-full bg-[#1a3a2a] px-8 font-semibold text-white hover:bg-[#1a3a2a]/90">
                    Pedir convite Beta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </MagneticHover>
              </a>
              <a href={BETA_MAILTO}>
                <Button variant="outline" className="h-13 rounded-full border-[#1a3a2a]/20 px-8 font-semibold text-[#1a3a2a] hover:bg-[#1a3a2a]/5">
                  Falar com o fundador
                </Button>
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#c4614a] mb-4">FAQ</p>
            <h2 className="font-serif text-4xl sm:text-5xl italic leading-tight text-[#1a3a2a]">
              Perguntas que toda nutri faz.
            </h2>
          </FadeUp>

          <div className="divide-y divide-[#e4ddd4]">
            {FAQS.map(({ q, a }, i) => (
              <FadeUp key={i} delay={i * 0.05}>
                <div>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
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
                        <div className="pb-5 text-sm text-[#1a3a2a]/65 leading-relaxed">{a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 bg-[#1a3a2a] overflow-hidden">
        <GradientOrb color="rgba(196,97,74,0.14)" size={500} className="top-0 right-0" />
        <GradientOrb color="rgba(74,124,74,0.1)" size={400} className="bottom-0 left-0" />

        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center relative z-10">
          <BlurIn>
            <h2 className="font-serif text-4xl sm:text-6xl italic leading-tight text-white">
              Quer ver o painel funcionando?
            </h2>
          </BlurIn>
          <FadeUp delay={0.2}>
            <p className="mt-6 text-white/70 text-lg max-w-xl mx-auto leading-relaxed">
              15 minutos, por chamada de vídeo. Sem demo gravada.
              Você fala da sua prática, eu te mostro o painel.
              Se fizer sentido, você entra no beta na hora.
            </p>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <a href={BETA_MAILTO}>
                <MagneticHover strength={0.4}>
                  <Button className="h-14 rounded-full bg-white px-10 text-base font-semibold text-[#1a3a2a] hover:bg-white/90 transition-all">
                    Pedir convite Beta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </MagneticHover>
              </a>
            </div>
            <p className="mt-5 text-xs text-white/55">
              <Sparkles className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              Indicação faz diferença — diga quem te indicou no e-mail.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-[#e4ddd4]/60 bg-[#faf8f4] py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeUp>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <Link href="/" className="flex items-center gap-2.5">
                <SalusMark size={28} />
                <span className="font-serif text-lg italic text-[#1a3a2a]">Salus</span>
              </Link>
              <div className="flex flex-wrap gap-6 text-xs text-[#1a3a2a]/60 justify-center">
                <Link href="/paciente" className="hover:text-[#1a3a2a] transition-colors">Para pacientes</Link>
                <Link href="/auth/login" className="hover:text-[#1a3a2a] transition-colors">Sou paciente · Entrar</Link>
                <Link href="/privacidade" className="hover:text-[#1a3a2a] transition-colors">Privacidade</Link>
                <Link href="/termos" className="hover:text-[#1a3a2a] transition-colors">Termos</Link>
                <a href="mailto:suporte@nulllabs.org" className="hover:text-[#1a3a2a] transition-colors">Suporte</a>
              </div>
              <p className="text-xs text-[#1a3a2a]/60">
                &copy; {new Date().getFullYear()} Salus · NullLabs
              </p>
            </div>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-[#1a3a2a]/55 max-w-2xl mx-auto">
              Salus é uma ferramenta de apoio à prática nutricional. Não substitui
              avaliação, prescrição ou acompanhamento profissional. Análises de IA
              são estimativas educacionais.
            </p>
          </FadeUp>
        </div>
      </footer>
    </div>
  )
}
