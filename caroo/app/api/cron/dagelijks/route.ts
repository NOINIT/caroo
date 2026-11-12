import { NextRequest, NextResponse } from 'next/server'
import { proefHerinneringen } from '@/lib/cron/proef-herinnering'
import { uitnodigFamilie } from '@/lib/cron/uitnodig-familie'
import { wachtlijstLancering } from '@/lib/cron/wachtlijst-lancering'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Elke ochtend om 9 uur (Vercel Cron). Alle mails die op een vast moment gaan.
 * Elke mail gaat maar één keer (tijdstempel in de database), dus deze route kan geen kwaad
 * als iemand anders hem aanroept. Met CRON_SECRET in Vercel is hij bovendien afgeschermd.
 */
export async function GET(request: NextRequest) {
  const geheim = process.env.CRON_SECRET
  if (geheim && request.headers.get('authorization') !== `Bearer ${geheim}`) {
    return NextResponse.json({ fout: 'Geen toegang' }, { status: 401 })
  }
  const uitkomst: Record<string, unknown> = {}
  for (const [naam, taak] of [['proef', proefHerinneringen], ['uitnodigen', uitnodigFamilie], ['wachtlijst', wachtlijstLancering]] as const) {
    try { uitkomst[naam] = await taak() } catch (e) { console.error('Cron mislukt:', naam, e); uitkomst[naam] = 'fout' }
  }
  return NextResponse.json(uitkomst)
}
