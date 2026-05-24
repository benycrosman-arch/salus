"use client"

import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Beaker } from "lucide-react"
import { toast } from "sonner"
import {
  PdfExamUpload,
  type ParsedPdfResult,
} from "@/app/onboarding/pdf-exam-upload"

interface Props {
  patientId: string
}

export function LabsUploader({ patientId }: Props) {
  const router = useRouter()

  const handleParsed = (result: ParsedPdfResult) => {
    if (result.fallback === "manual") {
      // The edge function already toasted; nothing more to do for nutri.
      return
    }
    const total = (result.savedCount ?? 0)
    if (total > 0) {
      toast.success(`Salvei ${total} marcadores no histórico do paciente.`)
      router.refresh()
    }
  }

  return (
    <Card className="border-0 shadow-md p-6">
      <h2 className="text-sm font-semibold text-[#1a3a2a] mb-3 flex items-center gap-2">
        <Beaker className="w-4 h-4" />
        Subir exame de sangue do paciente
      </h2>
      <p className="text-xs text-[#1a3a2a]/60 font-body mb-4 leading-relaxed">
        Mande o PDF do laboratório ou tire fotos das páginas pelo celular. A IA lê,
        interpreta os 8 principais + extras (TSH, ferro, hemograma, etc.) e salva no
        histórico do paciente automaticamente.
      </p>
      <PdfExamUpload
        patientId={patientId}
        onParsed={handleParsed}
        onReset={() => {}}
      />
    </Card>
  )
}
