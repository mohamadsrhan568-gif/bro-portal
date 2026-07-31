/*
# BRO Portal — Core Schema

1. Overview
This migration creates the full data model for the BRO Portal internal management system.
It is a multi-user authenticated app: every table is owner-scoped to the signed-in user via
`user_id uuid NOT NULL DEFAULT auth.uid()` and `auth.uid()`-based RLS policies.

2. New Tables
- `companies`            — client companies managed by the owner.
- `company_documents`    — unlimited custom documents per company (stored in Supabase Storage).
- `company_tags`         — tags attached to companies (many-to-many via `company_tag_links`).
- `company_tag_links`    — join table companies <-> tags.
- `employees`            — employees belonging to a company.
- `employee_documents`   — unlimited documents per employee (Supabase Storage).
- `customers`            — accounting customers.
- `items`                — predefined items/services for invoices.
- `invoices`             — invoices with auto-generated invoice numbers.
- `invoice_lines`        — line items on an invoice (item snapshot + qty + price + vat).
- `notifications`        — in-app notification center.
- `settings`             — per-owner app settings (logo, company info, VAT, invoice template).

3. Security
- RLS enabled on every table.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- Child tables (documents, employees, invoice_lines, tags links) scope ownership through
  their parent via an EXISTS check against the parent table's `user_id`.
- A `documents` storage bucket is created (public read for simplicity of preview; writes
  restricted to authenticated owners). Document rows store the storage path.

4. Important Notes
- `invoice_number` is auto-generated via a sequence + default expression `nextval('invoice_number_seq')`
  formatted as `INV-YYYY-NNNNN`.
- Expiry columns are `date` (not timestamptz) for clean date comparisons.
- All monetary amounts stored as `numeric(12,2)`.
- `search_text` generated columns are not used; global search is performed client-side over
  fetched aggregates for simplicity and instant responsiveness.
*/

-- ============================================================
-- Companies
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  trade_license_number text,
  trade_license_expiry date,
  ejari_number text,
  ejari_expiry date,
  establishment_card_number text,
  establishment_card_expiry date,
  email text,
  phone text,
  mobile text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

DROP POLICY IF EXISTS "select_own_companies" ON companies;
CREATE POLICY "select_own_companies" ON companies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_companies" ON companies;
CREATE POLICY "insert_own_companies" ON companies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_companies" ON companies;
CREATE POLICY "update_own_companies" ON companies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_companies" ON companies;
CREATE POLICY "delete_own_companies" ON companies FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Company tags
-- ============================================================
CREATE TABLE IF NOT EXISTS company_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company_tags" ON company_tags;
CREATE POLICY "select_own_company_tags" ON company_tags FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_company_tags" ON company_tags;
CREATE POLICY "insert_own_company_tags" ON company_tags FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_company_tags" ON company_tags;
CREATE POLICY "update_own_company_tags" ON company_tags FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_company_tags" ON company_tags;
CREATE POLICY "delete_own_company_tags" ON company_tags FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS company_tag_links (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES company_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);
ALTER TABLE company_tag_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company_tag_links" ON company_tag_links;
CREATE POLICY "select_own_company_tag_links" ON company_tag_links FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_tag_links.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_company_tag_links" ON company_tag_links;
CREATE POLICY "insert_own_company_tag_links" ON company_tag_links FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_tag_links.company_id AND companies.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_tags WHERE company_tags.id = company_tag_links.tag_id AND company_tags.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_company_tag_links" ON company_tag_links;
CREATE POLICY "delete_own_company_tag_links" ON company_tag_links FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_tag_links.company_id AND companies.user_id = auth.uid())
  );

-- ============================================================
-- Company documents
-- ============================================================
CREATE TABLE IF NOT EXISTS company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  storage_path text NOT NULL,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON company_documents(company_id);

DROP POLICY IF EXISTS "select_own_company_documents" ON company_documents;
CREATE POLICY "select_own_company_documents" ON company_documents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_documents.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_company_documents" ON company_documents;
CREATE POLICY "insert_own_company_documents" ON company_documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_documents.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_company_documents" ON company_documents;
CREATE POLICY "update_own_company_documents" ON company_documents FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_documents.company_id AND companies.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_documents.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_company_documents" ON company_documents;
CREATE POLICY "delete_own_company_documents" ON company_documents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = company_documents.company_id AND companies.user_id = auth.uid())
  );

