import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Etapa removida — nutri vai direto pro painel após signup.
// Rota mantida pra não dar 404 em links/bookmarks antigos.
export default function NutriOnboardingPage() {
  redirect("/nutri")
}
