import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Self-service account deletion.
 * Required by Apple App Store Guideline 5.1.1(v) — users must be able to delete their account
 * from inside the app. Email-to-support is explicitly not sufficient.
 *
 * Flow:
 * 1. Verify the caller is authenticated
 * 2. Hard-delete the user's rows in app tables (RLS would otherwise block it)
 * 3. Delete the auth user (admin API), which cascades to anything still referencing auth.users
 */

export async function POST(request: NextRequest) {
  void request
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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Account deletion is not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    )
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const tables = [
    'meals',
    'daily_stats',
    'streaks',
    'lab_results',
    'user_preferences',
    'recommendations',
    'profiles',
  ]

  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq(
      table === 'profiles' ? 'id' : 'user_id',
      user.id
    )
    if (error && !/does not exist|relation .* does not exist/i.test(error.message)) {
      console.error(`Failed to delete from ${table}:`, error)
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteUserError) {
    console.error('Failed to delete auth user:', deleteUserError)
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
  }

  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
