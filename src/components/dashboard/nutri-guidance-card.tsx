import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { Sparkles, FileText, Download } from "lucide-react"

interface RecRow {
  body: string
}
interface AttRow {
  id: string
  storage_path: string
  original_filename: string | null
  byte_size: number | null
  page_count: number | null
  kind: string
  created_at: string
}

const KIND_LABELS: Record<string, string> = {
  meal_plan: "Plano alimentar",
  training: "Treino",
  exam_guidance: "Orientação de exame",
  other: "Material",
}

function formatBytes(n: number | null): string {
  if (!n) return ""
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export async function NutriGuidanceCard({ userId }: { userId: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  )

  const [linkRes, recRes, attRes] = await Promise.all([
    supabase
      .from("nutri_patient_links")
      .select("status")
      .eq("patient_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("nutri_recommendations")
      .select("body")
      .eq("patient_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("nutri_patient_attachments")
      .select("id, storage_path, original_filename, byte_size, page_count, kind, created_at")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  if (!linkRes.data) return null
  const rec = recRes.data as RecRow | null
  const atts = (attRes.data ?? []) as AttRow[]
  if (!rec?.body && atts.length === 0) return null

  const signed = await Promise.all(
    atts.map((a) =>
      supabase.storage
        .from("nutri-attachments")
        .createSignedUrl(a.storage_path, 300)
        .then((r) => ({ ...a, url: r.data?.signedUrl ?? null })),
    ),
  )

  return (
    <section className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-[#1a3a2a]/[0.04] to-[#4a7c4a]/[0.04] ring-1 ring-[#1a3a2a]/10 p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-[#1a3a2a]/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#1a3a2a]" />
        </div>
        <h2 className="text-sm font-semibold text-[#1a3a2a]">Orientações da sua nutri</h2>
      </div>

      {rec?.body && (
        <p className="text-sm text-[#1a3a2a] font-body whitespace-pre-wrap leading-relaxed">
          {rec.body}
        </p>
      )}

      {signed.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-[#1a3a2a]/10 space-y-2">
          {signed.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#1a3a2a]/50 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#1a3a2a] truncate">
                  {a.original_filename ?? "documento.pdf"}
                </p>
                <p className="text-[11px] text-[#1a3a2a]/50 font-body">
                  {KIND_LABELS[a.kind] ?? "Material"}
                  {a.byte_size ? ` · ${formatBytes(a.byte_size)}` : ""}
                </p>
              </div>
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#1a3a2a] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
