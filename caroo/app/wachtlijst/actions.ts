'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { stuurMail, escapeHtml } from '@/lib/mail'
import { MERK } from '@/lib/merk'
import { afmeldVoet } from '@/lib/wachtlijst-afmelden'
import { WL, wlTaal } from '@/lib/wachtlijst-teksten'

const VOOR_WIE = ['moeder', 'vader', 'opa_oma', 'partner', 'mezelf', 'anders']

export async function meldAanOpWachtlijst(formData: FormData) {
  // Spam-val: dit veld is onzichtbaar voor mensen
  if (String(formData.get('website') || '')) return { succes: true, voornaam: '' }

  const naam = String(formData.get('naam') || '').trim().slice(0, 80)
  const email = String(formData.get('email') || '').trim().toLowerCase().slice(0, 200)
  const voorWieRuw = String(formData.get('voor_wie') || '')
  const voorWie = VOOR_WIE.includes(voorWieRuw) ? voorWieRuw : null
  const bron = String(formData.get('bron') || '').replace(/[^a-z0-9\-_]/gi, '').slice(0, 80) || null
  const wilUpdates = formData.get('wil_updates') === 'on'
  const taal = wlTaal(formData.get('taal'))
  const w = WL[taal]

  if (!naam) return { error: w.form.foutNaam }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: w.form.foutEmail }

  const service = createServiceClient()
  const { data: bestaand } = await service.from('wachtlijst').select('id, wil_updates').eq('email', email).maybeSingle()

  if (bestaand) {
    // Al aangemeld: gegevens bijwerken, geen tweede mail
    await service
      .from('wachtlijst')
      .update({
        naam,
        voor_wie: voorWie,
        wil_updates: wilUpdates || bestaand.wil_updates,
        taal,
        // Weer aangemeld na afmelden: dan staat iemand weer op de lijst
        afgemeld_op: null,
        bijgewerkt_op: new Date().toISOString(),
      })
      .eq('id', bestaand.id)
    return { succes: true, voornaam: naam.split(' ')[0], alAangemeld: true }
  }

  const { data: nieuw, error } = await service.from('wachtlijst').insert({ naam, email, voor_wie: voorWie, bron, wil_updates: wilUpdates, taal }).select('afmeld_code').single()
  if (error || !nieuw) return { error: w.form.foutAlgemeen }

  const voornaam = naam.split(' ')[0]
  const o = MERK.oprichters
  // Rem tegen misbruik: komen er in tien minuten ineens heel veel aanmeldingen binnen (een script dat
  // andermans adressen invult), dan sturen we geen bevestigingsmails meer tot het rustig is.
  const { count: recent } = await service.from('wachtlijst').select('id', { count: 'exact', head: true })
    .gt('aangemeld_op', new Date(Date.now() - 10 * 60000).toISOString())
  if ((recent ?? 0) > 30) {
    console.warn('Wachtlijst: veel aanmeldingen in korte tijd, geen bevestigingsmail', recent)
    return { succes: true, voornaam }
  }
  await stuurMail({
    naar: email,
    onderwerp: w.mail.onderwerp,
    replyTo: MERK.contact,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;color:#1A2F5A">
        <h2 style="color:#1A7A6E;margin-bottom:4px">${escapeHtml(w.mail.kop(voornaam))}</h2>
        <p style="font-size:17px;line-height:1.55">${w.mail.p1}</p>
        <p style="font-size:17px;line-height:1.55">${w.mail.p2(o.aantal, o.prijs, o.normaal)}</p>
        <p style="font-size:17px;line-height:1.55">${w.mail.p3}</p>
        <p style="font-size:17px;line-height:1.55">${w.mail.groet}<br>Clanoo<br><span style="color:#6B7280;font-size:14px">${w.mail.initiatief}</span></p>
        ${afmeldVoet(nieuw.afmeld_code, taal)}
      </div>`,
  })

  return { succes: true, voornaam }
}
