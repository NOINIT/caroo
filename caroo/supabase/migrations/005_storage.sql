-- Storage bucket voor foto's
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos',
  'fotos',
  false,
  10485760, -- 10MB max per foto
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: alleen groepsleden mogen uploaden en lezen
CREATE POLICY "Groepsleden mogen fotos uploaden"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fotos'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM groepsleden gl
      WHERE gl.groep_id::text = (storage.foldername(name))[1]
      AND gl.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Groepsleden mogen fotos lezen"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fotos'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM groepsleden gl
      WHERE gl.groep_id::text = (storage.foldername(name))[1]
      AND gl.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Groepsleden mogen eigen fotos verwijderen"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'fotos'
  AND (
    SELECT EXISTS (
      SELECT 1 FROM groepsleden gl
      WHERE gl.groep_id::text = (storage.foldername(name))[1]
      AND gl.user_id = auth.uid()
    )
  )
);
