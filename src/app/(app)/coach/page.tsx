"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Bot, Stethoscope } from "@/components/icons"
import { cn } from "@/lib/utils"
import { CoachChat } from "./coach-chat"
import { NutriChat } from "./nutri-chat"

type CoachTab = "ai" | "nutri"

function CoachPageInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<CoachTab>(
    searchParams.get("tab") === "nutri" ? "nutri" : "ai",
  )

  const tabs: { key: CoachTab; label: string; icon: typeof Bot }[] = [
    { key: "ai", label: "Coach IA", icon: Bot },
    { key: "nutri", label: "Nutricionista", icon: Stethoscope },
  ]

  return (
    <div className="page-enter space-y-4">
      <div className="inline-flex items-center gap-1 rounded-2xl bg-[#1a3a2a]/[0.05] p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === key
                ? "bg-white text-[#1a3a2a] shadow-sm"
                : "text-[#1a3a2a]/50 hover:text-[#1a3a2a]",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "ai" ? <CoachChat /> : <NutriChat />}
    </div>
  )
}

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1a3a2a]" /></div>}>
      <CoachPageInner />
    </Suspense>
  )
}
