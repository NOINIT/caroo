'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { MetVet } from '@/components/ui/MetVet'
import { rolTekst } from '@/lib/i18n/vertaal'

interface Uitnodiging {
  id: string
  email: string
  rol: string
  gebruikt: boolean
  verloopt_op: string
  aangemaakt_op: string
}

interface Props {
  groepId: string
  groepNaam: string
  uitnodigingen: Uitnodiging[]
}

export function UitnodigingFormulier({ groepId, groepNaam, uitnodigingen: initieel }: Props) {
  const [uitnodigingen, setUitnodigingen] = useState(initieel)
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('mantelzorger')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [link, setLink] = useState('')
  const { t, datum } = useT()

  async function stuurUitnodiging(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')
    setLink('')

    const res = await fetch('/api/uitnodiging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groepId, email, rol }),
    })

    const data = await res.json()

    if (!res.ok) {
      setFout(data.error || t('uitnodigen.misgegaan'))
    } else {
      setLink(data.link)
      // Een nieuwe uitnodiging vervangt een openstaande naar hetzelfde adres
      setUitnodigingen(prev => [data.uitnodiging, ...prev.filter(u => u.email.toLowerCase() !== data.uitnodiging.email.toLowerCase())])
      setEmail('')
    }

    setLaden(false)
  }

  function kopieerLink() {
    navigator.clipboard.writeText(link)
  }

  const isVerlopen = (d: string) => new Date(d) < new Date()
  const openstaand = uitnodigingen.filter(u => !u.gebruikt && !isVerlopen(u.verloopt_op))

  return (
    <div className="px-4 py-4">
      <div className="bg-caroo-groen-licht rounded-caroo p-3 mb-4">
        <p className="text-sm text-caroo-donker">
          <MetVet tekst={t('uitnodigen.intro')} waarde={groepNaam} sleutel="groep" />
        </p>
      </div>

      <form onSubmit={stuurUitnodiging} className="caroo-card mb-4 space-y-3">
        <div>
          <label className="input-label">{t('login.email')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
            placeholder={t('login.voorbeeldEmail')} dir="ltr"
          />
        </div>
        <div>
          <label className="input-label">{t('uitnodigen.rol')}</label>
          <select
            value={rol}
            onChange={e => setRol(e.target.value)}
            className="input-field"
          >
            <option value="mantelzorger">{t('rollen.mantelzorger')}</option>
            <option value="oudere">{t('uitnodigen.hoofdpersoonOptie')}</option>
            <option value="groepsbeheerder">{t('rollen.groepsbeheerder')}</option>
          </select>
        </div>

        {fout && <p className="error-text">{fout}</p>}

        <button type="submit" disabled={laden} className="btn-primary w-full">
          {laden ? t('uitnodigen.bezig') : t('uitnodigen.aanmaken')}
        </button>
      </form>

      {link && (
        <div className="caroo-card mb-4 bg-caroo-groen-licht border border-caroo-groen">
          <p className="text-sm font-medium text-caroo-donker mb-2">{t('uitnodigen.aangemaakt')}</p>
          <p className="text-xs text-gray-600 mb-3">
            {t('uitnodigen.stuurLink')}
          </p>
          <div className="bg-white rounded p-2 text-xs text-gray-700 break-all mb-2 font-mono" dir="ltr">
            {link}
          </div>
          <button onClick={kopieerLink} className="btn-secondary w-full text-sm">
            {t('uitnodigen.kopieer')}
          </button>
          <div className="flex gap-2 mt-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(t('uitnodigen.whatsapp', { groep: groepNaam, link }))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-caroo py-2 text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.528 5.855L0 24l6.302-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.372l-.359-.214-3.722.976.993-3.628-.234-.373A9.818 9.818 0 1112 21.818z"/></svg>
              WhatsApp
            </a>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(t('uitnodigen.mailOnderwerp', { groep: groepNaam }))}&body=${encodeURIComponent(t('uitnodigen.mailTekst', { groep: groepNaam, link }))}`}
              className="flex-1 flex items-center justify-center gap-2 bg-caroo-groen text-white rounded-caroo py-2 text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              {t('uitnodigen.email')}
            </a>
          </div>
        </div>
      )}

      {openstaand.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {t('uitnodigen.wachtOpReactie')}
          </h2>
          <p className="text-xs text-gray-400 mb-2">
            {t('uitnodigen.geaccepteerdBij')}
          </p>
          <div className="space-y-2">
            {openstaand.map(u => (
              <div key={u.id} className="caroo-card flex items-center gap-3">
                <span className="text-lg">📨</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-caroo-donker truncate" dir="ltr">{u.email}</p>
                  <p className="text-xs text-gray-500">
                    {rolTekst(t, u.rol)} · {t('uitnodigen.geldigTot', { datum: datum(u.verloopt_op, { day: 'numeric', month: 'numeric', year: 'numeric' }) })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
