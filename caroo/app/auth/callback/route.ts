import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verwerkOpenUitnodigingen } from '@/lib/uitnodiging'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'
  // Alleen interne paden toestaan
  const veiligNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=link_ongeldig`)
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    // Gebeurt o.a. als de bevestigingsmail in een andere browser wordt geopend.
    // Het e-mailadres is dan wel bevestigd: laat de gebruiker gewoon inloggen.
    // De uitnodiging wordt na het inloggen alsnog verwerkt.
    return NextResponse.redirect(`${origin}/login?bevestigd=1`)
  }

  const user = data.user
  const serviceClient = createServiceClient()

  // Profiel aanmaken als het nog niet bestaat
  const { data: bestaand } = await serviceClient
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!bestaand) {
    const naam = user.user_metadata?.naam || user.email?.split('@')[0] || 'Nieuw lid'
    await serviceClient.from('users').insert({
      id: user.id,
      email: user.email!,
      naam,
      rol: 'mantelzorger',
    })
  }

  // Uitnodiging direct verwerken
  const groepId = await verwerkOpenUitnodigingen(user)
  if (groepId) {
    return NextResponse.redirect(`${origin}/groep/${groepId}?welkom=true`)
  }

  // Was dit een uitnodigingslink die niet (meer) geldig is?
  if (veiligNext.startsWith('/uitnodiging')) {
    return NextResponse.redirect(`${origin}/dashboard?uitnodiging=ongeldig`)
  }

  return NextResponse.redirect(`${origin}${veiligNext}`)
}
