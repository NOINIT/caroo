'use client'

/**
 * Tijd kiezen in 24 uur (13:30), los van de taalinstelling van de telefoon.
 * De ingebouwde tijdkiezer van Android en iOS toont soms AM/PM.
 */
const UREN = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTEN = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

export function TijdKiezer({ value, onChange, label, verplicht }: {
  value: string; onChange: (tijd: string) => void; label?: string; verplicht?: boolean
}) {
  const [u, m] = value ? value.split(':') : ['', '']
  // Een minuut die niet op 5 valt (oude gegevens) toch kunnen tonen
  const minuten = m && !MINUTEN.includes(m) ? [...MINUTEN, m].sort() : MINUTEN
  const zet = (uur: string, min: string) => onChange(uur ? `${uur}:${min || '00'}` : '')
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <select className="input-field text-sm px-2" value={u} required={verplicht} onChange={e => zet(e.target.value, m)} aria-label={label ? `${label} uur` : undefined}>
        <option value="">--</option>
        {UREN.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="font-bold">:</span>
      <select className="input-field text-sm px-2" value={u ? (m || '00') : ''} disabled={!u} onChange={e => zet(u, e.target.value)} aria-label={label ? `${label} minuten` : undefined}>
        {!u && <option value="">--</option>}
        {minuten.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  )
}

/** Datum plus tijd in 24 uur, als 'YYYY-MM-DDTHH:MM' (zelfde vorm als datetime-local). */
export function DatumTijdKiezer({ value, onChange, label, verplicht }: {
  value: string; onChange: (waarde: string) => void; label?: string; verplicht?: boolean
}) {
  const [datum, tijd] = value ? value.split('T') : ['', '']
  return (
    <div className="space-y-1">
      <input type="date" className="input-field text-sm" value={datum} required={verplicht} aria-label={label}
        onChange={e => onChange(e.target.value ? `${e.target.value}T${tijd || '09:00'}` : '')} />
      <TijdKiezer value={tijd || ''} label={label} verplicht={verplicht}
        onChange={t => onChange(datum ? `${datum}T${t || '09:00'}` : '')} />
    </div>
  )
}
