"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Item = {
  href: string
  icon: string
  label: string
  matches: (pathname: string) => boolean
  badge?: boolean
}

export function NutriBottomNav({ unreadChats = false }: { unreadChats?: boolean }) {
  const pathname = usePathname()

  const items: Item[] = [
    {
      href: "/nutri",
      icon: "group",
      label: "Pacientes",
      matches: (p) => p === "/nutri",
    },
    {
      href: "/nutri/pacientes",
      icon: "person",
      label: "Lista",
      matches: (p) => p.startsWith("/nutri/pacientes"),
    },
    {
      href: "/nutri/protocolo",
      icon: "calendar_month",
      label: "Plano",
      matches: (p) => p.startsWith("/nutri/protocolo"),
    },
    {
      href: "/nutri#copiloto",
      icon: "psychology",
      label: "IA",
      matches: () => false,
    },
    {
      href: "/nutri/config",
      icon: "settings",
      label: "Config",
      matches: (p) => p.startsWith("/nutri/config"),
      badge: unreadChats,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#e4ddd4] flex justify-around items-center z-40">
      {items.map((item) => {
        const active = item.matches(pathname)
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${
              active ? "text-[#1a3a2a]" : "text-[#5e5e5c] hover:text-[#1a3a2a]"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            {item.badge && (
              <span className="absolute top-0 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            )}
            <span
              className={`text-[12px] leading-4 tracking-[0.05em] ${
                active ? "font-bold" : "font-medium"
              }`}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
