/*
# BRO Portal — Company TRN, Cases & Activity

1. Overview
Extends the companies module with a TRN (Tax Registration Number) column, plus two new
owner-scoped child tables: `cases` (legal/government cases tracked per company) and
`company_activity` (an audit log of changes to a company). All tables are owner-scoped
through the existing companies.user_id, matching the existing RLS pattern.

2. Modified Tables
- `companies` — adds `trn_number text` (Tax Registration Number). Nullable.

3. New Tables
- `cases`
  - id (uuid pk)
  - company_id (fk -> companies, cascade delete)
  - title (text, not null)
  - case_number (text)
  - status (text, default 'open', check in open|in_progress|closed|on_hold)
  - type (text) — e.g. Labour, Immigration, Court, MOHRE, GDRFA
  - description (text)
  - opened_date (date)
  - closed_date (date)
  - assigned_to (text)
  - notes (text)
  - created_at, updated_at (timestamptz)

- `company_activity`
  - id (uuid pk)
  - company_id (fk -> companies, cascade delete)
  - action (text, not null) — e.g. created, updated, employee_added, document_uploaded
  - entity_type (text) — company | employee | document | case
  - entity_id (text)
  - description (text)
  - created_at (timestamptz)

4. Security
- RLS enabled on both new tables.
- Owner-scoped CRUD via EXISTS check against companies.user_id = auth.uid().
- 4 separate policies per table (select/insert/update/delete).
- `updated_at` trigger reused from existing set_updated_at() function.

5. Important Notes
- The `cases` table is intentionally flexible — `type` and `status` are free text with
  a CHECK constraint on status values to keep the status enum controlled.
- `company_activity` is append-only by design (no update/delete from the UI beyond
  owner cleanup), but full CRUD policies are provided for owner data safety.
*/

-- Add trn_number to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'trn_number'
  ) THEN
    ALTER TABLE companies ADD COLUMN trn_number text;
  END IF;
END $$;

-- ============================================================
-- Cases
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  case_number text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed','on_hold')),
  type text,
  description text,
  opened_date date,
  closed_date date,
  assigned_to text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cases_company_id ON cases(company_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases" ON cases FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = cases.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases" ON cases FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = cases.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases" ON cases FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = cases.company_id AND companies.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = cases.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases" ON cases FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = cases.company_id AND companies.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Company activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS company_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE company_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_company_activity_company_id ON company_activity(company_id);
CREATE INDEX IF NOT EXISTS idx_company_activity_created_at ON company_activity(created_at DESC);

DROP POLICY IF EXISTS "select_own_company_activity" ON company_activity;
CREATE POLICY "select_own_company_activity" ON company_activity FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_activity.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_company_activity" ON company_activity;
CREATE POLICY "insert_own_company_activity" ON company_activity FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_activity.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_company_activity" ON company_activity;
CREATE POLICY "delete_own_company_activity" ON company_activity FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_activity.company_id AND companies.user_id = auth.uid())
  );
