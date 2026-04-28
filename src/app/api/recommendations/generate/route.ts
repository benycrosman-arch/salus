import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

interface RecommendationRequest {
  dailyScore: number
  mealsLogged: number
  highGlycemicCount: number
  fiberDiversity: number
  streak: number
}

interface Recommendation {
  id: string
  type: 'food_swap' | 'daily_challenge' | 'supplement' | 'meal_suggestion'
  content: string
  priority: number
  dismissed: boolean
}

function isValidRequest(body: unknown): body is RecommendationRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.dailyScore === 'number' &&
    typeof b.mealsLogged === 'number' &&
    typeof b.highGlycemicCount === 'number' &&
    typeof b.fiberDiversity === 'number' &&
    typeof b.streak === 'number'
  )
}

export async function POST(request: NextRequest) {
  try {
    const guard = await guardRequest()
    if (!guard.ok) return guard.response

    const body = await request.json()

    if (!isValidRequest(body)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: dailyScore, mealsLogged, highGlycemicCount, fiberDiversity, streak (all numbers)' },
        { status: 400 }
      )
    }

    const { dailyScore, mealsLogged, highGlycemicCount, fiberDiversity, streak } = body
    const recommendations: Recommendation[] = []
    let nextId = 1

    if (mealsLogged === 0) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'daily_challenge',
        content: 'Você ainda não registrou hoje — registre sua próxima refeição para manter seu streak ativo.',
        priority: 1,
        dismissed: false,
      })
    }

    if (fiberDiversity < 2) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'food_swap',
        content: 'Diversifique suas fibras: adicione 3 plantas diferentes hoje — nozes mistas e uma maçã no lanche funcionam bem.',
        priority: 1,
        dismissed: false,
      })
    }

    if (highGlycemicCount >= 2) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'meal_suggestion',
        content: 'Duas refeições subiram muito o açúcar no sangue hoje. Caminhe 10 minutos após a próxima refeição — reduz o pico de açúcar em até 30%.',
        priority: 1,
        dismissed: false,
      })
    }

    if (dailyScore < 50 && mealsLogged >= 2) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'food_swap',
        content: 'Seu score está baixo hoje. Uma refeição rica em fibras pode recuperá-lo — tente uma sopa de lentilha ou uma salada caprichada no jantar.',
        priority: 2,
        dismissed: false,
      })
    }

    if (streak >= 7 && streak < 8) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'daily_challenge',
        content: 'Streak de 7 dias! Suas bactérias intestinais estão notando a diferença. Continue assim.',
        priority: 3,
        dismissed: false,
      })
    }

    if (streak >= 14 && streak < 15) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'daily_challenge',
        content: '14 dias consecutivos! Estudos mostram que mudanças nas bactérias boas do intestino começam a se consolidar neste ponto.',
        priority: 3,
        dismissed: false,
      })
    }

    if (dailyScore >= 80 && mealsLogged >= 3) {
      recommendations.push({
        id: `rec_${nextId++}`,
        type: 'supplement',
        content: 'Dia excelente! Score acima de 80 com diversidade nutricional. Considere adicionar alimentos fermentados amanhã para potencializar.',
        priority: 3,
        dismissed: false,
      })
    }

    const sortedRecommendations = recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)

    return NextResponse.json({ recommendations: sortedRecommendations })
  } catch (error) {
    console.error('Recommendation generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
