import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * User-facing mechanism to flag harmful/inaccurate AI output.
 * Required by Google Play for apps that use generative AI (NEW 2025 policy).
 * Apple also evaluates moderation controls for AI-generated content.
 *
 * Stores the report in the `ai_reports` table for the team to triage.
 */

type ReportBody = {
  reason: 'incorrect' | 'harmful' | 'misleading' | 'offensive' | 'other'
  note?: string
  context?: {
    surface?: string
    mealId?: string
    content?: string
  }
}

const VALID_REASONS = new Set(['incorrect', 'harmful', 'misleading', 'offensive', 'other'])

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let body: ReportBody
  try {
    body = (await request.json()) as ReportBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.reason || !VALID_REASONS.has(body.reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const { error } = await supabase.from('ai_reports').insert({
    user_id: user?.id ?? null,
    reason: body.reason,
    note: body.note?.slice(0, 2000) ?? null,
    surface: body.context?.surface ?? null,
    meal_id: body.context?.mealId ?? null,
    content_snapshot: body.context?.content?.slice(0, 4000) ?? null,
  })

  // Do not fail if the ai_reports table does not exist yet — log and accept
  if (error) {
    console.warn('ai_reports insert failed (table may not exist):', error.message)
  }

  return NextResponse.json({ ok: true })
}
