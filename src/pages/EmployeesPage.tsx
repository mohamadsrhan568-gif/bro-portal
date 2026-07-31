import { useState } from 'react';
import { Users, Search, Building2 } from 'lucide-react';
import { useAllEmployees } from '@/hooks/useData';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { classNames, expiryBucket, expiryColor, expiryLabel, formatCurrency, formatDate, initials } from '@/lib/utils';

export function EmployeesPage() {
  const { employees, loading } = useAllEmployees();
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');

  const filtered = employees.filter((e: any) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [e.full_name, e.passport_number, e.visa_number, e.emirates_id_number, e.nationality, e.position, e.phone, e.email, e.company?.name]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div>
      <PageHeader title={t('employee.title')} description={`${employees.length} employees across all companies`} />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
        <Input placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Users className="h-7 w-7" />} title="No employees" description="Add employees from a company's page." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e: any) => (
            <Card key={e.id} hover onClick={() => navigate(`/companies/${e.company_id}?employee=${e.id}`)}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold flex-shrink-0">
                  {initials(e.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{e.full_name}</p>
                  <p className="text-xs text-ink-500 truncate">{e.position || '—'}</p>
                  <button onClick={(ev) => { ev.stopPropagation(); navigate(`/companies/${e.company_id}`); }} className="mt-1 flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                    <Building2 className="h-3 w-3" /> {e.company?.name ?? '—'}
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Mini label="Visa" value={e.visa_expiry ? formatDate(e.visa_expiry) : '—'} expiry={e.visa_expiry} />
                <Mini label="Passport" value={e.passport_expiry ? formatDate(e.passport_expiry) : '—'} expiry={e.passport_expiry} />
                <Mini label="Emirates ID" value={e.emirates_id_expiry ? formatDate(e.emirates_id_expiry) : '—'} expiry={e.emirates_id_expiry} />
                <Mini label="Salary" value={e.salary != null ? formatCurrency(e.salary) : '—'} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, expiry }: { label: string; value: string; expiry?: string | null }) {
  return (
    <div>
      <p className="text-ink-400">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="font-medium truncate">{value}</span>
        {expiry && <Badge className={classNames('text-[10px] px-1.5', expiryColor(expiryBucket(expiry)))}>{expiryLabel(expiry)}</Badge>}
      </div>
    </div>
  );
}
