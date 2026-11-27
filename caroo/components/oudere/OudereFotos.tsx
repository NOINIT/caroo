'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/client'
import { speelGeluid } from '@/lib/geluid'

interface Foto { id: string; url: string; onderschrift?: string | null; door?: string | null }

/** Foto's voor de hoofdpersoon: groot bekijken, bewaren en zelf een foto sturen. */
export function OudereFotos({ groepId, fotos }: { groepId: string; fotos: Foto[] }) {
  const { t } = useT()
  const router = useRouter()
  const invoer = useRef<HTMLInputElement>(null)
  const [groot, setGroot] = useState<Foto | null>(null)
  const [bezig, setBezig] = useState(false)
  const [klaar, setKlaar] = useState(false)
  const [fout, setFout] = useState(false)

  async function stuur(bestand: File) {
    setBezig(true); setFout(false); setKlaar(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBezig(false); return }
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic' } as Record<string, string>)[bestand.type] || 'jpg'
    const pad = `${groepId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(pad, bestand, { contentType: bestand.type || 'image/jpeg' })
    if (!error) {
      await supabase.from('fotos').insert({ groep_id: groepId, opslag_pad: pad, onderschrift: null, uploader_id: user.id })
      speelGeluid('succes'); setKlaar(true)
      router.refresh()
    } else setFout(true)
    setBezig(false)
    if (invoer.current) invoer.current.value = ''
  }

  async function bewaar(foto: Foto) {
    try {
      const blob = await (await fetch(foto.url)).blob()
      const bestand = new File([blob], `clanoo-foto.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type })
      const nav = navigator as any
      if (nav.canShare?.({ files: [bestand] })) { await nav.share({ files: [bestand] }); return }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = bestand.name
      document.body.appendChild(a); a.click(); a.remove()
    } catch {
      window.open(foto.url, '_blank')
    }
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      <h2 className="text-ou-xl font-bold text-caroo-donker mb-4">{t('oudere.fotos.titel')}</h2>

      <input ref={invoer} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) stuur(f) }} />
      <button onClick={() => invoer.current?.click()} disabled={bezig} className="w-full rounded-caroo-lg bg-caroo-groen text-white text-ou-lg font-bold py-5 mb-2 active:scale-[0.98] transition-transform">
        {bezig ? t('algemeen.evenGeduld') : `📷 ${t('oudere.fotos.stuur')}`}
      </button>
      {klaar && <p className="text-ou-base text-caroo-groen text-center mb-3" role="status">✓ {t('oudere.fotos.gestuurd')}</p>}
      {fout && <p className="text-ou-base text-red-600 text-center mb-3" role="status">{t('algemeen.lukteNiet')}</p>}

      {fotos.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-ou-lg text-gray-600">{t('oudere.fotos.geen')}</p>
          <p className="text-ou-sm text-gray-600 mt-1">{t('oudere.fotos.familieKan')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-3">
          {fotos.map(foto => (
            <button key={foto.id} onClick={() => setGroot(foto)} className="text-start rounded-caroo overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt={foto.onderschrift || t('oudere.fotos.foto')} className="w-full aspect-square object-cover" />
              {foto.onderschrift && <p className="text-ou-sm text-gray-700 px-2 py-1 truncate">{foto.onderschrift}</p>}
            </button>
          ))}
        </div>
      )}

      {groot && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true">
          <div className="flex justify-between items-center p-3 gap-3">
            <button onClick={() => bewaar(groot)} className="rounded-caroo bg-white text-caroo-donker text-ou-base font-bold px-4 py-3">⬇️ {t('oudere.fotos.bewaar')}</button>
            <button onClick={() => setGroot(null)} className="rounded-caroo bg-white text-caroo-donker text-ou-base font-bold px-4 py-3">✕ {t('koppelen.sluiten')}</button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={groot.url} alt={groot.onderschrift || t('oudere.fotos.foto')} className="flex-1 w-full object-contain min-h-0" onClick={() => setGroot(null)} />
          {(groot.onderschrift || groot.door) && (
            <p className="text-white text-ou-base text-center p-3">{[groot.onderschrift, groot.door].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      )}
    </div>
  )
}
