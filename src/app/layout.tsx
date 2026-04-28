import type { Metadata } from "next"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import { Suspense } from "react"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import "./globals.css"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Providers } from "@/components/providers"
import { PostHogPageview } from "@/components/posthog-pageview"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "Salus — Nutrição de Precisão",
  description: "Foto vira ciência. IA nutricional 24/7, planos personalizados e lista de compras em um toque.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const htmlLang = locale === 'pt' ? 'pt-BR' : 'en'

  return (
    <html lang={htmlLang} className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body className="font-body antialiased min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </Providers>
        </NextIntlClientProvider>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  )
}
