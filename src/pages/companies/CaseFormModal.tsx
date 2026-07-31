import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Case, CaseStatus } from '@/types';

interface CaseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  caseItem?: Case | null;
}

const empty = {
  title: '',
  case_number: '',
  status: 'open' as CaseStatus,
  type: '',
  description: '',
  opened_date: '',
  closed_date: '',
  assigned_to: '',
  notes: '',
};

const caseTypes = ['Labour', 'Immigration', 'Court', 'MOHRE', 'GDRFA', 'DED', 'Customs', 'Other'];

export function CaseFormModal({ open, onClose, onSaved, companyId, caseItem }: CaseFormModalProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseItem) {
      setForm({
        title: caseItem.title,
        case_number: caseItem.case_number ?? '',
        status: caseItem.status,
        type: caseItem.type ?? '',
        description: caseItem.description ?? '',
        opened_date: caseItem.opened_date ?? '',
        closed_date: caseItem.closed_date ?? '',
        assigned_to: caseItem.assigned_to ?? '',
        notes: caseItem.notes ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [caseItem, open]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast('Title is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      company_id: companyId,
      opened_date: form.opened_date || null,
      closed_date: form.closed_date || null,
    };
    let error;
    if (caseItem) {
      ({ error } = await supabase.from('cases').update(payload).eq('id', caseItem.id));
    } else {
      ({ error } = await supabase.from('cases').insert(payload));
    }
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(caseItem ? 'Case updated' : 'Case created', 'success');
      onSaved();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={caseItem ? t('case.edit') : t('case.add')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} loading={saving}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label={t('case.caseTitle')} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <Input label={t('case.number')} value={form.case_number} onChange={(e) => set('case_number', e.target.value)} />
        <Select label={t('case.status')} value={form.status} onChange={(e) => set('status', e.target.value)}>
          <option value="open">{t('case.open')}</option>
          <option value="in_progress">{t('case.in_progress')}</option>
          <option value="closed">{t('case.closed')}</option>
          <option value="on_hold">{t('case.on_hold')}</option>
        </Select>
        <Select label={t('case.type')} value={form.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Select type…</option>
          {caseTypes.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
        </Select>
        <Input label={t('case.assignedTo')} value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} />
        <Input type="date" label={t('case.openedDate')} value={form.opened_date} onChange={(e) => set('opened_date', e.target.value)} />
        <Input type="date" label={t('case.closedDate')} value={form.closed_date} onChange={(e) => set('closed_date', e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea label={t('case.description')} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label={t('common.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
