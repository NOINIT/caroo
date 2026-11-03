'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import { rolTekst } from '@/lib/i18n/vertaal'
import { toegangVan } from '@/lib/opzeggen'
import { zetBeheerder } from '@/lib/acties/beheer'
import { binnenBedenktijd } from '@/lib/herroepen'
import { ToestemmingKaart } from '@/components/familie/ToestemmingKaart'

export interface BeheerGegevens {
  groepId: string
  ikId: string
  eigenaarId: string
  groep: { naam: string; betaald: boolean | null; gestopt_op: string | null; aangemaakt_op: string | null }
  toestemming: boolean
  abonnementSinds: string | null
  leden: { id: string; userId: string; naam: string; rol: string; beheerder: boolean }[]
}

/** Voor een hoofdpersoon die zelf beheert: familie uitnodigen, beheerders kiezen, abonnement. Eenvoudig en groot. */
export function TabletBeheer({ g }: { g: BeheerGegevens }) {
  const { t, datum } = useT()
  const [leden, setLeden] = useState(g.leden)
  const [email, setEmail] = useState('')
  const [magBeheren, setMagBeheren] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [gekopieerd, setGekopieerd] = useState(false)
  const toegang = toegangVan(g.groep)
  const isEigenaar = g.ikId === g.eigenaarId

  async function nodigUit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBezig(true); setFout(null); setLink(null); setGekopieerd(false)
    const res = await fetch('/api/uitnodiging', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groepId: g.groepId, email: email.trim(), rol: magBeheren ? 'groepsbeheerder' : 'mantelzorger' }),
    })
    const data = await res.json().catch(() => ({}))
    setBezig(false)
    if (!res.ok) { setFout(data.error || t('algemeen.lukteNiet')); return }
    setLink(data.link); setEmail(''); setMagBeheren(false)
  }

  async function wissel(lid: BeheerGegevens['leden'][number]) {
    const aan = !(lid.rol === 'groepsbeheerder' || lid.beheerder)
    const r = await zetBeheerder(g.groepId, lid.id, aan)
    if ('error' in r && r.error) { setFout(r.error); return }
    setLeden(prev => prev.map(l => (l.id !== lid.id ? l
      : l.rol === 'oudere' ? { ...l, beheerder: aan } : { ...l, rol: aan ? 'groepsbeheerder' : 'mantelzorger', beheerder: aan })))
  }

  return (
    <section className="mt-10 space-y-6">
      <div>
        <h3 className="text-ou-xl font-bold text-caroo-donker">{t('tabletBeheer.titel')}</h3>
        <p className="text-ou-base text-gray-700">{t('tabletBeheer.uitleg')}</p>
      </div>

      {!g.toestemming && <ToestemmingKaart groepId={g.groepId} zelf />}

      {isEigenaar && (
        <div className="caroo-card space-y-2">
          <p className="text-ou-lg font-bold text-caroo-donker">{t('tabletBeheer.abonnement')}</p>
          {toegang.toegang === 'proef' && toegang.tot && (
            <p className="text-ou-base text-gray-700">{t('groep.proefLoopt', { datum: datum(toegang.tot, { day: 'numeric', month: 'long' }) })}</p>
          )}
          {toegang.toegang === 'geen' && <p className="text-ou-base text-gray-700">{t('groep.proefVoorbij')}</p>}
          <Link href={`/betalen?groep=${g.groepId}&naam=${encodeURIComponent(g.groep.naam)}`} className="btn-secondary w-full block text-center text-ou-base py-4">
            {g.groep.betaald ? t('tabletBeheer.bekijk') : t('groep.kiesAbonnement')}
          </Link>
          {g.groep.betaald && binnenBedenktijd(g.abonnementSinds) && (
            <Link href={`/groep/${g.groepId}/herroepen`} className="block text-center text-ou-sm text-caroo-groen font-semibold underline pt-1">{t('herroepen.link')}</Link>
          )}
        </div>
      )}

      <form onSubmit={nodigUit} className="caroo-card space-y-4">
        <p className="text-ou-lg font-bold text-caroo-donker">{t('tabletBeheer.uitnodigen')}</p>
        <label className="block">
          <span className="block text-ou-base text-gray-700 mb-1">{t('tabletBeheer.email')}</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="input-field text-ou-lg" />
        </label>
        <label className="flex items-center gap-3 text-ou-base text-caroo-donker">
          <input type="checkbox" checked={magBeheren} onChange={e => setMagBeheren(e.target.checked)} className="w-6 h-6 accent-caroo-groen" />
          {t('tabletBeheer.magBeheren')}
        </label>
        {fout && <p className="text-ou-sm text-red-600">{fout}</p>}
        <button type="submit" disabled={bezig || !email.trim()} className="btn-primary w-full text-ou-base py-4">{t('tabletBeheer.knop')}</button>
        {link && (
          <div className="space-y-3 pt-2">
            <p className="text-ou-base text-gray-700">{t('tabletBeheer.linkUitleg')}</p>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${t('tabletBeheer.deelTekst')} ${link}`)}`} target="_blank" rel="noopener noreferrer"
              className="btn-primary w-full block text-center text-ou-base py-4">{t('tabletBeheer.delen')}</a>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setGekopieerd(true) } catch {} }}
              className="btn-secondary w-full text-ou-base py-4">{gekopieerd ? `✓ ${t('tabletBeheer.gekopieerd')}` : t('tabletBeheer.kopieer')}</button>
          </div>
        )}
      </form>

      <div className="caroo-card space-y-3">
        <p className="text-ou-lg font-bold text-caroo-donker">{t('tabletBeheer.leden')}</p>
        {leden.map(l => {
          const beheert = l.rol === 'groepsbeheerder' || l.beheerder
          return (
            <div key={l.id} className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 first:border-0 first:pt-0">
              <div className="min-w-0">
                <p className="text-ou-base font-semibold text-caroo-donker truncate">{l.naam}</p>
                <p className="text-ou-sm text-gray-600">
                  {l.rol === 'groepsbeheerder' ? t('dashboard.beheerder') : rolTekst(t, l.rol)}{l.rol !== 'groepsbeheerder' && l.beheerder ? ` · ${t('dashboard.beheerder')}` : ''}
                </p>
              </div>
              {l.userId !== g.ikId && l.userId !== g.eigenaarId && (
                <button onClick={() => wissel(l)} className="text-ou-sm font-semibold text-caroo-groen underline flex-shrink-0">
                  {beheert ? t('beheer.geenBeheerderMeer') : t('beheer.maakBeheerder')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
