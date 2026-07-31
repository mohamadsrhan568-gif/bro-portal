import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Users,
  FileText,
  Plane,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, StatCard, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { daysUntil, expiryBucket, expiryColor, expiryLabel, formatCurrency, formatDate } from '@/lib/utils';

interface ExpiryItem {
  id: string;
  label: string;
  date: string;
  type: 'license' | 'visa' | 'passport' | 'emirates' | 'ejari' | 'establishment';
  link: string;
}

export function DashboardPage() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [stats, setStats] = useState({
    companies: 0,
    employees: 0,
    expiringLicenses: 0,
    expiringVisas: 0,
    expiringPassports: 0,
    pendingInvoices: 0,
    monthlyRevenue: 0,
  });
  const [expiries, setExpiries] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [companies, employees, invoices] = await Promise.all([
        supabase.from('companies').select('*'),
        supabase.from('employees').select('*, company:companies(id,name)'),
        supabase.from('invoices').select('*'),
      ]);

      const companyRows = (companies.data as any[]) ?? [];
      const employeeRows = (employees.data as any[]) ?? [];
      const invoiceRows = (invoices.data as any[]) ?? [];

      const now = new Date();
      const in90 = (d: string | null) => {
        if (!d) return false;
        const days = daysUntil(d);
        return days != null && days <= 90;
      };

      let expiringLicenses = 0;
      let expiringVisas = 0;
      let expiringPassports = 0;
      const expiryItems: ExpiryItem[] = [];

      for (const c of companyRows) {
        for (const field of ['trade_license_expiry', 'ejari_expiry', 'establishment_card_expiry'] as const) {
          if (in90(c[field])) {
            const typeMap = {
              trade_license_expiry: 'license',
              ejari_expiry: 'ejari',
              establishment_card_expiry: 'establishment',
            } as const;
            expiryItems.push({
              id: `${c.id}-${field}`,
              label: `${c.name} — ${field.replace('_expiry', '').replace(/_/g, ' ')}`,
              date: c[field],
              type: typeMap[field],
              link: `/companies/${c.id}`,
            });
            if (field === 'trade_license_expiry') expiringLicenses++;
          }
        }
      }
      for (const e of employeeRows) {
        if (in90(e.visa_expiry)) {
          expiringVisas++;
          expiryItems.push({ id: `${e.id}-visa`, label: `${e.full_name} — Visa`, date: e.visa_expiry, type: 'visa', link: `/companies/${e.company_id}?employee=${e.id}` });
        }
        if (in90(e.passport_expiry)) {
          expiringPassports++;
          expiryItems.push({ id: `${e.id}-passport`, label: `${e.full_name} — Passport`, date: e.passport_expiry, type: 'passport', link: `/companies/${e.company_id}?employee=${e.id}` });
        }
        if (in90(e.emirates_id_expiry)) {
          expiryItems.push({ id: `${e.id}-eid`, label: `${e.full_name} — Emirates ID`, date: e.emirates_id_expiry, type: 'emirates', link: `/companies/${e.company_id}?employee=${e.id}` });
        }
      }

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = invoiceRows
        .filter((i) => i.status === 'paid' && new Date(i.issue_date) >= monthStart)
        .reduce((s, i) => s + (i.total ?? 0), 0);
      const pendingInvoices = invoiceRows.filter((i) => i.status !== 'paid').length;

      setStats({
        companies: companyRows.length,
        employees: employeeRows.length,
        expiringLicenses,
        expiringVisas,
        expiringPassports,
        pendingInvoices,
        monthlyRevenue,
      });
      setExpiries(expiryItems.sort((a, b) => (daysUntil(a.date) ?? 999) - (daysUntil(b.date) ?? 999)));
      setLoading(false);
    })();
  }, []);

  const buckets = useMemo(() => {
    const expired = expiries.filter((e) => expiryBucket(e.date) === 'expired');
    const d30 = expiries.filter((e) => expiryBucket(e.date) === '30');
    const d60 = expiries.filter((e) => expiryBucket(e.date) === '60');
    const d90 = expiries.filter((e) => expiryBucket(e.date) === '90');
    return { expired, d30, d60, d90 };
  }, [expiries]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} description="Overview of your business operations" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('stat.companies')} value={stats.companies} icon={<Building2 className="h-5 w-5" />} accent="brand" onClick={() => navigate('/companies')} />
        <StatCard label={t('stat.employees')} value={stats.employees} icon={<Users className="h-5 w-5" />} accent="violet" onClick={() => navigate('/employees')} />
        <StatCard label={t('stat.licenses')} value={stats.expiringLicenses} icon={<FileText className="h-5 w-5" />} accent="amber" onClick={() => navigate('/documents')} />
        <StatCard label={t('stat.visas')} value={stats.expiringVisas} icon={<Plane className="h-5 w-5" />} accent="cyan" onClick={() => navigate('/documents')} />
        <StatCard label={t('stat.passports')} value={stats.expiringPassports} icon={<CreditCard className="h-5 w-5" />} accent="red" onClick={() => navigate('/documents')} />
        <StatCard label={t('stat.invoices')} value={stats.pendingInvoices} icon={<Receipt className="h-5 w-5" />} accent="amber" onClick={() => navigate('/accounting/invoices')} />
        <StatCard label={t('stat.revenue')} value={formatCurrency(stats.monthlyRevenue)} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" onClick={() => navigate('/accounting/invoices')} />
        <StatCard label="Total Invoices" value={0} icon={<Receipt className="h-5 w-5" />} accent="brand" onClick={() => navigate('/accounting/invoices')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expiry alerts */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold">{t('alerts.title')}</h3>
            </div>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              {expiries.length} items
            </Badge>
          </div>

          {expiries.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-7 w-7" />} title="No expiring documents" description="All documents are within their valid period." />
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {expiries.slice(0, 20).map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate(e.link)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.label}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">{formatDate(e.date)}</p>
                  </div>
                  <Badge className={expiryColor(expiryBucket(e.date))}>{expiryLabel(e.date)}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Alert summary */}
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-brand-500" />
            Alert Summary
          </h3>
          <div className="space-y-3">
            <AlertRow label={t('alerts.expired')} count={buckets.expired.length} color="bg-red-500" onClick={() => navigate('/documents')} />
            <AlertRow label={t('alerts.30')} count={buckets.d30.length} color="bg-orange-500" onClick={() => navigate('/documents')} />
            <AlertRow label={t('alerts.60')} count={buckets.d60.length} color="bg-amber-500" onClick={() => navigate('/documents')} />
            <AlertRow label={t('alerts.90')} count={buckets.d90.length} color="bg-yellow-500" onClick={() => navigate('/documents')} />
          </div>
          <button
            onClick={() => navigate('/documents')}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            View Document Center
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </Card>
      </div>
    </div>
  );
}

function AlertRow({ label, count, color, onClick }: { label: string; count: number; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold">{count}</span>
    </button>
  );
}
