import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UserProfile {
  id: string
  email: string
  name: string | null
  role: "user" | "nutricionista" | "admin"
  plan: "free" | "pro" | "nutri_pro"
  onboarding_completed: boolean
  avatar_url: string | null
}

interface UserStore {
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void
  isPro: () => boolean
  isNutri: () => boolean
  isAdmin: () => boolean
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      isPro: () => {
        const plan = get().profile?.plan
        return plan === "pro" || plan === "nutri_pro"
      },
      isNutri: () => get().profile?.role === "nutricionista",
      isAdmin: () => get().profile?.role === "admin",
    }),
    { name: "salus-user" }
  )
)
