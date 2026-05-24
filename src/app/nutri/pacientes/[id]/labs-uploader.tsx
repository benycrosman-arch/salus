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
    const known = Object.values(result.knownLabs).filter((v) => v !== null).length
    const extra = result.extraLabs.length
    const total = known + extra
    if (total === 0) {
      toast.warning("Não consegui ler marcadores do laudo. Tente outra foto ou PDF mais nítido.")
    } else {
      toast.success(`Salvei ${total} marcadores no histórico do paciente.`)
    }
    // Refresh server data so the "Exames recentes" card picks up the new rows.
    router.refresh()
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
        endpoint="/api/nutri/patient-labs"
        extraFields={{ patientId }}
        onParsed={handleParsed}
        onReset={() => {}}
      />
    </Card>
  )
}