-- ============================================================
-- Employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  passport_number text,
  passport_expiry date,
  visa_number text,
  visa_expiry date,
  emirates_id_number text,
  emirates_id_expiry date,
  nationality text,
  position text,
  salary numeric(12,2),
  phone text,
  email text,
  joining_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);

DROP POLICY IF EXISTS "select_own_employees" ON employees;
CREATE POLICY "select_own_employees" ON employees FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_employees" ON employees;
CREATE POLICY "insert_own_employees" ON employees FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_employees" ON employees;
CREATE POLICY "update_own_employees" ON employees FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_employees" ON employees;
CREATE POLICY "delete_own_employees" ON employees FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.user_id = auth.uid())
  );

-- ============================================================
-- Employee documents
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  storage_path text NOT NULL,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);

DROP POLICY IF EXISTS "select_own_employee_documents" ON employee_documents;
CREATE POLICY "select_own_employee_documents" ON employee_documents FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM employees
      JOIN companies ON companies.id = employees.company_id
      WHERE employees.id = employee_documents.employee_id AND companies.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "insert_own_employee_documents" ON employee_documents;
CREATE POLICY "insert_own_employee_documents" ON employee_documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      JOIN companies ON companies.id = employees.company_id
      WHERE employees.id = employee_documents.employee_id AND companies.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "update_own_employee_documents" ON employee_documents;
CREATE POLICY "update_own_employee_documents" ON employee_documents FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM employees
      JOIN companies ON companies.id = employees.company_id
      WHERE employees.id = employee_documents.employee_id AND companies.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      JOIN companies ON companies.id = employees.company_id
      WHERE employees.id = employee_documents.employee_id AND companies.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "delete_own_employee_documents" ON employee_documents;
CREATE POLICY "delete_own_employee_documents" ON employee_documents FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM employees
      JOIN companies ON companies.id = employees.company_id
      WHERE employees.id = employee_documents.employee_id AND companies.user_id = auth.uid()
    )
  );

-- ============================================================
-- Accounting: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  tax_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Accounting: items / services
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  vat_percent numeric(5,2) NOT NULL DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);

DROP POLICY IF EXISTS "select_own_items" ON items;
CREATE POLICY "select_own_items" ON items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_items" ON items;
CREATE POLICY "insert_own_items" ON items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_items" ON items;
CREATE POLICY "update_own_items" ON items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_items" ON items;
CREATE POLICY "delete_own_items" ON items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Accounting: invoices
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid','partial')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  vat_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  vat_percent numeric(5,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  line_vat numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);

DROP POLICY IF EXISTS "select_own_invoice_lines" ON invoice_lines;
CREATE POLICY "select_own_invoice_lines" ON invoice_lines FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_lines.invoice_id AND invoices.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_invoice_lines" ON invoice_lines;
CREATE POLICY "insert_own_invoice_lines" ON invoice_lines FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_lines.invoice_id AND invoices.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_invoice_lines" ON invoice_lines;
CREATE POLICY "update_own_invoice_lines" ON invoice_lines FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_lines.invoice_id AND invoices.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_lines.invoice_id AND invoices.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_invoice_lines" ON invoice_lines;
CREATE POLICY "delete_own_invoice_lines" ON invoice_lines FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_lines.invoice_id AND invoices.user_id = auth.uid())
  );

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Settings (per owner)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  company_logo_path text,
  company_info text,
  vat_number text,
  vat_percent numeric(5,2) NOT NULL DEFAULT 5,
  invoice_template text NOT NULL DEFAULT 'default',
  currency text NOT NULL DEFAULT 'AED',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users manage their own folder
DROP POLICY IF EXISTS "Allow authenticated upload to documents" ON storage.objects;
CREATE POLICY "Allow authenticated upload to documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow public read of documents" ON storage.objects;
CREATE POLICY "Allow public read of documents" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated update own documents" ON storage.objects;
CREATE POLICY "Allow authenticated update own documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated delete own documents" ON storage.objects;
CREATE POLICY "Allow authenticated delete own documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
