import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { InstellingenFormulier } from '@/components/instellingen/InstellingenFormulier'
import { uitloggen } from '@/app/auth/actions'

export default async function InstellingenPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiel } = await supabase
    .from('users')
    .select('naam, lettergrootte, geluid, melding_email')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-gray-500">←</Link>
          <h1 className="font-bold text-caroo-donker">Instellingen</h1>
        </div>
      </header>
      <div className="px-4 py-6">
        <InstellingenFormulier
          naam={profiel?.naam || ''}
          email={user.email || ''}
          lettergrootte={profiel?.lettergrootte || 'normaal'}
          geluid={profiel?.geluid ?? true}
          meldingEmail={profiel?.melding_email ?? true}
        />
        <form action={uitloggen} className="mt-8">
          <button type="submit" className="w-full py-3 text-sm text-red-500 border border-red-200 rounded-caroo hover:bg-red-50">
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  )
}
