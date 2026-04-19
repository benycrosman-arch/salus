import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a precision nutrition analyst. When given a meal photo, you identify every food item visible and return structured nutritional data. Rules:
- Estimate portion sizes realistically (what you see, not theoretical serving sizes)
- For processed foods, flag them explicitly
- Always estimate fiber diversity: count distinct plant types visible
- Return glycemic impact as: low (unlikely to spike blood sugar), medium (moderate spike), high (significant spike)
- Be specific and practical. Not: "carbohydrates present." Yes: "white rice, approx 1 cup, high glycemic load"
- If the image is unclear or not food, return an error message
- Return ONLY valid JSON, no markdown code blocks, no explanation text`

const USER_PROMPT = `Analyze this meal. Return JSON only: { "foods": [{"name": string, "quantity": string, "unit": string, "estimatedCalories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number, "isProcessed": boolean}], "totalMacros": {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number}, "fiberDiversityCount": number, "glycemicImpact": "low" | "medium" | "high", "processedFoodRatio": number (0-1), "mealScore": number (0-100), "feedback": string (2 sentences max, specific and actionable), "swapSuggestions": [string, string] }`

function calculateScore(fiberDiversityCount: number, glycemicImpact: string, processedFoodRatio: number): number {
  const glycemicNum = glycemicImpact === 'low' ? 0 : glycemicImpact === 'medium' ? 0.5 : 1
  const score = (fiberDiversityCount / 5 * 40) + ((1 - glycemicNum) * 30) + ((1 - processedFoodRatio) * 30)
  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image } = body // base64 encoded image

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Extract base64 data and media type
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
    let base64Data = image

    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        mediaType = match[1] as typeof mediaType
        base64Data = match[2]
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    })

    // Extract text content
    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No analysis returned' }, { status: 500 })
    }

    // Parse the JSON response
    let analysis
    try {
      // Clean up potential markdown code blocks
      let jsonStr = textBlock.text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      analysis = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse meal analysis', raw: textBlock.text },
        { status: 500 }
      )
    }

    // Recalculate score using our formula for consistency
    const recalculatedScore = calculateScore(
      analysis.fiberDiversityCount,
      analysis.glycemicImpact,
      analysis.processedFoodRatio
    )

    return NextResponse.json({
      ...analysis,
      mealScore: recalculatedScore,
    })
  } catch (error) {
    console.error('Meal analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze meal' },
      { status: 500 }
    )
  }
}
