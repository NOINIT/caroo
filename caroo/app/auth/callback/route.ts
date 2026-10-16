import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verwerkOpenUitnodigingen } from '@/lib/uitnodiging'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

const TOEGESTANE_TYPES: EmailOtpType[] = ['signup', 'magiclink', 'email', 'invite', 'recovery', 'email_change']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') || '/dashboard'
  // Alleen interne paden toestaan
  const veiligNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  const supabase = createClient()
  let user = null

  if (tokenHash && type && TOEGESTANE_TYPES.includes(type)) {
    // Werkt op elk apparaat: de link zelf bevat alles wat nodig is
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) user = data.user
  } else if (code) {
    // Werkt alleen in dezelfde browser als waar de link is aangevraagd
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) user = data.user
  }

  if (!user) {
    // Bijv. link verlopen, al gebruikt, of geopend in een andere browser.
    return NextResponse.redirect(`${origin}/login?bevestigd=1`)
  }

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
    // De groepspagina stuurt ouderen zelf door naar hun eigen weergave
    return NextResponse.redirect(`${origin}/groep/${groepId}?welkom=true`)
  }

  if (veiligNext.startsWith('/uitnodiging')) {
    return NextResponse.redirect(`${origin}/dashboard?uitnodiging=ongeldig`)
  }

  return NextResponse.redirect(`${origin}${veiligNext}`)
}
