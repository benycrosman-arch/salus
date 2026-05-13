import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAdminEmail } from '@/lib/admin'

const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/signup', '/aceitar-convite']
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public assets and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase isn't configured yet, allow all requests through
  if (!supabaseUrl || !supabaseUrl.startsWith('http') || !supabaseKey) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Funnel any authenticated user with an unconsumed invite cookie through
  // /aceitar-convite/confirmar. Only /auth/callback and that page actually
  // POST to /api/nutri/invite/accept, so email/password signup with
  // auto-confirm and existing-user login both end up authenticated with the
  // cookie stranded and the nutri↔paciente link never created.
  if (user && request.cookies.has('salus_invite')) {
    const onInviteFlow = pathname.startsWith('/aceitar-convite')
    const onAuthFlow = pathname.startsWith('/auth/')
    if (!onInviteFlow && !onAuthFlow) {
      return NextResponse.redirect(new URL('/aceitar-convite/confirmar', request.url))
    }
  }

  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/')) ||
    pathname.startsWith('/auth/')
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/')

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', user.id)
      .maybeSingle()

    const onboardingDone = profile?.onboarding_completed === true
    const isAdmin = isAdminEmail(user.email)
    const isNutri = profile?.role === 'nutricionista'
    const isNutriRoute = pathname === '/nutri' || pathname.startsWith('/nutri/')
    const isNutriOnboardingRoute = pathname === '/onboarding-nutri' || pathname.startsWith('/onboarding-nutri/')

    // Nutri pula a etapa /onboarding-nutri inteira (removida do fluxo) e sempre
    // vai pro painel. O quiz de /onboarding continua valendo só para pacientes.
    // Logged-in hitting login/signup → app surface correspondente.
    if (isAuthRoute) {
      const destination = isNutri
        ? '/nutri'
        : (onboardingDone ? '/dashboard' : '/onboarding')
      return NextResponse.redirect(new URL(destination, request.url))
    }

    // Qualquer um (paciente ou nutri) caindo em /onboarding-nutri vai pro painel
    // do nutri se for nutri, ou pro próprio onboarding de paciente caso contrário.
    if (isNutriOnboardingRoute) {
      return NextResponse.redirect(new URL(isNutri ? '/nutri' : '/onboarding', request.url))
    }

    // Nutri batendo em /onboarding (quiz de paciente) → painel.
    if (isNutri && isOnboardingRoute) {
      return NextResponse.redirect(new URL('/nutri', request.url))
    }

    // Paciente não-onboarded fica bloqueado fora do quiz.
    if (!isNutri && !onboardingDone && !isPublicRoute && !isOnboardingRoute) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Paciente já onboarded batendo em /onboarding vai pro dashboard.
    if (!isNutri && onboardingDone && isOnboardingRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Role gate: nutricionistas don't belong on the patient app surface, and
    // patients don't belong on the nutri panel. Shared routes (settings, profile,
    // auth, public) fall through. Admins bypass both directions.
    if (onboardingDone && !isAdmin) {
      const PATIENT_ONLY = ['/dashboard', '/log', '/plan', '/grocery', '/progress', '/health-data', '/insights', '/meal-result', '/mensagens']
      const onPatientArea = PATIENT_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'))
      if (isNutri && onPatientArea) {
        return NextResponse.redirect(new URL('/nutri', request.url))
      }
      if (!isNutri && isNutriRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
