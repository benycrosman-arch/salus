"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Home,
  Camera,
  User,
  BarChart3,
  Sparkles,
  Settings,
  FlaskConical,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LanguageSwitcher } from "@/components/language-switcher"
import { TrialBanner } from "@/components/trial-banner"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const mobileNavItems = [
    { href: "/dashboard", icon: Home, label: t('dashboard') },
    { href: "/log", icon: Camera, label: t('log') },
    { href: "/mensagens", icon: MessageCircle, label: t('messages') },
    { href: "/insights", icon: Sparkles, label: t('insights') },
    { href: "/profile", icon: User, label: t('profile') },
  ]

  const desktopNavItems = [
    { href: "/dashboard", icon: Home, label: t('dashboard') },
    { href: "/log", icon: Camera, label: t('log') },
    { href: "/mensagens", icon: MessageCircle, label: t('messages') },
    { href: "/insights", icon: Sparkles, label: t('insights') },
    { href: "/progress", icon: BarChart3, label: t('progress') },
    { href: "/health-data", icon: FlaskConical, label: t('exams') },
    { href: "/profile", icon: User, label: t('profile') },
    { href: "/settings", icon: Settings, label: t('settings') },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f4]">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 bg-[#faf8f4]/90 backdrop-blur-md border-b border-[#e4ddd4]/60 lg:hidden">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="Salus Logo" width={120} height={32} className="h-7 w-auto object-contain mix-blend-multiply" />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link href="/settings" className="w-8 h-8 flex items-center justify-center rounded-xl text-[#1a3a2a]/60 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition-all">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-[#e4ddd4]/60 bg-[#faf8f4] sticky top-0 h-screen">
          <div className="p-6 pb-8 flex items-start justify-between gap-2">
            <Link href="/dashboard" className="flex flex-col gap-1 group">
              <Image src="/logo.png" alt="Salus Logo" width={140} height={38} className="h-9 w-auto object-contain object-left mix-blend-multiply" />
              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-[#1a3a2a]/50 mt-1">{t('tagline')}</p>
              </div>
            </Link>
            <LanguageSwitcher />
          </div>

          <nav className="flex-1 px-3 space-y-0.5">
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
                      ? "bg-[#1a3a2a] text-white"
                      : "text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[#e4ddd4]/60">
            <div className="rounded-2xl bg-[#1a3a2a]/[0.04] p-4 ring-1 ring-[#1a3a2a]/[0.06]">
              <p className="text-xs font-semibold text-[#1a3a2a] mb-1">{t('upgradeTitle')}</p>
              <p className="text-[11px] text-[#1a3a2a]/50 leading-relaxed">{t('upgradeBody')}</p>
              <Link href="/settings" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#c4614a] hover:underline">
                {t('viewPlans')}
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full pb-24 lg:pb-8 min-h-screen bg-[#faf8f4]">
          <div className="max-w-2xl mx-auto lg:max-w-5xl px-4 sm:px-6 py-6 lg:py-8 space-y-4">
            <TrialBanner />
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#faf8f4]/90 backdrop-blur-md border-t border-[#e4ddd4]/60">
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
                  isActive ? "text-[#1a3a2a]" : "text-[#1a3a2a]/60 hover:text-[#1a3a2a]/60"
                )}
              >
                {isLog ? (
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 shadow-lg transition-all duration-200",
                    isActive
                      ? "bg-[#1a3a2a] text-white scale-105"
                      : "bg-[#1a3a2a]/90 text-white hover:bg-[#1a3a2a]"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                ) : (
                  <>
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                    {isActive && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#1a3a2a]" />}
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
