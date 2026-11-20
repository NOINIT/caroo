-- 035: uit de security-audit (CL-16, CL-17).

-- CL-17: reageren op een bezoekverzoek gaat alleen nog via de server (lib/acties/bezoek.ts).
DROP POLICY IF EXISTS "bezoek_reageren" ON public.bezoekverzoeken;

-- CL-16: hooguit 50 foto's per groep per dag, zodat niemand de opslag kan volpompen.
CREATE OR REPLACE FUNCTION public.fotos_vandaag(p_groep TEXT)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, storage
AS $$
  SELECT count(*)::int FROM storage.objects
  WHERE bucket_id = 'fotos'
    AND (storage.foldername(name))[1] = p_groep
    AND created_at > now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.fotos_vandaag(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fotos_vandaag(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS "Groepsleden mogen fotos uploaden" ON storage.objects;
CREATE POLICY "Groepsleden mogen fotos uploaden"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fotos'
  AND EXISTS (
    SELECT 1 FROM public.groepsleden gl
    WHERE gl.groep_id::text = (storage.foldername(name))[1]
      AND gl.user_id = auth.uid()
  )
  AND public.fotos_vandaag((storage.foldername(name))[1]) < 50
);

NOTIFY pgrst, 'reload schema';
