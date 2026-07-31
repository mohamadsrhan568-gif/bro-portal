import { useState } from 'react';
import { Plus, Search, Package, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useItems } from '@/hooks/useData';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import type { Item } from '@/types';

const empty = { name: '', description: '', price: '', vat_percent: '5', category: '' };

export function ItemsPage() {
  const { items, loading, refresh } = useItems();
  const { t } = useI18n();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const filtered = items.filter((it) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [it.name, it.category, it.description].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
  });

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (it: Item) => {
    setEditing(it);
    setForm({ name: it.name, description: it.description ?? '', price: String(it.price), vat_percent: String(it.vat_percent), category: it.category ?? '' });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) || 0, vat_percent: parseFloat(form.vat_percent) || 0 };
    let error;
    if (editing) ({ error } = await supabase.from('items').update(payload).eq('id', editing.id));
    else ({ error } = await supabase.from('items').insert(payload));
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Item updated' : 'Item added', 'success'); refresh(); setModal(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('items').delete().eq('id', deleting.id);
    if (error) toast(error.message, 'error');
    else { toast('Item deleted', 'success'); refresh(); }
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader title={t('items.title')} description={`${items.length} items & services`}
        action={<Button onClick={openNew}><Plus className="h-4 w-4" /> {t('items.add')}</Button>} />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <Input placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Package className="h-7 w-7" />} title="No items" description="Create predefined items or services to use in invoices." action={<Button onClick={openNew}><Plus className="h-4 w-4" /> {t('items.add')}</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <Card key={it.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{it.name}</p>
                  {it.category && <Badge className="mt-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{it.category}</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(it)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 hover:text-brand-600 dark:hover:text-brand-400"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleting(it)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {it.description && <p className="mt-2 text-sm text-ink-500 line-clamp-2">{it.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold">{formatCurrency(it.price)}</span>
                <span className="text-xs text-ink-500">VAT {it.vat_percent}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Item' : t('items.add')} size="md"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>{t('common.cancel')}</Button><Button onClick={save} loading={saving}>{t('common.save')}</Button></>}>
        <div className="space-y-3">
          <Input label={t('common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input type="number" label={t('items.price')} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input type="number" label={t('items.vat')} value={form.vat_percent} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} />
            <Input label={t('items.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete item" message={<>Delete <strong>{deleting?.name}</strong>?</>} danger confirmLabel={t('common.delete')} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
