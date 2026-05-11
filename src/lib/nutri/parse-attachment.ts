import Anthropic from '@anthropic-ai/sdk'

export const NUTRI_ATTACHMENT_MODEL = 'claude-opus-4-7'
export const MAX_EXTRACTED_CHARS = 8000

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  _client = new Anthropic({ apiKey })
  return _client
}

export interface AttachmentExtraction {
  text: string
  usage: { input_tokens: number; output_tokens: number }
}

const SYSTEM_PT = `Você recebe um PDF entregue por um nutricionista para o paciente dele (plano alimentar, plano de treino, orientação clínica ou material educativo).

Extraia o conteúdo textual em PT-BR de forma fiel e estruturada. Foque em:
- Listas de alimentos permitidos / proibidos
- Macros, calorias, porções e horários sugeridos
- Restrições, alergias, observações clínicas
- Recomendações de rotina (água, sono, exercício, suplementação)

Regras estritas:
- NÃO comente, NÃO interprete, NÃO adicione conselhos seus.
- NÃO use markdown pesado — texto corrido com quebras de linha simples.
- Preserve a estrutura semântica (seções, listas) com hifens e títulos simples.
- Ignore cabeçalhos/rodapés institucionais e dados pessoais do nutricionista (CRN, telefone, endereço).
- Limite total: ${MAX_EXTRACTED_CHARS} caracteres. Se o conteúdo for maior, priorize as orientações práticas (o que comer, quando, quanto).`

export async function extractTextFromAttachment(
  pdfBase64: string,
): Promise<AttachmentExtraction> {
  const res = await client().messages.create({
    model: NUTRI_ATTACHMENT_MODEL,
    max_tokens: 4000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: 'Extraia o conteúdo textual seguindo as regras.',
          },
        ],
      },
    ],
  })

  const raw = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  return {
    text: raw.slice(0, MAX_EXTRACTED_CHARS),
    usage: {
      input_tokens: res.usage?.input_tokens ?? 0,
      output_tokens: res.usage?.output_tokens ?? 0,
    },
  }
}
