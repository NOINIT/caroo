import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { data: bestaand } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!bestaand) {
        const naam = data.user.user_metadata?.naam
          || data.user.email?.split('@')[0]
          || 'Nieuw lid'

        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          naam,
          rol: 'mantelzorger',
        })
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_ongeldig`)
}