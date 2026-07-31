import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Company, Employee, Customer, Item, CompanyDocument, EmployeeDocument } from '@/types';

export interface SearchResult {
  id: string;
  type: 'company' | 'employee' | 'customer' | 'item' | 'document';
  title: string;
  subtitle: string;
  link: string;
}

interface SearchIndex {
  companies: Company[];
  employees: (Employee & { company?: { id: string; name: string } })[];
  customers: Customer[];
  items: Item[];
  companyDocs: (CompanyDocument & { company?: { id: string; name: string } })[];
  employeeDocs: (EmployeeDocument & { employee?: { id: string; full_name: string; company_id: string } })[];
}

export function useGlobalSearch() {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [c, e, cu, it, cd, ed] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('employees').select('*, company:companies(id,name)').order('full_name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('items').select('*').order('name'),
        supabase.from('company_documents').select('*, company:companies(id,name)').order('name'),
        supabase.from('employee_documents').select('*, employee:employees(id,full_name,company_id)').order('name'),
      ]);
      if (!active) return;
      setIndex({
        companies: (c.data as Company[]) ?? [],
        employees: (e.data as unknown as SearchIndex['employees']) ?? [],
        customers: (cu.data as Customer[]) ?? [],
        items: (it.data as Item[]) ?? [],
        companyDocs: (cd.data as unknown as SearchIndex['companyDocs']) ?? [],
        employeeDocs: (ed.data as unknown as SearchIndex['employeeDocs']) ?? [],
      });
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const search = useMemo(() => {
    return (query: string): SearchResult[] => {
      if (!index || !query.trim()) return [];
      const q = query.toLowerCase().trim();
      const results: SearchResult[] = [];

      for (const c of index.companies) {
        const hay = [c.name, c.trade_license_number, c.ejari_number, c.establishment_card_number, c.email, c.phone, c.mobile, c.address]
          .filter(Boolean).join(' ').toLowerCase();
        if (hay.includes(q)) {
          results.push({ id: c.id, type: 'company', title: c.name, subtitle: 'Company', link: `/companies/${c.id}` });
        }
      }
      for (const e of index.employees) {
        const hay = [e.full_name, e.passport_number, e.visa_number, e.emirates_id_number, e.phone, e.email, e.nationality, e.position]
          .filter(Boolean).join(' ').toLowerCase();
        if (hay.includes(q)) {
          results.push({
            id: e.id,
            type: 'employee',
            title: e.full_name,
            subtitle: `Employee · ${e.company?.name ?? ''}`,
            link: `/companies/${e.company_id}?employee=${e.id}`,
          });
        }
      }
      for (const cu of index.customers) {
        const hay = [cu.name, cu.email, cu.phone, cu.tax_number].filter(Boolean).join(' ').toLowerCase();
        if (hay.includes(q)) {
          results.push({ id: cu.id, type: 'customer', title: cu.name, subtitle: 'Customer', link: `/accounting/customers` });
        }
      }
      for (const it of index.items) {
        if (it.name.toLowerCase().includes(q) || (it.category ?? '').toLowerCase().includes(q)) {
          results.push({ id: it.id, type: 'item', title: it.name, subtitle: `Item · ${it.category ?? ''}`, link: `/accounting/items` });
        }
      }
      const docMatch = (name: string, type: string | null) =>
        name.toLowerCase().includes(q) || (type ?? '').toLowerCase().includes(q);
      for (const d of index.companyDocs) {
        if (docMatch(d.name, d.type)) {
          results.push({
            id: d.id,
            type: 'document',
            title: d.name,
            subtitle: `Document · ${d.company?.name ?? ''}`,
            link: `/companies/${d.company_id}`,
          });
        }
      }
      for (const d of index.employeeDocs) {
        if (docMatch(d.name, d.type)) {
          results.push({
            id: d.id,
            type: 'document',
            title: d.name,
            subtitle: `Document · ${d.employee?.full_name ?? ''}`,
            link: `/companies/${d.employee?.company_id}?employee=${d.employee?.id}`,
          });
        }
      }
      return results.slice(0, 12);
    };
  }, [index]);

  return { search, loaded };
}
