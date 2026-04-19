"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Camera,
  CalendarDays,
  ShoppingCart,
  User,
  BarChart3,
  Activity,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mobileNavItems = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/log", icon: Camera, label: "Registrar" },
  { href: "/plan", icon: CalendarDays, label: "Plano" },
  { href: "/grocery", icon: ShoppingCart, label: "Compras" },
  { href: "/profile", icon: User, label: "Perfil" },
]

const desktopNavItems = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/log", icon: Camera, label: "Registrar Refeição" },
  { href: "/plan", icon: CalendarDays, label: "Plano Alimentar" },
  { href: "/grocery", icon: ShoppingCart, label: "Lista de Compras" },
  { href: "/progress", icon: BarChart3, label: "Progresso" },
  { href: "/health-data", icon: Activity, label: "Dados de Saúde" },
  { href: "/profile", icon: User, label: "Perfil" },
  { href: "/settings", icon: Settings, label: "Configurações" },
]

const SalusLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
    <path d="M15.8 17a7 7 0 0 1-12.6-3" />
  </svg>
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col grain-overlay">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 glass-card-strong border-b border-border/40 lg:hidden">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <SalusLogo />
            </div>
            <span className="font-sans font-bold text-lg text-primary tracking-tight">Salus</span>
          </Link>
          <Link href="/settings" className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 h-screen">
          <div className="p-6 pb-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1.5 2 2 4.5c.5 2.5 0 4.5-1 6" />
                  <path d="M15.8 17a7 7 0 0 1-12.6-3" />
                </svg>
              </div>
              <div>
                <span className="font-sans font-bold text-xl text-primary leading-none tracking-tight">Salus</span>
                <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mt-0.5">Nutrição de Precisão</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border/60">
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 p-4">
              <p className="text-xs font-semibold text-primary mb-1">Upgrade para Pro</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-body">Desbloqueie planos, lista de compras e insights avançados.</p>
              <Link href="/settings" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                Ver planos
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full pb-24 lg:pb-8">
          <div className="max-w-2xl mx-auto lg:max-w-5xl px-4 sm:px-6 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-card-strong border-t border-border/40">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-[68px] px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            const isLog = item.href === "/log"
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 relative",
                  isLog && "px-4",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isLog ? (
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 shadow-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground scale-105"
                      : "bg-primary/90 text-primary-foreground hover:bg-primary"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                ) : (
                  <>
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                    {isActive && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />}
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
