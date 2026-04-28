import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Export user data as JSON. Required by LGPD/GDPR/Apple privacy guidelines.
 * Returns everything we have on the caller across the app tables.
 */

export async function GET() {
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fetchTable = async (table: string, fk: string) => {
    const { data } = await supabase.from(table).select('*').eq(fk, user.id)
    return data ?? []
  }

  const [profile, preferences, meals, dailyStats, streaks, labResults] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(r => r.data ?? null),
    fetchTable('user_preferences', 'user_id'),
    fetchTable('meals', 'user_id'),
    fetchTable('daily_stats', 'user_id'),
    fetchTable('streaks', 'user_id'),
    fetchTable('lab_results', 'user_id'),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email, created_at: user.created_at },
    profile,
    preferences,
    meals,
    daily_stats: dailyStats,
    streaks,
    lab_results: labResults,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="salus-data-${user.id}.json"`,
    },
  })
}
