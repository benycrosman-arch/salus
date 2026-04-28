"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Button
      variant="destructive"
      className="justify-start rounded-xl bg-red-500/90 text-white hover:bg-red-500"
      onClick={handleSignOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sair da conta
    </Button>
  )
}
