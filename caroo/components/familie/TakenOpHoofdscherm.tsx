'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useVolg } from '@/lib/useVolg'
import { useT } from '@/lib/i18n/client'
import { zetTaakGedaan } from '@/lib/taken-client'
import { speelGeluid } from '@/lib/geluid'

interface Taak { id: string; titel: string; deadline: string | null; voltooid: boolean; voltooid_op?: string | null; voltooider?: { naam: string } | null }

/** Open taken op het groepsscherm, met een echt vinkje. Net afgevinkt blijft doorgestreept staan met wie het deed. */
export function TakenOpHoofdscherm({ groepId, taken: start, mijnNaam }: { groepId: string; taken: Taak[]; mijnNaam: string }) {
  const [taken, setTaken] = useVolg(start)
  const { t, datum } = useT()
  const router = useRouter()
  if (taken.length === 0) return null

  async function vink(taak: Taak) {
    const gedaan = !taak.voltooid
    if (gedaan) speelGeluid('succes')
    setTaken(prev => prev.map(tk => tk.id === taak.id
      ? { ...tk, voltooid: gedaan, voltooid_op: gedaan ? new Date().toISOString() : null, voltooider: gedaan ? { naam: mijnNaam } : null }
      : tk))
    await zetTaakGedaan(taak.id, gedaan)
    router.refresh()
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{t('groep.openTaken')}</h2>
      <div className="space-y-2">
        {taken.map(taak => (
          <div key={taak.id} className={`caroo-card flex items-center gap-3 ${taak.voltooid ? 'opacity-70' : ''}`}>
            <button
              onClick={() => vink(taak)}
              className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${taak.voltooid ? 'bg-caroo-groen border-caroo-groen text-white' : 'border-gray-400 bg-white'}`}
              aria-label={taak.voltooid ? t('taken.markeerOpen') : t('taken.markeerGedaan')}
            >
              {taak.voltooid && '✓'}
            </button>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${taak.voltooid ? 'line-through text-gray-600' : ''}`}>{taak.titel}</p>
              {taak.voltooid && taak.voltooider?.naam ? (
                <p className="text-xs text-caroo-groen">{t('taken.gedaanDoor', { naam: taak.voltooider.naam })}</p>
              ) : taak.deadline ? (
                <p className="text-xs text-gray-600">{datum(taak.deadline, { day: 'numeric', month: 'numeric', year: 'numeric' })}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Link href={`/groep/${groepId}/taken`} className="text-sm text-caroo-groen font-medium hover:underline mt-2 inline-block">{t('taken.alleTaken')}</Link>
    </div>
  )
}
