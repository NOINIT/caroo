import { createClient } from '@/lib/supabase/server'
import { rondInlogAf, veiligPad } from '@/lib/inlog-afronden'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = veiligPad(searchParams.get('next'))

  // Links uit onze eigen mails: NIET hier al inloggen. Mailprogramma's openen
  // links soms automatisch om ze te scannen, en dan is de eenmalige link op
  // voordat de mens erop klikt. Daarom eerst een pagina met een knop.
  if (tokenHash && type) {
    const params = new URLSearchParams({ token_hash: tokenHash, type, next })
    return NextResponse.redirect(`${origin}/auth/bevestig?${params.toString()}`)
  }

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const pad = await rondInlogAf(data.user, next)
      return NextResponse.redirect(`${origin}${pad}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?bevestigd=1`)
}
