import 'server-only'
import { createSign } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

// Meldingen naar de Android- en iPhone-app via Firebase Cloud Messaging (HTTP v1).
// De sleutel (serviceaccount van Firebase) staat in de afgeschermde tabel 'geheimen',
// nooit in de code: de repository is openbaar.

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

let account: { waarde: ServiceAccount | null; tot: number } | null = null
let token: { waarde: string; tot: number } | null = null

async function laadAccount(): Promise<ServiceAccount | null> {
  if (account && account.tot > Date.now()) return account.waarde
  const { data } = await createServiceClient().from('geheimen').select('waarde').eq('naam', 'firebase_serviceaccount').maybeSingle()
  let waarde: ServiceAccount | null = null
  try { waarde = data?.waarde ? JSON.parse(data.waarde) : null } catch {}
  account = { waarde, tot: Date.now() + 10 * 60_000 }
  return waarde
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url')

async function toegangstoken(a: ServiceAccount) {
  if (token && token.tot > Date.now() + 60_000) return token.waarde
  const nu = Math.floor(Date.now() / 1000)
  const kop = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const inhoud = b64(JSON.stringify({
    iss: a.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: nu, exp: nu + 3600,
  }))
  const handtekening = createSign('RSA-SHA256').update(`${kop}.${inhoud}`).sign(a.private_key).toString('base64url')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${kop}.${inhoud}.${handtekening}` }),
  })
  if (!r.ok) throw new Error(`Firebase-token mislukt: ${r.status}`)
  const j = await r.json()
  token = { waarde: j.access_token, tot: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return token.waarde
}

export async function fcmBeschikbaar() {
  return !!(await laadAccount())
}

/** Stuurt één melding naar één app-toestel. Geeft 'weg' terug als het toestel niet meer bestaat. */
export async function stuurFcm(apparaat: string, m: { titel: string; tekst: string; url: string; tag?: string }): Promise<'ok' | 'weg' | 'fout'> {
  const a = await laadAccount()
  if (!a) return 'fout'
  try {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await toegangstoken(a)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: apparaat,
          notification: { title: m.titel, body: m.tekst },
          data: { url: m.url },
          android: { priority: 'high', ttl: '43200s', notification: { channel_id: 'clanoo', tag: m.tag || undefined } },
          apns: { headers: { 'apns-expiration': String(Math.floor(Date.now() / 1000) + 43200) }, payload: { aps: { sound: 'default', 'thread-id': m.tag || undefined } } },
        },
      }),
    })
    if (r.ok) return 'ok'
    if (r.status === 404 || r.status === 400) {
      const tekst = await r.text()
      if (tekst.includes('UNREGISTERED') || tekst.includes('registration-token-not-registered') || (r.status === 400 && tekst.includes('INVALID_ARGUMENT') && tekst.includes('token'))) return 'weg'
    }
    return 'fout'
  } catch {
    return 'fout'
  }
}
