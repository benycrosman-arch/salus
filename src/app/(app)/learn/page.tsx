"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookOpen, ArrowRight } from "lucide-react"

export default function LearnPage() {
  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="border-0 shadow-md max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-sans text-foreground">Aprender</h1>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Em breve, conteúdo curto e prático sobre nutrição em português — fibras, glicemia,
            diversidade de plantas, sono e performance. Tudo escrito pra ler em menos de 5 minutos.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2 rounded-xl">
          <Link href="/dashboard">
            Voltar ao dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </Card>
    </div>
  )
}
