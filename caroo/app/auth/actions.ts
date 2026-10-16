'use server'

import { createClient } from '@/lib/supabase/server'
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
    return { error: error.message }
  }

  redirect(redirectNaar || '/dashboard')
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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function uitloggen() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
