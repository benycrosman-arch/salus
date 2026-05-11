import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Gate de verificação CRN removido — rota legada redireciona para o painel.
export default function AwaitingVerificationPage() {
  redirect("/nutri")
}
