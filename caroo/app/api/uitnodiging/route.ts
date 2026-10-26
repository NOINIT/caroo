import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { maakUitnodiging, checkRateLimit } from '@/lib/uitnodiging'
import { heeftRecht } from '@/lib/rechten'
import { getT } from '@/lib/i18n/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { t } = await getT()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: t('algemeen.nietIngelogd') }, { status: 401 })
  }

  const { groepId, email, rol } = await request.json()

  if (!groepId || !email || !rol) {
    return NextResponse.json({ error: t('auth.vulAlles') }, { status: 400 })
  }

  const toegestaan = await heeftRecht(groepId, ['groepsbeheerder'])
  if (!toegestaan) {
    return NextResponse.json({ error: t('uitnodigen.geenToegang') }, { status: 403 })
  }

  const magUitnodigen = await checkRateLimit(user.id)
  if (!magUitnodigen) {
    return NextResponse.json({ error: t('uitnodigingFout.maxPerDag', { aantal: 10 }) }, { status: 429 })
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
