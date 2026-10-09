'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GroepAanmakenPage() {
  const [naam, setNaam] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)
  const router = useRouter()

  async function handleAanmaken(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return

    setLaden(true)
    setFout(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Groep aanmaken
    const { data: groep, error } = await supabase
      .from('zorggroepen')
      .insert({ naam: naam.trim(), eigenaar_id: user.id })
      .select()
      .single()

    if (error || !groep) {
      setFout('Kon de zorggroep niet aanmaken.')
      setLaden(false)
      return
    }

    // Eigenaar ook als groepslid toevoegen
    await supabase.from('groepsleden').insert({
      groep_id: groep.id,
      user_id: user.id,
      rol: 'groepsbeheerder',
    })

    // Redirect naar betaalpagina
    router.push(`/betalen?groep=${groep.id}&naam=${encodeURIComponent(naam)}`)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-caroo-donker mb-2">
          Zorggroep aanmaken
        </h1>
        <p className="text-gray-500">
          Geef je zorggroep een naam. Je kunt daarna meteen mensen uitnodigen.
        </p>
      </div>

      <form onSubmit={handleAanmaken} className="space-y-6">
        <div>
          <label className="input-label" htmlFor="naam">
            Naam van de zorggroep
          </label>
          <input
            id="naam"
            type="text"
            value={naam}
            onChange={e => setNaam(e.target.value)}
            required
            className="input-field text-lg"
            placeholder="bijv. Familie Van Dijk"
            maxLength={60}
          />
          <p className="text-xs text-gray-400 mt-1">
            Tip: gebruik de naam van degene voor wie je zorgt
          </p>
        </div>

        {fout && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-caroo p-3 text-sm">
            {fout}
          </div>
        )}

        <div className="caroo-card bg-caroo-groen-licht border-caroo-groen border">
          <h3 className="font-semibold text-caroo-donker mb-2">Wat je krijgt</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ Onbeperkt leden in je zorggroep</li>
            <li>✅ Agenda, taken & medicijnenagenda</li>
            <li>✅ Mijn verhaal met spraakherkenning</li>
            <li>✅ Fotoalbum & tips delen</li>
            <li>✅ AVG-conform opgeslagen in Europa</li>
          </ul>
          <p className="mt-3 font-bold text-caroo-groen">Eenmalig €4,99</p>
        </div>

        <button
          type="submit"
          disabled={laden || !naam.trim()}
          className="btn-primary w-full"
        >
          {laden ? 'Even wachten...' : 'Verder naar betaling →'}
        </button>
      </form>
    </div>
  )
}
