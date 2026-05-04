"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ShoppingCart, ArrowRight } from "lucide-react"

export default function GroceryPage() {
  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="border-0 shadow-md max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShoppingCart className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-sans text-foreground">Lista de compras</h1>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Em breve a sua lista vai sair direto do seu plano semanal — categorias, quantidades e
            atalho pra fazer o pedido. Por enquanto, a gente foca no essencial: registrar refeições
            e medir progresso.
          </p>
        </div>
        <Button asChild className="gap-2 rounded-xl">
          <Link href="/dashboard">
            Voltar ao dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </Card>
    </div>
  )
}
