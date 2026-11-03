import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/** Toestemming voor gezondheidsgegevens vastleggen. Alleen aanroepen nadat de rechten al gecontroleerd zijn. */
export async function legToestemmingVast(groepId: string, doorId: string) {
  await createServiceClient().from('zorggroepen')
    .update({ toestemming_gezondheid_op: new Date().toISOString(), toestemming_gezondheid_door: doorId })
    .eq('id', groepId)
}
