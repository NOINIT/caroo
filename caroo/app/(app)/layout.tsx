import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VoorkeurenToepasser } from '@/components/VoorkeurenToepasser'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: voorkeuren } = await supabase
    .from('users')
    .select('lettergrootte, geluid')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gray-50">
      <VoorkeurenToepasser
        lettergrootte={voorkeuren?.lettergrootte || 'normaal'}
        geluid={voorkeuren?.geluid ?? true}
      />
      {children}
    </div>
  )
}
