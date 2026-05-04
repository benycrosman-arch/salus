"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalendarDays, ArrowRight } from "lucide-react"

export default function PlanPage() {
  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="border-0 shadow-md max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <CalendarDays className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-sans text-foreground">Plano de refeições</h1>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Em breve seu nutricionista vai poder enviar um plano semanal direto pra cá — café, almoço
            e jantar de cada dia, com porções e dicas. Enquanto isso, registre as refeições no botão
            abaixo pra construir seu histórico.
          </p>
        </div>
        <Button asChild className="gap-2 rounded-xl">
          <Link href="/log">
            Registrar uma refeição
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </Card>
    </div>
  )
}
