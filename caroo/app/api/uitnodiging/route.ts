import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { maakUitnodiging, checkRateLimit } from '@/lib/uitnodiging'
import { heeftRecht } from '@/lib/rechten'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { groepId, email, rol } = await request.json()

  if (!groepId || !email || !rol) {
    return NextResponse.json({ error: 'Velden ontbreken' }, { status: 400 })
  }

  const toegestaan = await heeftRecht(groepId, ['mantelzorger', 'groepsbeheerder'])
  if (!toegestaan) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const magUitnodigen = await checkRateLimit(user.id)
  if (!magUitnodigen) {
    return NextResponse.json({
      error: `Je hebt het dagelijks maximum van 10 uitnodigingen bereikt.`
    }, { status: 429 })
  }

  const resultaat = await maakUitnodiging({ groepId, uitgenodigdDoor: user.id, email, rol })

  if ('error' in resultaat) {
    return NextResponse.json({ error: resultaat.error }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const link = `${baseUrl}/uitnodiging?token=${resultaat.token}`

  return NextResponse.json({
    link,
    uitnodiging: resultaat.uitnodiging,
  })
}
