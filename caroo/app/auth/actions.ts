'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function registreer(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const wachtwoord = formData.get('wachtwoord') as string
  const naam = formData.get('naam') as string

  if (!email || !wachtwoord || !naam) {
    return { error: 'Vul alle velden in.' }
  }

  if (wachtwoord.length < 8) {
    return { error: 'Wachtwoord moet minimaal 8 tekens zijn.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: wachtwoord,
    options: {
      data: { naam },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Profiel aanmaken in users tabel
    await supabase.from('users').insert({
      id: data.user.id,
      email,
      naam,
      rol: 'mantelzorger',
    })
  }

  redirect('/registreer/bevestig')
}

export async function inloggen(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const wachtwoord = formData.get('wachtwoord') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: wachtwoord,
  })

  if (error) {
    return { error: 'E-mailadres of wachtwoord klopt niet.' }
  }

  redirect('/dashboard')
}

export async function magicLink(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Vul een e-mailadres in.' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
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
  redirect('/')
}
