/*
# BRO Portal — Invoice number generation helper

1. New Functions
- `next_invoice_number()` — returns the next invoice number string in the form
  `INV-YYYY-NNNNN` using the `invoice_number_seq` sequence. Safe to call from the
  client via an RPC to generate a unique number before insert.

2. Security
- SECURITY DEFINER so the sequence can be read (sequences are not covered by RLS).
- EXECUTE limited to authenticated role.
*/

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
  yr int;
BEGIN
  n := nextval('invoice_number_seq');
  yr := extract(year from now())::int;
  RETURN 'INV-' || yr || '-' || lpad(n::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION next_invoice_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_invoice_number() TO authenticated;
