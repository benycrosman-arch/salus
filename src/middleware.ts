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
    const isAnyOnboarding = isOnboardingRoute || isNutriOnboardingRoute

    const nutriVerifyStatus = (profile as { nutri_verification_status?: string } | null | undefined)?.nutri_verification_status
    // Admins skip the CRN-credential gate so the founder/team can preview the
    // nutri dashboard without submitting registration paperwork.
    const nutriVerified = isAdmin || nutriVerifyStatus === 'verified'
    const nutriAwaiting = pathname === '/nutri/aguardando-verificacao'

    // Logged-in users hitting login/signup go to app (never skip onboarding)
    if (isAuthRoute) {
      let destination: string
      if (!onboardingDone) {
        destination = isNutri ? '/onboarding-nutri' : '/onboarding'
      } else if (isNutri) {
        destination = nutriVerified ? '/nutri' : '/nutri/aguardando-verificacao'
      } else {
        destination = '/dashboard'
      }
      return NextResponse.redirect(new URL(destination, request.url))
    }

    if (isAnyOnboarding && onboardingDone) {
      const target = isNutri
        ? (nutriVerified ? '/nutri' : '/nutri/aguardando-verificacao')
        : '/dashboard'
      return NextResponse.redirect(new URL(target, request.url))
    }

    // Block the rest of the app until the onboarding quiz is completed and saved.
    // Pacientes vão para /onboarding; nutricionistas vão para /onboarding-nutri.
    if (!onboardingDone && !isPublicRoute && !isAnyOnboarding) {
      return NextResponse.redirect(new URL(isNutri ? '/onboarding-nutri' : '/onboarding', request.url))
    }

    // Nutri ainda não verificado só pode acessar a tela de aguardo + onboarding-nutri.
    if (onboardingDone && isNutri && !nutriVerified && isNutriRoute && !nutriAwaiting) {
      return NextResponse.redirect(new URL('/nutri/aguardando-verificacao', request.url))
    }

    // Role gate: nutricionistas don't belong on the patient app surface, and
    // patients don't belong on the nutri panel. Shared routes (settings, profile,
    // auth, public) fall through.
    // Admins bypass both directions so they can preview either dashboard.
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
