import { NextRequest, NextResponse } from 'next/server'

interface RecommendationRequest {
  dailyScore: number
  mealsLogged: number
  highGlycemicCount: number
  fiberDiversity: number
  streak: number
}

interface Recommendation {
  type: string
  content: string
  priority: number
}

export async function POST(request: NextRequest) {
  try {
    const body: RecommendationRequest = await request.json()
    const { dailyScore, mealsLogged, highGlycemicCount, fiberDiversity, streak } = body

    const recommendations: Recommendation[] = []

    // Rule 1: Low fiber diversity
    if (fiberDiversity < 2) {
      recommendations.push({
        type: 'fiber',
        content: 'Add 3 new plant types today — try swapping your usual snack for mixed nuts and an apple',
        priority: 1,
      })
    }

    // Rule 2: Low daily score with meals logged
    if (dailyScore < 50 && mealsLogged >= 2) {
      recommendations.push({
        type: 'score',
        content: 'Your score is struggling today — one high-fiber meal can bring it back. Try lentil soup or a big salad for dinner',
        priority: 2,
      })
    }

    // Rule 3: High glycemic count
    if (highGlycemicCount >= 2) {
      recommendations.push({
        type: 'glycemic',
        content: 'You\'ve had two high-sugar-impact meals today. Walk for 10 minutes after your next meal — it cuts glycemic response by up to 30%',
        priority: 1,
      })
    }

    // Rule 4: No meals logged
    if (mealsLogged === 0) {
      recommendations.push({
        type: 'logging',
        content: 'You haven\'t logged today — log your last meal to keep your streak',
        priority: 3,
      })
    }

    // Rule 5: Streak milestone
    if (streak >= 7) {
      recommendations.push({
        type: 'streak',
        content: '7-day streak unlocked — your gut bacteria are noticing. Here\'s what\'s changing inside...',
        priority: 2,
      })
    }

    // Sort by priority and return first 2
    const sortedRecommendations = recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 2)

    return NextResponse.json({ recommendations: sortedRecommendations })
  } catch (error) {
    console.error('Recommendation generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
