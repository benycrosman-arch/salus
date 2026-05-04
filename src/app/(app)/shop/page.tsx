"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Store, ArrowRight } from "lucide-react"

export default function ShopPage() {
  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="border-0 shadow-md max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-sans text-foreground">Loja</h1>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Em breve uma curadoria de suplementos baseada nos seus exames e padrões alimentares —
            só o que faz sentido pra você. Por enquanto, foco no básico que move o ponteiro.
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
