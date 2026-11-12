import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { oprichtersplekkenOver } from '@/lib/stripe-kortingen'
import { PRIJS } from '@/lib/prijzen'

// Voor de website: hoeveel oprichtersplekken er nog zijn en hoeveel families op de wachtlijst staan.
// Alleen aantallen, geen namen. Het aantal op de wachtlijst noemen we pas vanaf 10.
export const revalidate = 300

export async function GET() {
  const [over, { count }] = await Promise.all([
    oprichtersplekkenOver(),
    createServiceClient().from('wachtlijst').select('id', { count: 'exact', head: true }),
  ])
  return NextResponse.json(
    { plekken: PRIJS.oprichterPlekken, over, wachtlijst: (count ?? 0) >= 10 ? count : null },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}
