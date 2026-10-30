'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import { speelGeluid } from '@/lib/geluid'
import { regelVriendVerzoek } from '@/lib/acties/vrienden'
import type { VriendVerzoek } from '@/lib/vrienden'

/** "Rosa wil graag vrienden worden met Henriette. Wie regelt het?" */
export function VriendVerzoeken({ groepId, mijnId, verzoeken: start }: { groepId: string; mijnId: string; verzoeken: VriendVerzoek[] }) {
  const { t } = useT()
  const router = useRouter()
  const [verzoeken, setVerzoeken] = useState(start)
  const [alGeregeld, setAlGeregeld] = useState<string | null>(null)
  if (!verzoeken.length) return null

  async function regel(id: string) {
    speelGeluid('succes')
    const r = await regelVriendVerzoek(groepId, id)
    if ('alGeregeld' in r && r.alGeregeld) {
      setAlGeregeld(id)
      setVerzoeken(prev => prev.map(v => (v.id === id ? { ...v, regeltDoor: 'iemand', regeltNaam: r.naam } : v)))
      return
    }
    if ('succes' in r) router.push(`/groep/${groepId}/vrienden?verzoek=${id}`)
  }

  return (
    <div className="space-y-2">
      {verzoeken.map(v => {
        const voornaam = v.hoofdpersoon.split(' ')[0]
        return (
          <div key={v.id} className="caroo-card border-s-4 border-caroo-oranje">
            <p className="font-medium text-caroo-donker">👭 {t('vrienden.familie.verzoekTitel', { naam: voornaam, vriend: v.vriendNaam })}</p>
            {!v.regeltDoor ? (
              <button onClick={() => regel(v.id)} className="btn-primary w-full mt-3 text-sm">{t('vrienden.familie.ikRegel')}</button>
            ) : v.regeltDoor === mijnId ? (
              <Link href={`/groep/${groepId}/vrienden?verzoek=${v.id}`} className="text-sm text-caroo-groen font-medium hover:underline">{t('vrienden.familie.verderRegelen')}</Link>
            ) : (
              <p className="text-sm text-caroo-groen font-medium mt-1">
                {t('vrienden.familie.regelt', { naam: v.regeltNaam || t('algemeen.iemand') })}
                {alGeregeld === v.id && <span className="block text-gray-600 font-normal">{t('vrienden.familie.wasEerder')}</span>}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
