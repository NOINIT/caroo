'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rondInlogAf, veiligPad } from '@/lib/inlog-afronden'
import type { EmailOtpType } from '@supabase/supabase-js'

const TOEGESTANE_TYPES: EmailOtpType[] = ['signup', 'magiclink', 'email', 'invite', 'recovery', 'email_change']

export async function bevestigInlog(formData: FormData) {
  const tokenHash = String(formData.get('token_hash') || '')
  const type = String(formData.get('type') || '') as EmailOtpType
  const next = veiligPad(String(formData.get('next') || ''))

  if (!tokenHash || !TOEGESTANE_TYPES.includes(type)) {
    return { error: 'Deze link is niet geldig.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error || !data.user) {
    // Link al gebruikt? Als deze browser al is ingelogd, gewoon doorgaan.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const pad = await rondInlogAf(user, next)
      redirect(pad)
    }
    return { error: 'Deze link is al gebruikt of verlopen. Vraag hieronder een nieuwe aan.' }
  }

  const pad = await rondInlogAf(data.user, next)
  redirect(pad)
}
