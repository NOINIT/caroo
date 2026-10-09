'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface Foto {
  id: string
  opslag_pad: string
  beschrijving: string | null
  aangemaakt_op: string
  url: string
  users: { naam: string } | null
}

interface Props {
  groepId: string
  fotos: Foto[]
}

export function FotosClient({ groepId, fotos: initieel }: Props) {
  const [fotos, setFotos] = useState(initieel)
  const [uploaden, setUploaden] = useState(false)
  const [beschrijving, setBeschrijving] = useState('')
  const [geselecteerd, setGeselecteerd] = useState<File | null>(null)
  const [voorvertoning, setVoorvertoning] = useState<string | null>(null)
  const [groteFoto, setGroteFoto] = useState<Foto | null>(null)
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
      beschrijving: beschrijving || null,
      geupload_door: user.id,
    }).select('id, opslag_pad, beschrijving, aangemaakt_op, users (naam)').single()

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
            📷 Foto toevoegen
          </label>
        </>
      ) : (
        <div className="caroo-card mb-4 space-y-3">
          {voorvertoning && (
            <div className="relative w-full aspect-video rounded-caroo overflow-hidden bg-gray-100">
              <img src={voorvertoning} alt="Voorvertoning" className="w-full h-full object-cover" />
            </div>
          )}
          <input
            type="text"
            value={beschrijving}
            onChange={e => setBeschrijving(e.target.value)}
            className="input-field"
            placeholder="Bijschrift (optioneel)"
          />
          <div className="flex gap-2">
            <button onClick={annuleer} className="btn-secondary flex-1">Annuleren</button>
            <button onClick={uploadFoto} disabled={uploaden} className="btn-primary flex-1">
              {uploaden ? 'Uploaden...' : 'Plaatsen'}
            </button>
          </div>
        </div>
      )}

      {/* Fotogalerij */}
      {fotos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">🖼️</p>
          <p className="text-gray-500">Nog geen foto's gedeeld</p>
          <p className="text-sm text-gray-400 mt-1">Voeg de eerste foto toe!</p>
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
                  alt={foto.beschrijving || 'Foto'}
                  className="w-full h-full object-cover"
                />
              )}
              {foto.beschrijving && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
                  <p className="text-white text-xs truncate">{foto.beschrijving}</p>
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
          onClick={() => setGroteFoto(null)}
        >
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            {groteFoto.url && (
              <img
                src={groteFoto.url}
                alt={groteFoto.beschrijving || 'Foto'}
                className="w-full rounded-caroo object-contain max-h-[70vh]"
              />
            )}
            {(groteFoto.beschrijving || groteFoto.users?.naam) && (
              <div className="bg-white rounded-b-caroo px-4 py-3">
                {groteFoto.beschrijving && (
                  <p className="text-caroo-donker font-medium">{groteFoto.beschrijving}</p>
                )}
                {groteFoto.users?.naam && (
                  <p className="text-sm text-gray-500">
                    Geplaatst door {groteFoto.users.naam} ·{' '}
                    {new Date(groteFoto.aangemaakt_op).toLocaleDateString('nl-NL')}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => setGroteFoto(null)}
              className="mt-4 w-full btn-secondary text-white bg-white/20 border-white/40"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
