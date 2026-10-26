'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getT } from '@/lib/i18n/server'

export async function registreer(formData: FormData) {
  const supabase = createClient()
  const { t, taal } = await getT()

  const email = formData.get('email') as string
  const wachtwoord = formData.get('wachtwoord') as string
  const naam = formData.get('naam') as string
  const redirectNaar = formData.get('redirectNaar') as string | null

  if (!email || !wachtwoord || !naam) {
    return { error: t('auth.vulAlles') }
  }

  if (wachtwoord.length < 8) {
    return { error: t('auth.wachtwoordKort') }
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
      data: { naam, taal, ...(tokenMatch ? { uitnodiging_token: tokenMatch[1] } : {}) },
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
    return { error: t('auth.bestaatAl') }
  }

  redirect('/registreer/bevestig')
}

export async function inloggen(formData: FormData) {
  const supabase = createClient()
  const { t } = await getT()

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
        error: t('auth.nietBevestigd'),
        onbevestigd: true,
      }
    }
    if (error.code === 'invalid_credentials' || /invalid login/i.test(error.message)) {
      return { error: t('auth.klopNiet') }
    }
    return { error: error.message }
  }

  redirect(redirectNaar || '/dashboard')
}

export async function stuurBevestigingOpnieuw(email: string, redirectNaar?: string | null) {
  const supabase = createClient()
  const { t } = await getT()
  const next = redirectNaar || '/dashboard'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!email) return { error: t('auth.vulEerstEmail') }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    if (/rate limit|security purposes|seconds/i.test(error.message)) {
      return { error: t('auth.netGestuurdMail') }
    }
    return { error: error.message }
  }

  return { success: true }
}

export async function magicLink(formData: FormData) {
  const supabase = createClient()
  const { t, taal } = await getT()

  const email = formData.get('email') as string

  if (!email) {
    return { error: t('auth.vulEmail') }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { taal },
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
  const { t, taal } = await getT()
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return { error: t('auth.uitnodigingOngeldig') }
  }

  const service = createServiceClient()
  const { data: uitnodiging } = await service
    .from('uitnodigingen')
    .select('email, rol, gebruikt, verloopt_op')
    .eq('token', token)
    .single()

  if (!uitnodiging || uitnodiging.rol !== 'oudere') {
    return { error: t('auth.uitnodigingOngeldig') }
  }
  if (uitnodiging.gebruikt) {
    return { error: t('auth.uitnodigingGebruikt') }
  }
  if (new Date(uitnodiging.verloopt_op) < new Date()) {
    return { error: t('auth.uitnodigingVerlopen') }
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
        taal,
      },
      emailRedirectTo: `${baseUrl}/auth/callback?next=%2Fdashboard`,
    },
  })

  if (error) {
    if (/rate limit|security purposes|seconds/i.test(error.message)) {
      return { error: t('auth.netGestuurdLink') }
    }
    return { error: t('auth.versturenMislukt') }
  }

  return { success: true, email: maskeerEmail(uitnodiging.email) }
}

export async function uitloggen() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
