/*
# BRO Portal — Security hardening

1. Fixes
- `set_updated_at()` trigger function: set a fixed `search_path` to `public` to remove the mutable search_path warning.
- Storage `documents` bucket: replace the broad SELECT policy with one scoped to authenticated users only (removes public listing while keeping public URL access for uploaded files via the public bucket).
- `next_invoice_number()`: already restricted to authenticated; keep as is. The advisor warns it is callable by authenticated — that is intentional for invoice creation.

2. Security changes
- Storage SELECT policy narrowed from `anon, authenticated` to `authenticated` only.
*/

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Allow public read of documents" ON storage.objects;
CREATE POLICY "Allow authenticated read of documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');
