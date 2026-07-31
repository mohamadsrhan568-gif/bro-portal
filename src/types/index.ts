export type InvoiceStatus = 'paid' | 'unpaid' | 'partial';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  trade_license_number: string | null;
  trade_license_expiry: string | null;
  ejari_number: string | null;
  ejari_expiry: string | null;
  establishment_card_number: string | null;
  establishment_card_expiry: string | null;
  trn_number: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CaseStatus = 'open' | 'in_progress' | 'closed' | 'on_hold';

export interface Case {
  id: string;
  company_id: string;
  title: string;
  case_number: string | null;
  status: CaseStatus;
  type: string | null;
  description: string | null;
  opened_date: string | null;
  closed_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyActivity {
  id: string;
  company_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  name: string;
  type: string | null;
  storage_path: string;
  expiry_date: string | null;
  created_at: string;
}

export interface CompanyTag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  full_name: string;
  passport_number: string | null;
  passport_expiry: string | null;
  visa_number: string | null;
  visa_expiry: string | null;
  emirates_id_number: string | null;
  emirates_id_expiry: string | null;
  nationality: string | null;
  position: string | null;
  salary: number | null;
  phone: string | null;
  email: string | null;
  joining_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  type: string | null;
  storage_path: string;
  expiry_date: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number;
  vat_percent: number;
  category: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subtotal: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  created_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  vat_percent: number;
  line_total: number;
  line_vat: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Settings {
  user_id: string;
  company_name: string | null;
  company_logo_path: string | null;
  company_info: string | null;
  vat_number: string | null;
  vat_percent: number;
  invoice_template: string;
  currency: string;
  updated_at: string;
}

export interface CompanyWithTags extends Company {
  tags?: CompanyTag[];
  employee_count?: number;
}

export interface InvoiceWithRelations extends Invoice {
  customer?: Customer | null;
  invoice_lines?: InvoiceLine[];
}
