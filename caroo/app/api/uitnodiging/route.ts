import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { maakUitnodiging, checkRateLimit } from '@/lib/uitnodiging'
import { isBeheerder } from '@/lib/rechten'
import { createServiceClient } from '@/lib/supabase/server'
import { magGebruiken } from '@/lib/opzeggen'
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

  const { data: groep } = await createServiceClient().from('zorggroepen').select('betaald, gestopt_op, aangemaakt_op').eq('id', groepId).maybeSingle()
  const toegestaan = (await isBeheerder(groepId, user.id)) && !!groep && magGebruiken(groep)
  if (!toegestaan || !['mantelzorger', 'groepsbeheerder', 'oudere'].includes(rol)) {
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
