'use client'

import { useState } from 'react'
import { MijnVerhaal } from './MijnVerhaal'
import { BoodschappenLijst } from '@/components/boodschappen/BoodschappenLijst'
import { Thuis, type Bezoekverzoek } from './Thuis'
import { Vrienden } from './Vrienden'
import type { VriendKaart, VriendenStatus } from '@/lib/vrienden'
import { InstellingenFormulier } from '@/components/instellingen/InstellingenFormulier'
import { uitloggen } from '@/app/auth/actions'
import { useT } from '@/lib/i18n/client'
import { categorieTekst } from '@/lib/i18n/vertaal'
import { tekstKleurOp } from '@/lib/kleur'

type Tab = 'vrienden' | 'thuis' | 'mijn_dag' | 'boodschappen' | 'fotos' | 'mijn_verhaal' | 'mijn_tip' | 'instellingen'

interface Props {
  groepId: string
  userId: string
  email: string
  naam: string
  groepNaam: string
  dagAfspraken: any[]
  medicijnen: any[]
  fotos: any[]
  stemmingVandaag: number | null
  bezoek: Bezoekverzoek | null
  aantalBoodschappen: number
  lettergrootte: string
  geluid: boolean
  meldingEmail: boolean
  net_gekoppeld?: boolean
  vrienden: VriendKaart[]
  vriendenStatus: VriendenStatus
}

