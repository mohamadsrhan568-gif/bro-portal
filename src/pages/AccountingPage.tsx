import { Users, Package, Receipt, TrendingUp, ArrowRight } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useRouter } from '@/contexts/RouterContext';
import { Card, PageHeader, StatCard } from '@/components/ui/Card';

export function AccountingPage() {
  const { t } = useI18n();
  const { navigate } = useRouter();

  const modules = [
    { icon: Users, title: t('nav.customers'), desc: 'Manage your customers', path: '/accounting/customers', accent: 'brand' as const },
    { icon: Package, title: t('nav.items'), desc: 'Create predefined items and services', path: '/accounting/items', accent: 'emerald' as const },
    { icon: Receipt, title: t('nav.invoices'), desc: 'Create and track invoices', path: '/accounting/invoices', accent: 'violet' as const },
  ];

  return (
    <div>
      <PageHeader title={t('nav.accounting')} description="Lightweight accounting for your business" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.path} hover onClick={() => navigate(m.path)}>
              <div className="flex flex-col items-start">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-3 ${
                  m.accent === 'brand' ? 'bg-brand-100 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400' :
                  m.accent === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                  'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{m.title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{m.desc}</p>
                <span className="mt-3 text-sm text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline">
                  Open <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
