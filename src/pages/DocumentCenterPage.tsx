import { useEffect, useState, useMemo } from 'react';
import { FileText, Search, File as FileIcon, Building2, User, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { documentUrl } from '@/components/FileUploader';
import { classNames, expiryBucket, expiryColor, expiryLabel, formatDate } from '@/lib/utils';

interface DocRow {
  id: string;
  name: string;
  type: string | null;
  expiry_date: string | null;
  storage_path: string;
  owner_name: string;
  owner_type: 'company' | 'employee';
  link: string;
}

export function DocumentCenterPage() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');

  useEffect(() => {
    (async () => {
      const [c, cd, ed] = await Promise.all([
        supabase.from('companies').select('id,name').order('name'),
        supabase.from('company_documents').select('*, company:companies(id,name)'),
        supabase.from('employee_documents').select('*, employee:employees(id,full_name,company_id)'),
      ]);
      setCompanies((c.data as { id: string; name: string }[]) ?? []);
      const companyDocs: DocRow[] = ((cd.data as any[]) ?? []).map((d) => ({
        id: d.id, name: d.name, type: d.type, expiry_date: d.expiry_date, storage_path: d.storage_path,
        owner_name: d.company?.name ?? '—', owner_type: 'company', link: `/companies/${d.company?.id}`,
      }));
      const employeeDocs: DocRow[] = ((ed.data as any[]) ?? []).map((d) => ({
        id: d.id, name: d.name, type: d.type, expiry_date: d.expiry_date, storage_path: d.storage_path,
        owner_name: d.employee?.full_name ?? '—', owner_type: 'employee', link: `/companies/${d.employee?.company_id}?employee=${d.employee?.id}`,
      }));
      setDocs([...companyDocs, ...employeeDocs]);
      setLoading(false);
    })();
  }, []);

  const types = useMemo(() => Array.from(new Set(docs.map((d) => d.type).filter(Boolean))) as string[], [docs]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !(d.owner_name ?? '').toLowerCase().includes(q)) return false;
      }
      if (typeFilter && d.type !== typeFilter) return false;
      if (ownerFilter && d.owner_name !== ownerFilter) return false;
      if (expiryFilter) {
        const bucket = expiryBucket(d.expiry_date);
        if (expiryFilter === 'expired' && bucket !== 'expired') return false;
        if (expiryFilter === '30' && bucket !== '30') return false;
        if (expiryFilter === '60' && bucket !== '60') return false;
        if (expiryFilter === '90' && bucket !== '90') return false;
        if (expiryFilter === 'none' && d.expiry_date) return false;
      }
      return true;
    });
  }, [docs, query, typeFilter, ownerFilter, expiryFilter]);

  return (
    <div>
      <PageHeader title={t('doc.title')} description={`${docs.length} documents in the system`} />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
            <Input placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">{t('doc.type')}: {t('common.all')}</option>
            {types.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </Select>
          <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">Owner: {t('common.all')}</option>
            {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)}>
            <option value="">{t('doc.expiry')}: {t('common.all')}</option>
            <option value="expired">{t('alerts.expired')}</option>
            <option value="30">{t('alerts.30')}</option>
            <option value="60">{t('alerts.60')}</option>
            <option value="90">{t('alerts.90')}</option>
            <option value="none">No expiry date</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<FileText className="h-7 w-7" />} title="No documents found" description="Upload documents from a company or employee page." /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800 text-left text-xs text-ink-500 uppercase">
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">{t('doc.type')}</th>
                  <th className="px-4 py-3 font-medium">{t('doc.expiry')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={`${d.owner_type}-${d.id}`} className="border-b border-ink-100 dark:border-ink-800/50 hover:bg-ink-50 dark:hover:bg-ink-800/30">
                    <td className="px-4 py-3">
                      <a href={documentUrl(d.storage_path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:underline">
                        <FileIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate font-medium">{d.name}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(d.link)} className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300 hover:text-brand-600 dark:hover:text-brand-400">
                        {d.owner_type === 'company' ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                        <span className="truncate">{d.owner_name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{d.type || '—'}</td>
                    <td className="px-4 py-3">
                      {d.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <span className="text-ink-600 dark:text-ink-300">{formatDate(d.expiry_date)}</span>
                          <Badge className={expiryColor(expiryBucket(d.expiry_date))}>{expiryLabel(d.expiry_date)}</Badge>
                        </div>
                      ) : <span className="text-ink-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
