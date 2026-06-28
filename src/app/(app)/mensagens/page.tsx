import { redirect } from "next/navigation"

// Mensagens com a nutri agora vive como uma aba dentro do Coach.
export default function MensagensPage() {
  redirect("/coach?tab=nutri")
}