export function OudereInterface({
  groepId, userId, email, naam, groepNaam, dagAfspraken, medicijnen, fotos,
  stemmingVandaag, bezoek, aantalBoodschappen, lettergrootte, geluid, meldingEmail, net_gekoppeld, vrienden, vriendenStatus,
}: Props) {
  const [tipZichtbaar, setTipZichtbaar] = useState(!!net_gekoppeld)
  const [actieveTab, setActieveTab] = useState<Tab>('thuis')
  const { t } = useT()

  const voornaam = naam.split(' ')[0]
  const uur = new Date().getHours()
  const begroeting = uur < 12 ? t('oudere.goedemorgen') : uur < 18 ? t('oudere.goedemiddag') : t('oudere.goedenavond')

  return (
    <div className="max-w-md md:max-w-5xl mx-auto min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-caroo-groen text-white px-4 py-4 md:px-8 md:py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white text-ou-sm md:text-ou-lg">{begroeting},</p>
            <h1 className="text-ou-2xl md:text-5xl font-bold">{voornaam}</h1>
            <p className="text-white text-ou-sm md:text-ou-base mt-0.5">{groepNaam}</p>
          </div>
          <button
            onClick={() => setActieveTab('instellingen')}
            className="flex flex-col items-center text-white hover:text-white pt-1"
            aria-label={t('algemeen.instellingen')}
          >
            <span className="text-2xl md:text-4xl">⚙️</span>
            <span className="text-sm md:text-base">{t('algemeen.instellingen')}</span>
          </button>
        </div>
      </header>

      {/* Na het koppelen: tip voor de familie die de tablet klaarzet */}
      {tipZichtbaar && (
        <div className="bg-caroo-oranje-licht border-b border-caroo-oranje px-4 py-3 md:px-8 flex items-start gap-3">
          <p className="flex-1 text-ou-sm text-caroo-donker">📲 {t('koppelen.beginschermTip')}</p>
          <button onClick={() => setTipZichtbaar(false)} className="text-ou-sm font-bold text-caroo-donker underline">{t('koppelen.sluiten')}</button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-28 md:pb-36">
        {actieveTab === 'thuis' && (
          <Thuis
            groepId={groepId}
            userId={userId}
            naam={naam}
            dagAfspraken={dagAfspraken}
            medicijnen={medicijnen}
            stemmingVandaag={stemmingVandaag}
            bezoek={bezoek}
            aantalBoodschappen={aantalBoodschappen}
            nieuwsteFoto={fotos[0] ? { url: fotos[0].url, beschrijving: fotos[0].onderschrift, door: fotos[0].door } : null}
            gaNaar={tab => setActieveTab(tab)}
          />
        )}
        {actieveTab === 'mijn_dag' && (
          <TabMijnDag dagAfspraken={dagAfspraken} />
        )}
        {actieveTab === 'boodschappen' && (
          <div className="px-4 py-6 md:px-8">
            <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">{t('oudere.boodschappenTitel')}</h2>
            <BoodschappenLijst groepId={groepId} groot />
          </div>
        )}
        {actieveTab === 'fotos' && (
          <TabFotos fotos={fotos} />
        )}
        {actieveTab === 'mijn_verhaal' && (
          <MijnVerhaal groepId={groepId} />
        )}
        {actieveTab === 'vrienden' && (
          <Vrienden vrienden={vrienden} status={vriendenStatus} groepId={groepId} />
        )}
        {actieveTab === 'mijn_tip' && (
          <TabMijnTip groepId={groepId} />
        )}
        {actieveTab === 'instellingen' && (
          <TabInstellingen naam={naam} email={email} lettergrootte={lettergrootte} geluid={geluid} meldingEmail={meldingEmail} />
        )}
      </main>

      {/* Onderste navigatie — grote knoppen voor ouderen */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 max-w-md md:max-w-5xl mx-auto md:px-4">
        <div className="grid grid-cols-7">
          {[
            { tab: 'thuis' as Tab, emoji: '🏠', label: t('oudere.nav.thuis') },
            { tab: 'mijn_dag' as Tab, emoji: '📅', label: t('oudere.nav.mijnDag') },
            { tab: 'boodschappen' as Tab, emoji: '🛒', label: t('oudere.nav.boodschap') },
            { tab: 'fotos' as Tab, emoji: '📸', label: t('oudere.nav.fotos') },
            { tab: 'mijn_verhaal' as Tab, emoji: '🎤', label: t('oudere.nav.verhaal') },
            { tab: 'vrienden' as Tab, emoji: '👭', label: t('vrienden.nav'), nieuw: vriendenStatus.vragen.length > 0 || vrienden.some(v => v.ongelezen || v.vraag || v.jouwBeurt) },
            { tab: 'mijn_tip' as Tab, emoji: '💡', label: t('oudere.nav.tip') },

          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActieveTab(item.tab)}
              aria-current={actieveTab === item.tab ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-2 md:py-3 px-0.5 m-1 rounded-caroo transition-colors
                ${actieveTab === item.tab
                  ? 'bg-caroo-groen-licht text-caroo-groen font-bold'
                  : 'text-gray-700 hover:text-caroo-donker'
                }`}
            >
              <span className="relative text-2xl md:text-4xl leading-none">
                {item.emoji}
                {'nieuw' in item && item.nieuw && actieveTab !== item.tab && (
                  <span className="absolute -top-1 -end-2 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-caroo-oranje-donker border-2 border-white" aria-label={t('vrienden.nieuwBericht')} />
                )}
              </span>
              <span className="text-sm md:text-lg leading-tight mt-1 text-center break-words">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabMijnDag({ dagAfspraken }: any) {
  const { t, tijd } = useT()
  return (
    <div className="px-4 py-6 md:px-8">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">{t('oudere.mijnDag.titel')}</h2>
      {dagAfspraken.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">☀️</p>
          <p className="text-ou-lg text-gray-600">{t('oudere.mijnDag.geenAfspraken')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dagAfspraken.map((af: any) => (
            <div key={af.id} className="caroo-card">
              <div
                className="inline-block text-ou-sm font-semibold px-3 py-0.5 rounded-full mb-2"
                style={{ backgroundColor: af.agenda_categorieen?.kleur || '#1A7A6E', color: tekstKleurOp(af.agenda_categorieen?.kleur || '#1A7A6E') }}
              >
                {categorieTekst(t, af.agenda_categorieen?.naam) || t('oudere.mijnDag.afspraak')}
              </div>
              <p className="text-ou-lg font-bold text-caroo-donker">{af.titel}</p>
              <p className="text-ou-base text-gray-600 mt-1">
                {t('oudere.mijnDag.tijdUur', { tijd: tijd(af.start_tijd) })}
              </p>
              {af.beschrijving && (
                <p className="text-ou-sm text-gray-600 mt-2">{af.beschrijving}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabFotos({ fotos }: any) {
  const { t } = useT()
  if (fotos.length === 0) {
    return (
      <div className="px-4 py-8 md:px-8 text-center">
        <p className="text-5xl mb-3">📸</p>
        <p className="text-ou-lg text-gray-600">{t('oudere.fotos.geen')}</p>
        <p className="text-ou-sm text-gray-600 mt-1">{t('oudere.fotos.familieKan')}</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">{t('oudere.fotos.titel')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {fotos.map((foto: any) => (
          <div key={foto.id} className="aspect-square rounded-caroo overflow-hidden bg-gray-100">
            <img
              src={foto.url}
              alt={foto.onderschrift || t('oudere.fotos.foto')}
              className="w-full h-full object-cover"
            />
            {foto.onderschrift && (
              <p className="text-ou-sm text-gray-700 px-2 py-1 truncate">{foto.onderschrift}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TabMijnTip({ groepId }: any) {
  const [tip, setTip] = useState('')
  const [verstuurd, setVerstuurd] = useState(false)
  const { t } = useT()

  async function stuurTip() {
    if (!tip.trim()) return

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('tips').insert({
      groep_id: groepId,
      auteur_id: user.id,
      tekst: tip,
      buurt_delen: false,
    })

    setTip('')
    setVerstuurd(true)
    setTimeout(() => setVerstuurd(false), 3000)
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-2">{t('oudere.tip.titel')}</h2>
      <p className="text-ou-sm text-gray-600 mb-4">
        {t('oudere.tip.uitleg')}
      </p>

      {verstuurd && (
        <div className="bg-caroo-groen-licht border border-caroo-groen rounded-caroo p-3 mb-4">
          <p className="text-caroo-groen text-ou-sm font-medium">{t('oudere.tip.verstuurd')}</p>
        </div>
      )}

      <textarea
        value={tip}
        onChange={e => setTip(e.target.value)}
        placeholder={t('oudere.tip.placeholder')}
        className="input-field text-ou-base h-36 resize-none mb-4"
      />



      <button
        onClick={stuurTip}
        disabled={!tip.trim()}
        className="btn-primary w-full text-ou-base py-4"
      >
        {t('oudere.tip.versturen')}
      </button>
    </div>
  )
}

function TabInstellingen({ naam, email, lettergrootte, geluid, meldingEmail }: { naam: string; email: string; lettergrootte: string; geluid: boolean; meldingEmail: boolean }) {
  const { t } = useT()
  return (
    <div className="px-4 py-6 md:px-8">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">{t('algemeen.instellingen')}</h2>
      <InstellingenFormulier naam={naam} email={email} lettergrootte={lettergrootte} geluid={geluid} meldingEmail={meldingEmail} groot />
      <form action={uitloggen} className="mt-8">
        <button
          type="submit"
          className="w-full py-4 text-ou-base text-red-500 border border-red-200 rounded-caroo hover:bg-red-50 transition-colors"
        >
          {t('algemeen.uitloggen')}
        </button>
      </form>
    </div>
  )
}
