import { useState } from 'react';
import { Plus, Receipt, Search } from 'lucide-react';
import { useInvoices, useCustomers } from '@/hooks/useData';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { InvoiceStatus } from '@/types';

const statusBadge: Record<InvoiceStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  unpaid: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

export function InvoicesPage() {
  const { invoices, loading } = useInvoices();
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  const filtered = invoices.filter((inv: any) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [inv.invoice_number, inv.customer?.name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.total ?? 0), 0);
  const pendingTotal = invoices.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + (i.total ?? 0), 0);

  return (
    <div>
      <PageHeader title={t('inv.title')} description={`${invoices.length} invoices`}
        action={<Button onClick={() => navigate('/accounting/invoices/new')}><Plus className="h-4 w-4" /> {t('inv.add')}</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-xs text-ink-500">Total Revenue (Paid)</p><p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRevenue)}</p></Card>
        <Card><p className="text-xs text-ink-500">Pending</p><p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">{formatCurrency(pendingTotal)}</p></Card>
        <Card><p className="text-xs text-ink-500">Total Invoices</p><p className="text-xl font-bold mt-1">{invoices.length}</p></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
          <Input placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {(['all', 'paid', 'unpaid', 'partial'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Receipt className="h-7 w-7" />} title="No invoices" description="Create your first invoice." action={<Button onClick={() => navigate('/accounting/invoices/new')}><Plus className="h-4 w-4" /> {t('inv.add')}</Button>} /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800 text-left text-xs text-ink-500 uppercase">
                  <th className="px-4 py-3 font-medium">{t('inv.number')}</th>
                  <th className="px-4 py-3 font-medium">{t('inv.customer')}</th>
                  <th className="px-4 py-3 font-medium">{t('inv.issueDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('inv.status')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('inv.total')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => (
                  <tr key={inv.id} onClick={() => navigate(`/accounting/invoices/${inv.id}`)}
                    className="border-b border-ink-100 dark:border-ink-800/50 hover:bg-ink-50 dark:hover:bg-ink-800/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{inv.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3"><Badge className={statusBadge[inv.status as InvoiceStatus]}>{inv.status}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.total)}</td>
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
