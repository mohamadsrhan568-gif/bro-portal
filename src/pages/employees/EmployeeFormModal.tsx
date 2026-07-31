import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Employee } from '@/types';

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  employee?: Employee | null;
}

const empty = {
  full_name: '',
  passport_number: '',
  passport_expiry: '',
  visa_number: '',
  visa_expiry: '',
  emirates_id_number: '',
  emirates_id_expiry: '',
  nationality: '',
  position: '',
  salary: '',
  phone: '',
  email: '',
  joining_date: '',
  notes: '',
};

export function EmployeeFormModal({ open, onClose, onSaved, companyId, employee }: EmployeeFormModalProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name ?? '',
        passport_number: employee.passport_number ?? '',
        passport_expiry: employee.passport_expiry ?? '',
        visa_number: employee.visa_number ?? '',
        visa_expiry: employee.visa_expiry ?? '',
        emirates_id_number: employee.emirates_id_number ?? '',
        emirates_id_expiry: employee.emirates_id_expiry ?? '',
        nationality: employee.nationality ?? '',
        position: employee.position ?? '',
        salary: employee.salary != null ? String(employee.salary) : '',
        phone: employee.phone ?? '',
        email: employee.email ?? '',
        joining_date: employee.joining_date ?? '',
        notes: employee.notes ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [employee, open]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast('Full name is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      company_id: companyId,
      salary: form.salary ? parseFloat(form.salary) : null,
      passport_expiry: form.passport_expiry || null,
      visa_expiry: form.visa_expiry || null,
      emirates_id_expiry: form.emirates_id_expiry || null,
      joining_date: form.joining_date || null,
    };
    let error;
    if (employee) {
      ({ error } = await supabase.from('employees').update(payload).eq('id', employee.id));
    } else {
      ({ error } = await supabase.from('employees').insert(payload));
    }
    setSaving(false);
    if (error) toast(error.message, 'error');
    else {
      toast(employee ? 'Employee updated' : 'Employee added', 'success');
      onSaved();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? t('employee.edit') : t('employee.add')}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} loading={saving}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label={t('employee.fullName')} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </div>
        <Input label={t('employee.passport')} value={form.passport_number} onChange={(e) => set('passport_number', e.target.value)} />
        <Input type="date" label={t('employee.passportExpiry')} value={form.passport_expiry} onChange={(e) => set('passport_expiry', e.target.value)} />
        <Input label={t('employee.visa')} value={form.visa_number} onChange={(e) => set('visa_number', e.target.value)} />
        <Input type="date" label={t('employee.visaExpiry')} value={form.visa_expiry} onChange={(e) => set('visa_expiry', e.target.value)} />
        <Input label={t('employee.emiratesId')} value={form.emirates_id_number} onChange={(e) => set('emirates_id_number', e.target.value)} />
        <Input type="date" label={t('employee.emiratesIdExpiry')} value={form.emirates_id_expiry} onChange={(e) => set('emirates_id_expiry', e.target.value)} />
        <Input label={t('employee.nationality')} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
        <Input label={t('employee.position')} value={form.position} onChange={(e) => set('position', e.target.value)} />
        <Input type="number" label={t('employee.salary')} value={form.salary} onChange={(e) => set('salary', e.target.value)} />
        <Input type="date" label={t('employee.joiningDate')} value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)} />
        <Input label={t('company.phone')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input type="email" label={t('company.email')} value={form.email} onChange={(e) => set('email', e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea label={t('common.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
