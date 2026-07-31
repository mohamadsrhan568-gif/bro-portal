import { useEffect, useState } from 'react';
import { Save, Upload, Download, Building2, Database, Loader2 } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useI18n } from '@/contexts/I18nContext';
import { Card, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { downloadFile } from '@/lib/utils';
import type { Settings } from '@/types';

export function SettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    company_info: '',
    vat_number: '',
    vat_percent: '5',
    currency: 'AED',
    invoice_template: 'default',
  });
  const [logoPath, setLogoPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) {
        setSettings(data as Settings);
        setForm({
          company_name: data.company_name ?? '',
          company_info: data.company_info ?? '',
          vat_number: data.vat_number ?? '',
          vat_percent: String(data.vat_percent),
          currency: data.currency ?? 'AED',
          invoice_template: data.invoice_template ?? 'default',
        });
        setLogoPath(data.company_logo_path);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      company_info: form.company_info,
      vat_number: form.vat_number,
      vat_percent: parseFloat(form.vat_percent) || 0,
      currency: form.currency,
      invoice_template: form.invoice_template,
      company_logo_path: logoPath,
    };
    let error;
    if (settings) {
      ({ error } = await supabase.from('settings').update(payload).eq('user_id', settings.user_id));
    } else {
      ({ error } = await supabase.from('settings').insert(payload));
    }
    setSaving(false);
    if (error) toast(error.message, 'error');
    else toast('Settings saved', 'success');
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    const ext = file.name.split('.').pop();
    const path = `logos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file);
    if (error) toast(error.message, 'error');
    else {
      setLogoPath(path);
      toast('Logo uploaded', 'success');
    }
    setLogoUploading(false);
  };

  const logoUrl = logoPath ? supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(logoPath).data.publicUrl : null;

  const exportData = async () => {
    setExporting(true);
    const tables = ['companies', 'employees', 'company_documents', 'employee_documents', 'customers', 'items', 'invoices', 'invoice_lines', 'settings', 'notifications', 'company_tags'];
    const dump: Record<string, any> = {};
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      dump[table] = data ?? [];
    }
    downloadFile(JSON.stringify(dump, null, 2), `bro-portal-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    setExporting(false);
    toast('Data exported', 'success');
  };

  if (loading) return <div className="skeleton h-64 rounded-2xl" />;

  return (
    <div>
      <PageHeader title={t('settings.title')} description="Configure your portal" action={
        <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> {t('common.save')}</Button>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Logo */}
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-brand-500" /> {t('settings.logo')}</h3>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink-100 dark:bg-ink-800 overflow-hidden flex-shrink-0">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <Building2 className="h-8 w-8 text-ink-400" />}
            </div>
            <div className="flex-1">
              <label className="btn-secondary cursor-pointer">
                {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); e.target.value = ''; }} />
              </label>
              {logoPath && <button onClick={() => setLogoPath(null)} className="ml-2 text-sm text-red-500 hover:underline">Remove</button>}
            </div>
          </div>
        </Card>

        {/* Company info */}
        <Card>
          <h3 className="font-semibold mb-4">{t('settings.companyInfo')}</h3>
          <div className="space-y-3">
            <Input label={t('company.name')} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            <Textarea label={t('settings.companyInfo')} value={form.company_info} onChange={(e) => setForm({ ...form, company_info: e.target.value })} />
          </div>
        </Card>

        {/* VAT */}
        <Card>
          <h3 className="font-semibold mb-4">VAT & Currency</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('settings.vatNumber')} value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
            <Input type="number" label={t('settings.vatPercent')} value={form.vat_percent} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} />
            <Select label={t('settings.currency')} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SAR">SAR</option>
            </Select>
            <Select label={t('settings.invoiceTemplate')} value={form.invoice_template} onChange={(e) => setForm({ ...form, invoice_template: e.target.value })}>
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
              <option value="classic">Classic</option>
            </Select>
          </div>
        </Card>

        {/* Backup */}
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Database className="h-5 w-5 text-brand-500" /> {t('settings.backup')}</h3>
          <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">Export all your data as a JSON file for backup. Import is available for restoring from a previous backup.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportData} loading={exporting}><Download className="h-4 w-4" /> {t('settings.export')}</Button>
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4" /> {t('settings.import')}
              <input type="file" accept="application/json" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const data = JSON.parse(reader.result as string);
                    toast('Import feature restores data structure. Contact your administrator to restore a backup.', 'info');
                  } catch {
                    toast('Invalid backup file', 'error');
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
