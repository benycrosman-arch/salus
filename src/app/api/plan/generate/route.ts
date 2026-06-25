import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'
import { generateIndividualizedPlan } from '@/lib/plan/individualized-plan'

export const maxDuration = 120

export async function POST() {
  const guard = await guardRequest()
  if (!guard.ok) return guard.response
  const { user, supabase } = guard

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Geração de plano indisponível no momento.' },
      { status: 503 },
    )
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  const weekStartDate = monday.toISOString().split('T')[0]

  try {
    const plan = await generateIndividualizedPlan(supabase, user.id)

    const groceryList = plan.groceryList.map((item) => ({ ...item, owned: false }))
    const estimatedTotal =
      Math.round(groceryList.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0) * 100) / 100

    return NextResponse.json({
      ok: true,
      weekStartDate,
      targets: plan.targets,
      days: plan.days,
      groceryList,
      estimatedTotal,
      notes: plan.notes,
    })
  } catch (error) {
    console.error('Individualized plan generation failed:', error)
    return NextResponse.json(
      { error: 'Não consegui gerar o plano agora. Tente novamente em instantes.' },
      { status: 502 },
    )
  }
}
