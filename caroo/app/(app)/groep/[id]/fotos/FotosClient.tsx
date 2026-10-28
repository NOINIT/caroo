'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { verwijderFoto } from './actions'
import { useT } from '@/lib/i18n/client'

interface Foto {
  id: string
  opslag_pad: string
  onderschrift: string | null
  uploader_id: string | null
  aangemaakt_op: string
  url: string
  users: { naam: string } | null
  auteur_naam?: string | null
}

interface Props {
  groepId: string
  fotos: Foto[]
  mijnId: string
  isBeheerder: boolean
}

export function FotosClient({ groepId, fotos: initieel, mijnId, isBeheerder }: Props) {
  const [fotos, setFotos] = useState(initieel)
  const [uploaden, setUploaden] = useState(false)
  const [beschrijving, setBeschrijving] = useState('')
  const [geselecteerd, setGeselecteerd] = useState<File | null>(null)
  const [voorvertoning, setVoorvertoning] = useState<string | null>(null)
  const [groteFoto, setGroteFoto] = useState<Foto | null>(null)
  const [bevestigVerwijderen, setBevestigVerwijderen] = useState(false)
  const [verwijderFout, setVerwijderFout] = useState('')
  const { t, datum } = useT()

  function sluitGroot() {
    setGroteFoto(null)
    setBevestigVerwijderen(false)
    setVerwijderFout('')
  }

  async function verwijder(foto: Foto) {
    const r = await verwijderFoto(groepId, foto.id)
    if ('error' in r && r.error) {
      setVerwijderFout(r.error)
      return
    }
    setFotos(prev => prev.filter(f => f.id !== foto.id))
    sluitGroot()
  }
  const inputRef = useRef<HTMLInputElement>(null)

  function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0]
    if (!bestand) return
    setGeselecteerd(bestand)
    const lezer = new FileReader()
    lezer.onload = () => setVoorvertoning(lezer.result as string)
    lezer.readAsDataURL(bestand)
  }

  function annuleer() {
    setGeselecteerd(null)
    setVoorvertoning(null)
    setBeschrijving('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function uploadFoto() {
    if (!geselecteerd) return
    setUploaden(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = geselecteerd.name.split('.').pop()
    const pad = `${groepId}/${Date.now()}.${ext}`

    const { error: uploadFout } = await supabase.storage
      .from('fotos')
      .upload(pad, geselecteerd, { contentType: geselecteerd.type })

    if (uploadFout) {
      console.error('Upload fout:', uploadFout)
      setUploaden(false)
      return
    }

    const { data: signedData } = await supabase.storage
      .from('fotos')
      .createSignedUrl(pad, 3600)

    const { data: nieuweFoto } = await supabase.from('fotos').insert({
      groep_id: groepId,
      opslag_pad: pad,
      onderschrift: beschrijving || null,
      uploader_id: user.id,
    }).select('id, opslag_pad, onderschrift, uploader_id, aangemaakt_op, auteur_naam, users (naam)').single()

    if (nieuweFoto) {
      setFotos(prev => [{ ...nieuweFoto as any, url: signedData?.signedUrl || '' }, ...prev])
    }

    annuleer()
    setUploaden(false)
  }

  return (
    <div className="px-4 py-4">
      {/* Upload knop of formulier */}
      {!geselecteerd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={kiesBestand}
            id="foto-upload"
          />
          <label
            htmlFor="foto-upload"
            className="btn-primary w-full mb-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            {t('fotos.toevoegen')}
          </label>
        </>
      ) : (
        <div className="caroo-card mb-4 space-y-3">
          {voorvertoning && (
            <div className="relative w-full aspect-video rounded-caroo overflow-hidden bg-gray-100">
              <img src={voorvertoning} alt={t('fotos.voorvertoning')} className="w-full h-full object-cover" />
            </div>
          )}
          <input
            type="text"
            value={beschrijving}
            onChange={e => setBeschrijving(e.target.value)}
            className="input-field"
            placeholder={t('fotos.bijschrift')}
          />
          <div className="flex gap-2">
            <button onClick={annuleer} className="btn-secondary flex-1">{t('algemeen.annuleren')}</button>
            <button onClick={uploadFoto} disabled={uploaden} className="btn-primary flex-1">
              {uploaden ? t('fotos.uploaden') : t('fotos.plaatsen')}
            </button>
          </div>
        </div>
      )}

      {/* Fotogalerij */}
      {fotos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">🖼️</p>
          <p className="text-gray-600">{t('fotos.geen')}</p>
          <p className="text-sm text-gray-600 mt-1">{t('fotos.eerste')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {fotos.map(foto => (
            <button
              key={foto.id}
              onClick={() => setGroteFoto(foto)}
              className="relative aspect-square rounded-caroo overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
            >
              {foto.url && (
                <img
                  src={foto.url}
                  alt={foto.onderschrift || t('oudere.fotos.foto')}
                  className="w-full h-full object-cover"
                />
              )}
              {foto.onderschrift && (
                <div className="absolute bottom-0 inset-x-0 bg-black/40 px-2 py-1">
                  <p className="text-white text-xs truncate">{foto.onderschrift}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Grote foto modal */}
      {groteFoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4"
          onClick={sluitGroot}
        >
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            {groteFoto.url && (
              <img
                src={groteFoto.url}
                alt={groteFoto.onderschrift || t('oudere.fotos.foto')}
                className="w-full rounded-caroo object-contain max-h-[70vh]"
              />
            )}
            {(groteFoto.onderschrift || groteFoto.users?.naam || groteFoto.auteur_naam) && (
              <div className="bg-white rounded-b-caroo px-4 py-3">
                {groteFoto.onderschrift && (
                  <p className="text-caroo-donker font-medium">{groteFoto.onderschrift}</p>
                )}
                {(groteFoto.users?.naam || groteFoto.auteur_naam) && (
                  <p className="text-sm text-gray-600">
                    {t('fotos.geplaatstDoor', { naam: groteFoto.users?.naam || groteFoto.auteur_naam || '' })} ·{' '}
                    {datum(groteFoto.aangemaakt_op, { day: 'numeric', month: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}
            {(groteFoto.uploader_id === mijnId || isBeheerder) && (
              <div className="mt-3">
                {!bevestigVerwijderen ? (
                  <button onClick={() => setBevestigVerwijderen(true)} className="w-full text-sm text-white underline py-2">
                    {t('fotos.verwijderen')}
                  </button>
                ) : (
                  <div className="bg-white rounded-caroo p-3 space-y-2">
                    <p className="text-sm text-caroo-donker">{t('fotos.zeker')}</p>
                    {verwijderFout && <p className="text-sm text-red-600">{verwijderFout}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => setBevestigVerwijderen(false)} className="btn-secondary flex-1">{t('thuis.tochNiet')}</button>
                      <button onClick={() => verwijder(groteFoto)} className="flex-1 rounded-caroo bg-red-600 text-white font-medium py-2">{t('algemeen.verwijderen')}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={sluitGroot}
              className="mt-3 w-full btn-secondary text-white bg-white/20 border-white/40"
            >
              {t('fotos.sluiten')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
