import { useState } from 'react';
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomers } from '@/hooks/useData';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initials } from '@/lib/utils';
import type { Customer } from '@/types';

const empty = { name: '', email: '', phone: '', address: '', tax_number: '', notes: '' };

export function CustomersPage() {
  const { customers, loading, refresh } = useCustomers();
  const { t } = useI18n();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const filtered = customers.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [c.name, c.email, c.phone, c.tax_number].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
  });

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', tax_number: c.tax_number ?? '', notes: c.notes ?? '' }); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    setSaving(true);
    let error;
    if (editing) ({ error } = await supabase.from('customers').update(form).eq('id', editing.id));
    else ({ error } = await supabase.from('customers').insert(form));
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Customer updated' : 'Customer added', 'success'); refresh(); setModal(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('customers').delete().eq('id', deleting.id);
    if (error) toast(error.message, 'error');
    else { toast('Customer deleted', 'success'); refresh(); }
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader title={t('cust.title')} description={`${customers.length} customers`}
        action={<Button onClick={openNew}><Plus className="h-4 w-4" /> {t('cust.add')}</Button>} />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <Input placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Users className="h-7 w-7" />} title="No customers" description="Add your first customer." action={<Button onClick={openNew}><Plus className="h-4 w-4" /> {t('cust.add')}</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold flex-shrink-0">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-ink-500 truncate">{c.email || c.phone || '—'}</p>
                  {c.tax_number && <Badge className="mt-1 bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">TRN: {c.tax_number}</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 hover:text-brand-600 dark:hover:text-brand-400"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : t('cust.add')} size="md"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>{t('common.cancel')}</Button><Button onClick={save} loading={saving}>{t('common.save')}</Button></>}>
        <div className="space-y-3">
          <Input label={t('common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="email" label={t('company.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t('company.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Tax Number (TRN)" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          <Textarea label={t('company.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Textarea label={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete customer" message={<>Delete <strong>{deleting?.name}</strong>?</>} danger confirmLabel={t('common.delete')} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
