'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'

export interface Boodschap {
  id: string
  naam: string
  op_lijst: boolean
  bijgewerkt_op: string
}

interface Props {
  groepId: string
  initieel?: Boodschap[]
  /** Grote letters en knoppen voor de ouderenweergave */
  groot?: boolean
}

const VERVERS_ELKE_MS = 20000

export function BoodschappenLijst({ groepId, initieel = [], groot = false }: Props) {
  const [items, setItems] = useState<Boodschap[]>(initieel)
  const [invoer, setInvoer] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const { t } = useT()

  const laad = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('boodschappen')
      .select('id, naam, op_lijst, bijgewerkt_op')
      .eq('groep_id', groepId)
      .order('bijgewerkt_op', { ascending: false })
    if (!error && data) setItems(data)
  }, [groepId])

  // Bijhouden wat anderen toevoegen of afvinken
  useEffect(() => {
    laad()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') laad()
    }, VERVERS_ELKE_MS)
    return () => clearInterval(timer)
  }, [laad])

  const opLijst = items.filter(i => i.op_lijst)
  const eerder = items.filter(i => !i.op_lijst)

  async function zetStatus(id: string, op_lijst: boolean) {
    const nu = new Date().toISOString()
    setItems(prev => prev.map(i => (i.id === id ? { ...i, op_lijst, bijgewerkt_op: nu } : i)))
    const supabase = createClient()
    const { error } = await supabase
      .from('boodschappen')
      .update({ op_lijst, bijgewerkt_op: nu })
      .eq('id', id)
    if (error) {
      console.error('Boodschap bijwerken mislukt', error)
      setFout(t('algemeen.lukteNiet'))
      laad()
    }
  }

  async function voegToe(e: React.FormEvent) {
    e.preventDefault()
    const naam = invoer.trim()
    if (!naam || bezig) return
    setFout(null)

    // Stond dit er al eens op? Dan dat item hergebruiken
    const bestaand = items.find(i => i.naam.toLowerCase() === naam.toLowerCase())
    if (bestaand) {
      setInvoer('')
      if (!bestaand.op_lijst) await zetStatus(bestaand.id, true)
      return
    }

    setBezig(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('boodschappen')
      .insert({ groep_id: groepId, naam, toegevoegd_door: user?.id ?? null })
      .select('id, naam, op_lijst, bijgewerkt_op')
      .single()

    if (error) {
      // Iemand anders voegde hetzelfde net toe: lijst verversen en opnieuw zetten
      if (error.code === '23505') {
        await laad()
      } else {
        console.error('Boodschap toevoegen mislukt', error)
        setFout(t('boodschappen.toevoegenMislukt'))
      }
    } else if (data) {
      setItems(prev => [data, ...prev])
      setInvoer('')
    }
    setBezig(false)
  }

  async function verwijder(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    const supabase = createClient()
    await supabase.from('boodschappen').delete().eq('id', id)
  }

  const tekst = groot ? 'text-ou-base' : 'text-base'
  const klein = groot ? 'text-ou-sm' : 'text-sm'
  const vakje = groot ? 'w-9 h-9 text-xl' : 'w-7 h-7 text-base'

  return (
    <div className="space-y-5">
      <form onSubmit={voegToe} className="flex gap-2">
        <input
          type="text"
          value={invoer}
          onChange={e => setInvoer(e.target.value)}
          placeholder={t('boodschappen.placeholder')}
          maxLength={80}
          className={`input-field flex-1 ${groot ? 'text-ou-base py-4' : ''}`}
          aria-label={t('boodschappen.nieuwProduct')}
        />
        <button
          type="submit"
          disabled={!invoer.trim() || bezig}
          className={`btn-primary flex-shrink-0 ${groot ? 'px-5 text-ou-base' : 'px-4'}`}
        >
          ＋
        </button>
      </form>

      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-sm">
          {fout}
        </div>
      )}

      {/* Op de lijst */}
      <section>
        <h2 className={`font-bold text-caroo-donker mb-2 ${groot ? 'text-ou-lg' : 'text-base'}`}>
          {t('boodschappen.nogHalen', { aantal: opLijst.length })}
        </h2>
        {opLijst.length === 0 ? (
          <p className={`text-gray-500 ${klein}`}>{t('boodschappen.leeg')}</p>
        ) : (
          <ul className="space-y-2">
            {opLijst.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => zetStatus(item.id, false)}
                  className={`caroo-card w-full flex items-center gap-3 text-start hover:border-caroo-groen transition-colors ${groot ? 'py-4' : 'py-3'}`}
                  aria-label={t('boodschappen.afvinken', { naam: item.naam })}
                >
                  <span className={`${vakje} flex-shrink-0 rounded-lg border-2 border-caroo-groen flex items-center justify-center`} />
                  <span className={`${tekst} text-caroo-donker font-medium`}>{item.naam}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Eerder gekocht */}
      {eerder.length > 0 && (
        <section>
          <h2 className={`font-bold text-gray-500 mb-1 ${groot ? 'text-ou-lg' : 'text-base'}`}>
            {t('boodschappen.eerderGekocht')}
          </h2>
          <p className={`text-gray-400 mb-2 ${groot ? 'text-ou-sm' : 'text-xs'}`}>
            {t('boodschappen.tikOmTerug')}
          </p>
          <ul className="space-y-2">
            {eerder.map(item => (
              <li key={item.id} className="flex items-center gap-2">
                <button
                  onClick={() => zetStatus(item.id, true)}
                  className={`flex-1 flex items-center gap-3 text-start rounded-caroo border border-gray-100 bg-gray-50 px-4 hover:border-caroo-groen transition-colors ${groot ? 'py-4' : 'py-2.5'}`}
                  aria-label={t('boodschappen.weerOpLijst', { naam: item.naam })}
                >
                  <span className={`${vakje} flex-shrink-0 rounded-lg bg-caroo-groen-licht text-caroo-groen flex items-center justify-center`}>
                    ✓
                  </span>
                  <span className={`${tekst} text-gray-500`}>{item.naam}</span>
                  <span className={`ms-auto text-caroo-groen font-medium ${klein}`}>{t('boodschappen.opnieuw')}</span>
                </button>
                {!groot && (
                  <button
                    onClick={() => verwijder(item.id)}
                    className="text-gray-300 hover:text-red-400 text-lg px-2"
                    aria-label={t('boodschappen.helemaalVerwijderen', { naam: item.naam })}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
