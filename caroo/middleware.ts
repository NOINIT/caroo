import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/registreer',
  '/wachtwoord-vergeten',
  '/uitnodiging',
  '/auth/callback',
  '/auth/bevestig',
  '/auth/magic-link',
  '/api/stripe/webhook',
  '/api/cron',
  '/api/oprichters',
  '/sw.js',
  '/manifest.webmanifest',
  '/icons',
  '/wachtlijst',
  '/privacy',
  '/account-verwijderen',
  '/voorwaarden',
  '/veelgestelde-vragen',
  '/koppel',
  '/vriend',
  '/site',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/en',
  '/tr',
]

// Statische websitepagina's: geen sessiecontrole nodig
const WEBSITE = ['/', '/privacy', '/voorwaarden', '/veelgestelde-vragen', '/en/faq', '/tr/sss', '/account-verwijderen', '/en', '/tr', '/llms.txt']

// Het oude Vercel-adres stuurt door naar het eigen domein.
// API-routes (Stripe-webhook, geplande taken) blijven daar werken: die volgen geen doorverwijzingen.
const OUD_ADRES = 'caroo-psi.vercel.app'
const HOOFDDOMEIN = 'https://clanoo.nl'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (host === OUD_ADRES && !request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(`${HOOFDDOMEIN}${request.nextUrl.pathname}${request.nextUrl.search}`, 308)
  }
  // In de Android- en iPhone-app is er geen website met prijzen: meteen naar Clanoo zelf
  const p = request.nextUrl.pathname
  if ((p === '/' || p === '/en' || p === '/tr') && (request.headers.get('user-agent') || '').includes('ClanooApp')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  if (WEBSITE.includes(request.nextUrl.pathname)) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|site/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
}
