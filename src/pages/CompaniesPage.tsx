import { useMemo, useState } from 'react';
import {
  Plus, Search, Building2, Pencil, Trash2, ChevronLeft, ChevronRight,
  Filter, X, ArrowUpDown,
} from 'lucide-react';
import { useCompanies } from '@/hooks/useData';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CompanyFormModal } from '@/pages/companies/CompanyFormModal';
import { classNames, expiryBucket, expiryColor, expiryLabel, formatDate, initials } from '@/lib/utils';
import type { Company } from '@/types';

type SortField = 'name' | 'trade_license_expiry' | 'ejari_expiry' | 'created_at';
type SortDir = 'asc' | 'desc';
type ExpiryFilter = 'all' | 'expiring' | 'expired' | 'active';

const PAGE_SIZE = 8;

export function CompaniesPage() {
  const { companies, loading, refresh } = useCompanies();
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  const filtered = useMemo(() => {
    let result = companies;

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((c) =>
        [c.name, c.trade_license_number, c.ejari_number, c.establishment_card_number, c.trn_number, c.email, c.phone, c.mobile]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      );
    }

    if (expiryFilter !== 'all') {
      result = result.filter((c) => {
        const dates = [c.trade_license_expiry, c.ejari_expiry, c.establishment_card_expiry].filter(Boolean) as string[];
        if (dates.length === 0) return expiryFilter === 'active';
        const buckets = dates.map((d) => expiryBucket(d));
        if (expiryFilter === 'expired') return buckets.some((b) => b === 'expired');
        if (expiryFilter === 'expiring') return buckets.some((b) => b === '30' || b === '60' || b === '90');
        if (expiryFilter === 'active') return buckets.every((b) => b === 'ok');
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      const av = (a[sortField] ?? '') as string;
      const bv = (b[sortField] ?? '') as string;
      if (sortField === 'name') cmp = av.localeCompare(bv);
      else if (sortField === 'created_at') cmp = new Date(av || 0).getTime() - new Date(bv || 0).getTime();
      else cmp = new Date(av || '9999').getTime() - new Date(bv || '9999').getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [companies, query, expiryFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('companies').delete().eq('id', deleting.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Company deleted', 'success');
      refresh();
    }
    setDeleting(null);
  };

  const hasActiveFilters = query.trim() || expiryFilter !== 'all';

  return (
    <div>
      <PageHeader
        title={t('company.title')}
        description={`${companies.length} ${t('company.title').toLowerCase()}`}
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> {t('company.add')}
          </Button>
        }
      />

      {/* Toolbar */}
      <Card className="mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
            <Input
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPage(); }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-400 flex-shrink-0" />
            <Select
              value={expiryFilter}
              onChange={(e) => { setExpiryFilter(e.target.value as ExpiryFilter); resetPage(); }}
              className="min-w-[140px]"
            >
              <option value="all">{t('filter.all')}</option>
              <option value="active">{t('filter.active')}</option>
              <option value="expiring">{t('filter.expiring')}</option>
              <option value="expired">{t('filter.expired')}</option>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setExpiryFilter('all'); resetPage(); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : paginated.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="h-7 w-7" />}
            title={companies.length === 0 ? 'No companies yet' : 'No matches'}
            description={companies.length === 0 ? 'Add your first company to get started.' : 'Try adjusting your search or filters.'}
            action={companies.length === 0 && <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> {t('company.add')}</Button>}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800 text-left text-xs text-ink-500 uppercase tracking-wide">
                  <th className="px-4 py-3.5 font-medium">
                    <SortButton label={t('table.company')} field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3.5 font-medium hidden md:table-cell">{t('table.license')}</th>
                  <th className="px-4 py-3.5 font-medium hidden lg:table-cell">{t('table.ejari')}</th>
                  <th className="px-4 py-3.5 font-medium hidden xl:table-cell">{t('table.trn')}</th>
                  <th className="px-4 py-3.5 font-medium hidden sm:table-cell">{t('table.contact')}</th>
                  <th className="px-4 py-3.5 font-medium">
                    <SortButton label={t('table.status')} field="trade_license_expiry" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3.5 font-medium text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const licenseBucket = expiryBucket(c.trade_license_expiry);
                  const ejariBucket = expiryBucket(c.ejari_expiry);
                  const worstBucket = [licenseBucket, ejariBucket, expiryBucket(c.establishment_card_expiry)].sort(bySeverity)[0];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/companies/${c.id}`)}
                      className="border-b border-ink-100 dark:border-ink-800/50 hover:bg-ink-50 dark:hover:bg-ink-800/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-bold flex-shrink-0">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.name}</p>
                            <p className="text-xs text-ink-500 truncate md:hidden">{c.trade_license_number || 'No license'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.trade_license_expiry ? (
                          <div className="flex items-center gap-2">
                            <span className="text-ink-600 dark:text-ink-300">{formatDate(c.trade_license_expiry)}</span>
                            <Badge className={expiryColor(licenseBucket)}>{expiryLabel(c.trade_license_expiry)}</Badge>
                          </div>
                        ) : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {c.ejari_expiry ? (
                          <div className="flex items-center gap-2">
                            <span className="text-ink-600 dark:text-ink-300">{formatDate(c.ejari_expiry)}</span>
                            <Badge className={expiryColor(ejariBucket)}>{expiryLabel(c.ejari_expiry)}</Badge>
                          </div>
                        ) : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-ink-600 dark:text-ink-300 font-mono text-xs">{c.trn_number || '—'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="min-w-0">
                          <p className="text-ink-600 dark:text-ink-300 truncate">{c.email || '—'}</p>
                          <p className="text-xs text-ink-500 truncate">{c.phone || c.mobile || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge bucket={worstBucket} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditing(c); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-ink-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-ink-200 dark:border-ink-800">
            <p className="text-xs text-ink-500">
              {filtered.length} {t('pagination.results')} · {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t('pagination.previous')}
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={classNames(
                        'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                        pageNum === currentPage
                          ? 'bg-brand-600 text-white'
                          : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800',
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                {t('pagination.next')} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <CompanyFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} company={editing} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete company"
        message={<>This will permanently delete <strong>{deleting?.name}</strong> and all its employees, documents, and cases. This cannot be undone.</>}
        danger
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function SortButton({ label, field, sortField, sortDir, onSort }: { label: string; field: SortField; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void }) {
  const active = sortField === field;
  return (
    <button onClick={() => onSort(field)} className={classNames('flex items-center gap-1 hover:text-ink-700 dark:hover:text-ink-200 transition-colors', active && 'text-brand-600 dark:text-brand-400')}>
      {label}
      <ArrowUpDown className={classNames('h-3 w-3', !active && 'opacity-40')} />
    </button>
  );
}

function StatusBadge({ bucket }: { bucket: 'expired' | '30' | '60' | '90' | 'ok' }) {
  if (bucket === 'expired') return <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">Expired</Badge>;
  if (bucket === '30') return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">Critical</Badge>;
  if (bucket === '60') return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Expiring</Badge>;
  if (bucket === '90') return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400">Soon</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Active</Badge>;
}

function bySeverity(a: string, b: string): number {
  const order: Record<string, number> = { expired: 0, '30': 1, '60': 2, '90': 3, ok: 4 };
  return (order[a] ?? 5) - (order[b] ?? 5);
}
