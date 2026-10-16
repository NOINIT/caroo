'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function registreer(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const wachtwoord = formData.get('wachtwoord') as string
  const naam = formData.get('naam') as string
  const redirectNaar = formData.get('redirectNaar') as string | null

  if (!email || !wachtwoord || !naam) {
    return { error: 'Vul alle velden in.' }
  }

  if (wachtwoord.length < 8) {
    return { error: 'Wachtwoord moet minimaal 8 tekens zijn.' }
  }

  const next = redirectNaar || '/dashboard'
  const tokenMatch = next.match(/[?&]token=([a-f0-9]+)/)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signUp({
    email,
    password: wachtwoord,
    options: {
      // De uitnodigingstoken gaat mee in het account zelf, zodat hij niet
      // verloren kan gaan in redirects of als de mail in een andere browser opent
      data: { naam, ...(tokenMatch ? { uitnodiging_token: tokenMatch[1] } : {}) },
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Bestaat dit e-mailadres al? Supabase stuurt dan bewust geen mail en geeft
  // een account zonder identities terug. Zeg het eerlijk in plaats van te wachten
  // op een mail die nooit komt.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { error: 'Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.' }
  }

  redirect('/registreer/bevestig')
}

export async function inloggen(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const wachtwoord = formData.get('wachtwoord') as string
  const redirectNaar = formData.get('redirectNaar') as string | null

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: wachtwoord,
  })

  if (error) {
    if (error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
      return {
        error: 'Je e-mailadres is nog niet bevestigd. Klik op de link in de bevestigingsmail, of laat hieronder een nieuwe sturen.',
        onbevestigd: true,
      }
    }
    if (error.code === 'invalid_credentials' || /invalid login/i.test(error.message)) {
      return { error: 'E-mailadres of wachtwoord klopt niet.' }
    }
    return { error: error.message }
  }

  redirect(redirectNaar || '/dashboard')
}

export async function stuurBevestigingOpnieuw(email: string, redirectNaar?: string | null) {
  const supabase = createClient()
  const next = redirectNaar || '/dashboard'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!email) return { error: 'Vul eerst je e-mailadres in.' }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    if (/rate limit|security purposes|seconds/i.test(error.message)) {
      return { error: 'Er is net al een mail gestuurd. Wacht een minuut en probeer het dan opnieuw.' }
    }
    return { error: error.message }
  }

  return { success: true }
}

export async function magicLink(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Vul je e-mailadres in.' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=%2Fdashboard`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/** Maskeer een e-mailadres voor weergave: oma.jansen@gmail.com -> o***@gmail.com */
function maskeerEmail(email: string) {
  const [naam, domein] = email.split('@')
  if (!domein) return '***'
  return `${naam.slice(0, 1)}***@${domein}`
}

/**
 * Inloglink voor een oudere die is uitgenodigd.
 * Veiligheid: de link gaat ALLEEN naar het e-mailadres van de uitnodiging.
 * Wie de uitnodigingslink in handen krijgt, kan dus geen eigen adres invullen.
 */
export async function stuurOudereInloglink(token: string, naam: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return { error: 'Deze uitnodiging is niet geldig.' }
  }

  const service = createServiceClient()
  const { data: uitnodiging } = await service
    .from('uitnodigingen')
    .select('email, rol, gebruikt, verloopt_op')
    .eq('token', token)
    .single()

  if (!uitnodiging || uitnodiging.rol !== 'oudere') {
    return { error: 'Deze uitnodiging is niet geldig.' }
  }
  if (uitnodiging.gebruikt) {
    return { error: 'Deze uitnodiging is al gebruikt. Log in via de inlogpagina.' }
  }
  if (new Date(uitnodiging.verloopt_op) < new Date()) {
    return { error: 'Deze uitnodiging is verlopen. Vraag de familie om een nieuwe.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const supabase = createClient()
  const schoneNaam = (naam || '').trim().slice(0, 60)

  const { error } = await supabase.auth.signInWithOtp({
    email: uitnodiging.email,
    options: {
      shouldCreateUser: true,
      data: {
        ...(schoneNaam ? { naam: schoneNaam } : {}),
        uitnodiging_token: token,
      },
      emailRedirectTo: `${baseUrl}/auth/callback?next=%2Fdashboard`,
    },
  })

  if (error) {
    if (/rate limit|security purposes|seconds/i.test(error.message)) {
      return { error: 'Er is net al een link gestuurd. Wacht een minuut en probeer het dan opnieuw.' }
    }
    return { error: 'Het versturen lukte niet. Probeer het over een paar minuten nog eens.' }
  }

  return { success: true, email: maskeerEmail(uitnodiging.email) }
}

export async function uitloggen() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
