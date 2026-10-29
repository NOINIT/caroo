import { createClient } from '@/lib/supabase/server'
import { heeftRecht } from '@/lib/rechten'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FotosClient } from './FotosClient'
import { getT } from '@/lib/i18n/server'
import { magGebruiken } from '@/lib/opzeggen'

export default async function FotosPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const heeftToegang = await heeftRecht(params.id, ['mantelzorger', 'groepsbeheerder', 'oudere'])
  if (!heeftToegang) redirect('/dashboard')

  const { data: groep } = await supabase
    .from('zorggroepen')
    .select('id, naam, betaald, gestopt_op, aangemaakt_op')
    .eq('id', params.id)
    .single()

  if (!groep || !magGebruiken(groep)) redirect(`/betalen?groep=${params.id}`)

  const { data: fotos } = await supabase
    .from('fotos')
    .select('id, opslag_pad, onderschrift, uploader_id, aangemaakt_op, auteur_naam, users (naam)')
    .eq('groep_id', params.id)
    .order('aangemaakt_op', { ascending: false })

  // Genereer signed URLs voor alle foto's
  const fotosMetUrl = await Promise.all(
    (fotos || []).map(async (foto: any) => {
      const { data } = await supabase.storage
        .from('fotos')
        .createSignedUrl(foto.opslag_pad, 3600)
      return { ...foto, url: data?.signedUrl || '' }
    })
  )

  const { t } = await getT()
  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/groep/${params.id}`} className="text-gray-600 inline-block rtl:rotate-180">←</Link>
          <h1 className="font-bold text-caroo-donker">{t('groep.tegels.fotos')} — {groep.naam}</h1>
        </div>
      </header>
      <FotosClient
        groepId={params.id}
        fotos={fotosMetUrl}
        mijnId={user.id}
        isBeheerder={await heeftRecht(params.id, ['groepsbeheerder'])}
      />
    </div>
  )
}
