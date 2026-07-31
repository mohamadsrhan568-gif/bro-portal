import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Company } from '@/types';

interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  company?: Company | null;
}

const empty = {
  name: '',
  trade_license_number: '',
  trade_license_expiry: '',
  ejari_number: '',
  ejari_expiry: '',
  establishment_card_number: '',
  establishment_card_expiry: '',
  trn_number: '',
  email: '',
  phone: '',
  mobile: '',
  address: '',
  notes: '',
};

export function CompanyFormModal({ open, onClose, onSaved, company }: CompanyFormModalProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? '',
        trade_license_number: company.trade_license_number ?? '',
        trade_license_expiry: company.trade_license_expiry ?? '',
        ejari_number: company.ejari_number ?? '',
        ejari_expiry: company.ejari_expiry ?? '',
        establishment_card_number: company.establishment_card_number ?? '',
        establishment_card_expiry: company.establishment_card_expiry ?? '',
        trn_number: company.trn_number ?? '',
        email: company.email ?? '',
        phone: company.phone ?? '',
        mobile: company.mobile ?? '',
        address: company.address ?? '',
        notes: company.notes ?? '',
      });
    } else {
      setForm(empty);
    }
  }, [company, open]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Company name is required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      trade_license_expiry: form.trade_license_expiry || null,
      ejari_expiry: form.ejari_expiry || null,
      establishment_card_expiry: form.establishment_card_expiry || null,
    };
    let error;
    if (company) {
      ({ error } = await supabase.from('companies').update(payload).eq('id', company.id));
    } else {
      ({ error } = await supabase.from('companies').insert(payload));
    }
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(company ? 'Company updated' : 'Company created', 'success');
      onSaved();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company ? t('company.edit') : t('company.add')}
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
          <Input label={t('company.name')} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Trading LLC" />
        </div>
        <Input label={t('company.tradeLicense')} value={form.trade_license_number} onChange={(e) => set('trade_license_number', e.target.value)} />
        <Input type="date" label={t('company.tradeLicenseExpiry')} value={form.trade_license_expiry} onChange={(e) => set('trade_license_expiry', e.target.value)} />
        <Input label={t('company.ejari')} value={form.ejari_number} onChange={(e) => set('ejari_number', e.target.value)} />
        <Input type="date" label={t('company.ejariExpiry')} value={form.ejari_expiry} onChange={(e) => set('ejari_expiry', e.target.value)} />
        <Input label={t('company.establishment')} value={form.establishment_card_number} onChange={(e) => set('establishment_card_number', e.target.value)} />
        <Input type="date" label={t('company.establishmentExpiry')} value={form.establishment_card_expiry} onChange={(e) => set('establishment_card_expiry', e.target.value)} />
        <Input label={t('company.trn')} value={form.trn_number} onChange={(e) => set('trn_number', e.target.value)} placeholder="100123456700003" />
        <Input type="email" label={t('company.email')} value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input label={t('company.phone')} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input label={t('company.mobile')} value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea label={t('company.address')} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label={t('common.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
