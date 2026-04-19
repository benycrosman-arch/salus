import type { Metadata } from "next"
import { DM_Sans, Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Providers } from "@/components/providers"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "Salus — Nutrição de Precisão",
  description: "Foto vira ciência. IA nutricional 24/7, planos personalizados e lista de compras em um toque.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${inter.variable}`}>
      <body className="font-body antialiased min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        <Providers>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
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
