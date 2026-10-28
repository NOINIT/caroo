'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { verwijderLidUitGroep } from './actions'
import { useT } from '@/lib/i18n/client'
import { categorieTekst } from '@/lib/i18n/vertaal'

interface Lid {
  id: string
  rol: string
  toegevoegd_op: string
  users: { id: string; naam: string; email: string } | null
}

interface Categorie {
  id: string
  naam: string
  kleur: string
  systeem: boolean
}

interface Props {
  groepId: string
  huidigGebruikerId: string
  leden: Lid[]
  categorieen: Categorie[]
}

export function BeheerClient({ groepId, huidigGebruikerId, leden: initieelLeden, categorieen: initieelCat }: Props) {
  const [leden, setLeden] = useState(initieelLeden)
  const [categorieen, setCategorieen] = useState(initieelCat)
  const [bewerkCat, setBewerkCat] = useState<string | null>(null)
  const [catNaam, setCatNaam] = useState('')
  const [catKleur, setCatKleur] = useState('')
  const [nieuweCat, setNieuweCat] = useState({ naam: '', kleur: '#1A7A6E' })
  const [toonNieuweCat, setToonNieuweCat] = useState(false)
  const [laden, setLaden] = useState(false)
  const { t } = useT()

  async function verwijderLid(lidId: string) {
    if (!confirm(t('beheer.lidZeker'))) return
    const resultaat = await verwijderLidUitGroep(groepId, lidId)
    if ('error' in resultaat && resultaat.error) {
      alert(resultaat.error)
      return
    }
    setLeden(prev => prev.filter(l => l.id !== lidId))
  }

  async function startBewerkCat(cat: Categorie) {
    setBewerkCat(cat.id)
    setCatNaam(categorieTekst(t, cat.naam))
    setCatKleur(cat.kleur)
  }

  async function slaCategoriOp(catId: string) {
    const supabase = createClient()
    await supabase.from('agenda_categorieen')
      .update({ naam: catNaam, kleur: catKleur })
      .eq('id', catId)
    setCategorieen(prev => prev.map(c => c.id === catId ? { ...c, naam: catNaam, kleur: catKleur } : c))
    setBewerkCat(null)
  }

  async function verwijderCategorie(catId: string) {
    if (!confirm(t('beheer.categorieZeker'))) return
    const supabase = createClient()
    await supabase.from('agenda_categorieen').delete().eq('id', catId)
    setCategorieen(prev => prev.filter(c => c.id !== catId))
  }

  async function voegCategorieToe(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('agenda_categorieen').insert({
      groep_id: groepId,
      naam: nieuweCat.naam,
      kleur: nieuweCat.kleur,
      systeem: false,
      aangemaakt_door: user.id,
    }).select().single()

    if (data) {
      setCategorieen(prev => [...prev, data as any])
    }
    setNieuweCat({ naam: '', kleur: '#1A7A6E' })
    setToonNieuweCat(false)
    setLaden(false)
  }

  return (
    <div className="px-4 py-4 space-y-6">

      {/* Leden */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          {t('groep.leden', { aantal: leden.length })}
        </h2>
        <div className="space-y-2">
          {leden.map(lid => {
            const isZijzelf = lid.users?.id === huidigGebruikerId
            return (
              <div key={lid.id} className="caroo-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-caroo-groen flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {lid.users?.naam?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-caroo-donker text-sm">{lid.users?.naam || t('algemeen.onbekend')}</p>
                  <p className="text-xs text-gray-600"><span dir="ltr">{lid.users?.email}</span> · {lid.rol === 'groepsbeheerder' ? t('dashboard.beheerder') : t(`rollen.${lid.rol as 'mantelzorger' | 'oudere'}`)}</p>
                </div>
                {!isZijzelf && (
                  <button
                    onClick={() => verwijderLid(lid.id)}
                    className="text-gray-500 hover:text-red-600 text-lg flex-shrink-0"
                    aria-label={t('beheer.lidVerwijderen')}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Categorieën */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            {t('beheer.categorieen')}
          </h2>
          <button
            onClick={() => setToonNieuweCat(!toonNieuweCat)}
            className="text-xs text-caroo-groen font-medium"
          >
            {t('beheer.nieuweCategorie')}
          </button>
        </div>

        {toonNieuweCat && (
          <form onSubmit={voegCategorieToe} className="caroo-card mb-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={nieuweCat.naam}
                onChange={e => setNieuweCat(p => ({ ...p, naam: e.target.value }))}
                className="input-field flex-1"
                placeholder={t('beheer.naamCategorie')}
                required
              />
              <input
                type="color"
                value={nieuweCat.kleur}
                onChange={e => setNieuweCat(p => ({ ...p, kleur: e.target.value }))}
                className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
              />
            </div>
            <button type="submit" disabled={laden} className="btn-primary w-full text-sm">
              {laden ? t('algemeen.opslaanBezig') : t('beheer.toevoegen')}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {categorieen.map(cat => (
            <div key={cat.id} className="caroo-card">
              {bewerkCat === cat.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={catNaam}
                    onChange={e => setCatNaam(e.target.value)}
                    className="input-field flex-1 text-sm py-1"
                  />
                  <input
                    type="color"
                    value={catKleur}
                    onChange={e => setCatKleur(e.target.value)}
                    className="w-10 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <button
                    onClick={() => slaCategoriOp(cat.id)}
                    className="text-caroo-groen font-medium text-sm"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setBewerkCat(null)}
                    className="text-gray-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.kleur }}
                  />
                  <span className="flex-1 text-sm text-caroo-donker">{categorieTekst(t, cat.naam)}</span>
                  {cat.systeem && (
                    <span className="text-xs text-gray-600">{t('beheer.standaard')}</span>
                  )}
                  <button
                    onClick={() => startBewerkCat(cat)}
                    className="text-gray-600 hover:text-caroo-groen text-sm"
                    aria-label={t('beheer.bewerken')}
                  >
                    ✏️
                  </button>
                  {!cat.systeem && (
                    <button
                      onClick={() => verwijderCategorie(cat.id)}
                      className="text-gray-500 hover:text-red-600 text-lg"
                      aria-label={t('algemeen.verwijderen')}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
