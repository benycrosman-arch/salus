"use client"

import { useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import * as Icons from "@/components/icons"
import { SearchField } from "@/components/ui/search-field"
import { SalusLogo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

// Living reference for the Salus "Duotone Organic" icon system.
// Public on purpose so design + the team can audit every glyph in one place.

const GROUPS: { label: string; names: string[] }[] = [
  {
    label: "Navegação",
    names: ["Home", "LayoutDashboard", "Bot", "Camera", "Sparkles", "BarChart3", "User", "UserCircle", "Users", "Settings"],
  },
  {
    label: "Nutrição & alimentos",
    names: ["Apple", "Leaf", "Egg", "Fish", "Milk", "Wheat", "Utensils", "UtensilsCrossed", "Flame", "Droplet", "ShoppingCart", "Store"],
  },
  {
    label: "Saúde & bem-estar",
    names: ["Heart", "Activity", "Stethoscope", "Scale", "Beaker", "FlaskConical", "Dumbbell", "Bike", "Footprints", "Moon", "Zap", "Target"],
  },
  {
    label: "Insights & conteúdo",
    names: ["Lightbulb", "BookOpen", "Wand2", "Star", "Crown", "Flag", "TrendingUp", "TrendingDown", "History", "Image"],
  },
  {
    label: "Comunicação",
    names: ["MessageCircle", "Send", "Mail", "Phone", "Smartphone", "Bell", "Globe", "Search"],
  },
  {
    label: "Documentos & ações",
    names: ["FileText", "FileCheck2", "StickyNote", "IdCard", "CreditCard", "Calendar", "CalendarDays", "Clock", "Copy", "Paperclip", "Pencil", "Save", "Upload", "Download", "Trash2", "RefreshCw", "RotateCcw", "Undo2"],
  },
  {
    label: "Segurança",
    names: ["Lock", "KeyRound", "Shield", "ShieldCheck", "ShieldAlert", "Eye", "EyeOff", "Unlink", "LogOut"],
  },
  {
    label: "Estado & direção",
    names: ["Check", "CheckCircle", "X", "Plus", "Minus", "MinusCircle", "Circle", "AlertCircle", "AlertTriangle", "Info", "HelpCircle", "Loader2", "ChevronRight", "ChevronDown", "ChevronUp", "ArrowRight", "ArrowLeft", "Armchair"],
  },
]

const BACKGROUNDS = [
  { id: "cream", label: "Creme", panel: "bg-[#faf8f4]", tile: "bg-white ring-1 ring-[#e4ddd4]", ink: "text-[#1a3a2a]" },
  { id: "forest", label: "Floresta", panel: "bg-[#1a3a2a]", tile: "bg-white/[0.04] ring-1 ring-white/10", ink: "text-[#faf8f4]" },
  { id: "terra", label: "Terracota", panel: "bg-[#c4614a]", tile: "bg-white/10 ring-1 ring-white/20", ink: "text-white" },
] as const

export default function IconesPage() {
  const [query, setQuery] = useState("")
  const [bg, setBg] = useState<(typeof BACKGROUNDS)[number]>(BACKGROUNDS[0])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GROUPS.map((g) => ({
      ...g,
      names: q ? g.names.filter((n) => n.toLowerCase().includes(q)) : g.names,
    })).filter((g) => g.names.length > 0)
  }, [query])

  const total = GROUPS.reduce((n, g) => n + g.names.length, 0)

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1a3a2a]">
      <header className="sticky top-0 z-10 border-b border-[#e4ddd4]/60 bg-[#faf8f4]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <SalusLogo size={30} wordClassName="text-xl" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1a3a2a]/45">
              Sistema de ícones · Duotone Orgânico · {total} glifos
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[#1a3a2a]/[0.05] p-1">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBg(b)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                  bg.id === b.id ? "bg-[#1a3a2a] text-white shadow-sm" : "text-[#1a3a2a]/55 hover:text-[#1a3a2a]"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-8 max-w-md">
          <SearchField value={query} onValueChange={setQuery} placeholder="Buscar ícone… (ex: leaf, heart, shield)" />
        </div>

        <div className={cn("rounded-3xl p-5 transition-colors duration-300 sm:p-8", bg.panel)}>
          {filtered.length === 0 ? (
            <p className={cn("py-16 text-center text-sm", bg.ink, "opacity-60")}>
              Nenhum ícone encontrado para “{query}”.
            </p>
          ) : (
            <div className="space-y-10">
              {filtered.map((group) => (
                <section key={group.label}>
                  <h2 className={cn("mb-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-55", bg.ink)}>
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                    {group.names.map((name) => {
                      const Icon = (Icons as unknown as Record<string, LucideIcon>)[name]
                      if (!Icon) return null
                      return (
                        <div
                          key={name}
                          className={cn(
                            "group flex aspect-square flex-col items-center justify-center gap-2.5 rounded-2xl p-3 transition-all duration-200 hover:scale-[1.04]",
                            bg.tile,
                            bg.ink
                          )}
                        >
                          <Icon className="h-7 w-7 transition-transform duration-200 group-hover:scale-110" />
                          <span className="truncate text-[10px] font-medium opacity-60">{name}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#1a3a2a]/40">
          Cada glifo é desenhado à mão: contorno em <span className="font-medium text-[#1a3a2a]/60">currentColor</span> sobre um corpo suave —
          por isso “preenche” sozinho quando a cor do texto fica sólida (ex: item ativo do menu).
        </p>
      </main>
    </div>
  )
}
