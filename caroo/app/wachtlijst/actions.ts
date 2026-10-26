'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'

const VOOR_WIE = ['moeder', 'vader', 'opa_oma', 'partner', 'anders']

export async function meldAanOpWachtlijst(formData: FormData) {
  // Spam-val: dit veld is onzichtbaar voor mensen
  if (String(formData.get('website') || '')) return { succes: true, voornaam: '' }

  const naam = String(formData.get('naam') || '').trim().slice(0, 80)
  const email = String(formData.get('email') || '').trim().toLowerCase().slice(0, 200)
  const voorWieRuw = String(formData.get('voor_wie') || '')
  const voorWie = VOOR_WIE.includes(voorWieRuw) ? voorWieRuw : null
  const bron = String(formData.get('bron') || '').replace(/[^a-z0-9\-_]/gi, '').slice(0, 80) || null
  const wilUpdates = formData.get('wil_updates') === 'on'

  if (!naam) return { error: 'Vul je naam in.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Dit e-mailadres klopt niet helemaal.' }

  const service = createServiceClient()
  const { data: bestaand } = await service.from('wachtlijst').select('id, wil_updates').ilike('email', email).maybeSingle()

  if (bestaand) {
    // Al aangemeld: gegevens bijwerken, geen tweede mail
    await service
      .from('wachtlijst')
      .update({
        naam,
        voor_wie: voorWie,
        wil_updates: wilUpdates || bestaand.wil_updates,
        bijgewerkt_op: new Date().toISOString(),
      })
      .eq('id', bestaand.id)
    return { succes: true, voornaam: naam.split(' ')[0], alAangemeld: true }
  }

  const { error } = await service.from('wachtlijst').insert({ naam, email, voor_wie: voorWie, bron, wil_updates: wilUpdates })
  if (error) return { error: 'Aanmelden lukte niet. Probeer het zo nog eens.' }

  const voornaam = naam.split(' ')[0]
  const o = MERK.oprichters
  await stuurMail({
    naar: email,
    onderwerp: `Je staat op de wachtlijst van ${MERK.naam}`,
    replyTo: MERK.contact,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;color:#1A2F5A">
        <h2 style="color:#1A7A6E;margin-bottom:4px">Fijn dat je erbij bent, ${escapeHtml(voornaam)}</h2>
        <p style="font-size:17px;line-height:1.55">Je staat op de wachtlijst van ${MERK.naam}. Op ${MERK.lancering} gaan we open, en dan hoor je het als eerste.</p>
        <p style="font-size:17px;line-height:1.55">De eerste ${o.aantal} families worden oprichtersfamilie. Zij betalen ${o.prijs} voor het eerste jaar in plaats van ${o.normaal}. Op ${MERK.lancering} krijg je een mail met een link om je plek te nemen. Aanmelden voor de wachtlijst is vrijblijvend.</p>
        <p style="font-size:17px;line-height:1.55">Vragen of ideeën? Antwoord gewoon op deze mail, die komt bij mij terecht.</p>
        <p style="font-size:17px;line-height:1.55">Hartelijke groet,<br>Farzana<br><span style="color:#6B7280;font-size:14px">${MERK.naam} is een initiatief van ${MERK.moederbedrijf}, ${MERK.plaats}</span></p>
        <p style="font-size:12px;color:#9CA3AF;margin-top:24px">Je ontvangt deze mail omdat je je aanmeldde voor de wachtlijst. Wil je eraf? Antwoord met "afmelden".</p>
      </div>`,
  })

  return { succes: true, voornaam }
}
