import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    role: roleInput,
    nutriProtocol,
    age, sex, height, weight, activityLevel, city, phone,
    goals, dietType, allergies, labs,
  } = body

  const role: 'user' | 'nutricionista' = roleInput === 'nutricionista' ? 'nutricionista' : 'user'
  const isNutri = role === 'nutricionista'

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  const displayName =
    (existingProfile?.name && existingProfile.name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user.email?.split('@')[0] ||
    ''

  // ─── NUTRI BRANCH ────────────────────────────────────────
  if (isNutri) {
    const protocol = String(nutriProtocol ?? '').trim().slice(0, 4000)
    if (protocol.length < 60) {
      return NextResponse.json(
        { error: 'Descreva seu protocolo em pelo menos 60 caracteres.' },
        { status: 400 },
      )
    }
    const { error: nutriError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          name: displayName,
          role: 'nutricionista',
          plan: 'nutri_pro',
          nutri_protocol: protocol,
          city: city || null,
          phone: phone || null,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
    if (nutriError) {
      return NextResponse.json({ error: nutriError.message }, { status: 500 })
    }

    // Initialize default nutri_settings if not present
    await supabase.from('nutri_settings').upsert(
      { nutri_id: user.id },
      { onConflict: 'nutri_id', ignoreDuplicates: true },
    )

    return NextResponse.json({ ok: true, role: 'nutricionista' })
  }

  // ─── CLIENT BRANCH ───────────────────────────────────────
  // Upsert so the row is created even if the signup trigger did not run (avoids silent no-op updates)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        name: displayName,
        role: 'user',
        age,
        biological_sex: sex === 'non-binary' || sex === 'prefer-not-to-say' ? 'other' : sex,
        height_cm: height,
        weight_kg: weight,
        activity_level: activityLevel,
        city: city || null,
        phone: phone || null,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Upsert preferences (gut health questionnaire removed from onboarding flow)
  const { error: prefError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      goals,
      diet_type: dietType,
      allergies,
      updated_at: new Date().toISOString(),
    })

  if (prefError) {
    return NextResponse.json({ error: prefError.message }, { status: 500 })
  }

  // Insert lab results (only provided values)
  const labMarkers: { key: string; label: string; unit: string }[] = [
    { key: 'glucose', label: 'Glicose em jejum', unit: 'mg/dL' },
    { key: 'hba1c', label: 'HbA1c', unit: '%' },
    { key: 'hdl', label: 'HDL', unit: 'mg/dL' },
    { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
    { key: 'triglycerides', label: 'Triglicérides', unit: 'mg/dL' },
    { key: 'vitaminD', label: 'Vitamina D', unit: 'ng/mL' },
    { key: 'ferritin', label: 'Ferritina', unit: 'ng/mL' },
    { key: 'b12', label: 'Vitamina B12', unit: 'pg/mL' },
  ]

  const labRows = labMarkers
    .filter(({ key }) => labs[key] !== '' && labs[key] != null)
    .map(({ key, label, unit }) => ({
      user_id: user.id,
      marker: label,
      value: labs[key],
      unit,
      measured_at: new Date().toISOString().split('T')[0],
      source: 'manual',
    }))

  if (labRows.length > 0) {
    const { error: labError } = await supabase.from('lab_results').insert(labRows)
    if (labError) {
      return NextResponse.json({ error: labError.message }, { status: 500 })
    }
  }

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    nextPath: updatedProfile?.role === 'nutricionista' ? '/nutri' : '/dashboard',
  })
}
