'use client'

import { useState } from 'react'
import { MijnVerhaal } from './MijnVerhaal'
import { uitloggen } from '@/app/auth/actions'

type Tab = 'thuis' | 'mijn_dag' | 'fotos' | 'mijn_verhaal' | 'mijn_tip' | 'instellingen'

interface Props {
  groepId: string
  naam: string
  groepNaam: string
  dagAfspraken: any[]
  medicijnen: any[]
  fotos: any[]
}

export function OudereInterface({ groepId, naam, groepNaam, dagAfspraken, medicijnen, fotos }: Props) {
  const [actieveTab, setActieveTab] = useState<Tab>('thuis')

  const voornaam = naam.split(' ')[0]
  const uur = new Date().getHours()
  const begroeting = uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond'

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-caroo-groen text-white px-4 py-4">
        <p className="text-white/80 text-ou-sm">{begroeting},</p>
        <h1 className="text-ou-2xl font-bold">{voornaam}</h1>
        <p className="text-white/70 text-xs mt-0.5">{groepNaam}</p>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {actieveTab === 'thuis' && (
          <TabThuis
            dagAfspraken={dagAfspraken}
            medicijnen={medicijnen}
            groepId={groepId}
          />
        )}
        {actieveTab === 'mijn_dag' && (
          <TabMijnDag dagAfspraken={dagAfspraken} />
        )}
        {actieveTab === 'fotos' && (
          <TabFotos fotos={fotos} />
        )}
        {actieveTab === 'mijn_verhaal' && (
          <MijnVerhaal groepId={groepId} />
        )}
        {actieveTab === 'mijn_tip' && (
          <TabMijnTip groepId={groepId} />
        )}
        {actieveTab === 'instellingen' && (
          <TabInstellingen naam={naam} />
        )}
      </main>

      {/* Onderste navigatie — grote knoppen voor ouderen */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
        <div className="grid grid-cols-6">
          {[
            { tab: 'thuis' as Tab, emoji: '🏠', label: 'Thuis' },
            { tab: 'mijn_dag' as Tab, emoji: '📅', label: 'Mijn dag' },
            { tab: 'fotos' as Tab, emoji: '📸', label: "Foto's" },
            { tab: 'mijn_verhaal' as Tab, emoji: '🎤', label: 'Verhaal' },
            { tab: 'mijn_tip' as Tab, emoji: '💡', label: 'Tip' },
            { tab: 'instellingen' as Tab, emoji: '⚙️', label: 'Stel in' },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActieveTab(item.tab)}
              className={`flex flex-col items-center justify-center py-2 transition-colors
                ${actieveTab === item.tab
                  ? 'text-caroo-groen'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function TabThuis({ dagAfspraken, medicijnen, groepId }: any) {
  const vandaagTekst = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="px-4 py-6 space-y-5">
      <p className="text-ou-sm text-gray-500 capitalize">{vandaagTekst}</p>

      {/* Vandaag */}
      {dagAfspraken.length > 0 ? (
        <div>
          <h2 className="text-ou-xl font-bold text-caroo-donker mb-3">Vandaag</h2>
          <div className="space-y-3">
            {dagAfspraken.map((af: any) => (
              <div key={af.id} className="flex gap-3 items-start">
                <div
                  className="w-1.5 rounded-full mt-1 h-12 flex-shrink-0"
                  style={{ backgroundColor: af.agenda_categorieen?.kleur || '#1A7A6E' }}
                />
                <div>
                  <p className="text-ou-base font-semibold text-caroo-donker">{af.titel}</p>
                  <p className="text-ou-sm text-gray-500">
                    {new Date(af.start_tijd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} uur
                  </p>
                  {af.beschrijving && (
                    <p className="text-ou-sm text-gray-400 mt-0.5">{af.beschrijving}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="caroo-card text-center py-6">
          <p className="text-3xl mb-2">☀️</p>
          <p className="text-ou-base text-gray-600">Vandaag geen afspraken</p>
        </div>
      )}

      {/* Medicijnen herinnering */}
      {medicijnen.length > 0 && (
        <div className="caroo-card border-l-4 border-caroo-oranje">
          <p className="text-ou-base font-semibold text-caroo-donker mb-2">💊 Medicijnen vandaag</p>
          {medicijnen.map((med: any) => (
            <div key={med.id} className="mb-1">
              <p className="text-ou-sm text-gray-700">
                {med.naam} — {med.dosering}
              </p>
              <p className="text-xs text-gray-400">
                {med.tijdstippen.join(', ')} uur
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabMijnDag({ dagAfspraken }: any) {
  return (
    <div className="px-4 py-6">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">Mijn dag</h2>
      {dagAfspraken.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">☀️</p>
          <p className="text-ou-lg text-gray-500">Vandaag geen afspraken</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dagAfspraken.map((af: any) => (
            <div key={af.id} className="caroo-card">
              <div
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full text-white mb-2"
                style={{ backgroundColor: af.agenda_categorieen?.kleur || '#1A7A6E' }}
              >
                {af.agenda_categorieen?.naam || 'Afspraak'}
              </div>
              <p className="text-ou-lg font-bold text-caroo-donker">{af.titel}</p>
              <p className="text-ou-base text-gray-600 mt-1">
                {new Date(af.start_tijd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} uur
              </p>
              {af.beschrijving && (
                <p className="text-ou-sm text-gray-500 mt-2">{af.beschrijving}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabFotos({ fotos }: any) {
  if (fotos.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-5xl mb-3">📸</p>
        <p className="text-ou-lg text-gray-500">Nog geen foto's</p>
        <p className="text-ou-sm text-gray-400 mt-1">Familie kan foto's toevoegen</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">Onze foto's</h2>
      <div className="grid grid-cols-2 gap-3">
        {fotos.map((foto: any) => (
          <div key={foto.id} className="aspect-square rounded-caroo overflow-hidden bg-gray-100">
            <img
              src={foto.opslag_pad}
              alt={foto.onderschrift || 'Foto'}
              className="w-full h-full object-cover"
            />
            {foto.onderschrift && (
              <p className="text-xs text-gray-600 p-1 truncate">{foto.onderschrift}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TabMijnTip({ groepId }: any) {
  const [tip, setTip] = useState('')
  const [buurtDelen, setBuurtDelen] = useState(false)
  const [verstuurd, setVerstuurd] = useState(false)

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
      buurt_delen: buurtDelen,
    })

    setTip('')
    setVerstuurd(true)
    setTimeout(() => setVerstuurd(false), 3000)
  }

  return (
    <div className="px-4 py-6">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-2">Mijn tip</h2>
      <p className="text-ou-sm text-gray-500 mb-4">
        Deel een tip of levensles met je familie
      </p>

      {verstuurd && (
        <div className="bg-caroo-groen-licht border border-caroo-groen rounded-caroo p-3 mb-4">
          <p className="text-caroo-groen text-ou-sm font-medium">✅ Tip verstuurd!</p>
        </div>
      )}

      <textarea
        value={tip}
        onChange={e => setTip(e.target.value)}
        placeholder="Schrijf hier je tip of herinnering..."
        className="input-field text-ou-base h-36 resize-none mb-4"
      />

      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={buurtDelen}
          onChange={e => setBuurtDelen(e.target.checked)}
          className="w-5 h-5 accent-caroo-groen"
        />
        <span className="text-ou-sm text-gray-600">
          Deel ook met de buurt (Buurtverbinding)
        </span>
      </label>

      <button
        onClick={stuurTip}
        disabled={!tip.trim()}
        className="btn-primary w-full text-ou-base py-4"
      >
        💡 Tip versturen
      </button>
    </div>
  )
}

function TabInstellingen({ naam }: any) {
  return (
    <div className="px-4 py-6">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">Instellingen</h2>

      <div className="space-y-3">
        <div className="caroo-card">
          <p className="text-ou-sm text-gray-500 mb-1">Mijn naam</p>
          <p className="text-ou-base font-semibold">{naam}</p>
        </div>

        <div className="caroo-card">
          <p className="text-ou-sm text-gray-500 mb-1">Lettergrootte</p>
          <p className="text-ou-sm text-gray-400">Standaard groot (WCAG AA)</p>
        </div>
      </div>

      <form action={uitloggen} className="mt-6">
        <button
          type="submit"
          className="w-full py-4 text-ou-base text-red-500 border border-red-200 rounded-caroo hover:bg-red-50 transition-colors"
        >
          Uitloggen
        </button>
      </form>
    </div>
  )
}
