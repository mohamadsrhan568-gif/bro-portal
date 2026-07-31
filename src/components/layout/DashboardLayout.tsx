import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Calculator,
  FileText,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Languages,
  LogOut,
  Menu,
  X,
  Building,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { RouterProvider, useRouter, Link } from '@/contexts/RouterContext';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationsBell } from '@/components/NotificationsBell';
import { classNames } from '@/lib/utils';
import { DashboardPage } from '@/pages/DashboardPage';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { CompanyDetailPage } from '@/pages/CompanyDetailPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { AccountingPage } from '@/pages/AccountingPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { ItemsPage } from '@/pages/ItemsPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/InvoiceDetailPage';
import { DocumentCenterPage } from '@/pages/DocumentCenterPage';
import { SettingsPage } from '@/pages/SettingsPage';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  match: (path: string) => boolean;
  children?: { label: string; path: string }[];
}

function buildNav(t: (k: string) => string): NavItem[] {
  return [
    { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/', match: (p) => p === '/' },
    { label: t('nav.companies'), icon: Building2, path: '/companies', match: (p) => p.startsWith('/companies') },
    { label: t('nav.employees'), icon: Users, path: '/employees', match: (p) => p.startsWith('/employees') },
    {
      label: t('nav.accounting'),
      icon: Calculator,
      path: '/accounting',
      match: (p) => p.startsWith('/accounting'),
      children: [
        { label: t('nav.customers'), path: '/accounting/customers' },
        { label: t('nav.items'), path: '/accounting/items' },
        { label: t('nav.invoices'), path: '/accounting/invoices' },
      ],
    },
    { label: t('nav.documents'), icon: FileText, path: '/documents', match: (p) => p.startsWith('/documents') },
    { label: t('nav.settings'), icon: SettingsIcon, path: '/settings', match: (p) => p.startsWith('/settings') },
  ];
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30 group-hover:scale-105 transition-transform">
        <Building className="h-5 w-5" />
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-bold leading-none">BRO Portal</p>
        <p className="text-[10px] text-ink-500 mt-0.5">Business Operations</p>
      </div>
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { path } = useRouter();
  const nav = buildNav(t);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 z-40 h-screen w-64 flex-shrink-0',
          'glass border-r border-ink-200/80 dark:border-ink-800/80 rounded-none',
          'flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-ink-200 dark:border-ink-800">
          <Logo />
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.match(path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={classNames(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                    : 'text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-ink-200 dark:border-ink-800">
          <p className="text-[10px] text-ink-400 text-center">BRO Portal v1.0 · Dubai</p>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { toggleLang, t, lang } = useI18n();
  const { signOut, user } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 glass border-b border-ink-200/80 dark:border-ink-800/80 rounded-none px-4 sm:px-6 flex items-center gap-3">
      <button onClick={onMenu} className="lg:hidden p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
        <Menu className="h-5 w-5" />
      </button>
      <GlobalSearch />
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={toggleLang}
          className="p-2.5 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors text-xs font-medium"
          title="Toggle language"
        >
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationsBell />
        <div className="h-6 w-px bg-ink-200 dark:bg-ink-700 mx-1" />
        <div className="hidden sm:flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-bold">
            {(user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <span className="text-xs text-ink-600 dark:text-ink-400 max-w-[140px] truncate">{user?.email}</span>
        </div>
        <button
          onClick={signOut}
          className="p-2.5 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title={t('auth.signOut')}
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function RouteOutlet() {
  const { path } = useRouter();
  const query = new URLSearchParams(path.split('?')[1] || '');

  // /accounting/customers, /accounting/items, /accounting/invoices, /accounting/invoices/:id
  if (path === '/accounting' || path === '/accounting/') return <AccountingPage />;
  if (path.startsWith('/accounting/customers')) return <CustomersPage />;
  if (path.startsWith('/accounting/items')) return <ItemsPage />;
  if (path.startsWith('/accounting/invoices/')) {
    const id = path.split('/').pop() ?? '';
    return <InvoiceDetailPage invoiceId={id} />;
  }
  if (path.startsWith('/accounting/invoices')) return <InvoicesPage />;

  if (path.startsWith('/companies/')) {
    const id = path.split('?')[0].split('/').pop() ?? '';
    return <CompanyDetailPage companyId={id} employeeId={query.get('employee')} />;
  }
  if (path === '/companies' || path === '/companies/') return <CompaniesPage />;

  if (path.startsWith('/employees')) return <EmployeesPage />;
  if (path.startsWith('/documents')) return <DocumentCenterPage />;
  if (path.startsWith('/settings')) return <SettingsPage />;
  if (path === '/' || path === '') return <DashboardPage />;

  return <DashboardPage />;
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { path } = useRouter();

  useEffect(() => {
    setSidebarOpen(false);
  }, [path]);

  return (
    <RouterProvider>
      <div className="min-h-screen flex bg-ink-50 dark:bg-ink-950">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenu={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto animate-fade-in">
              <RouteOutlet />
            </div>
          </main>
        </div>
      </div>
    </RouterProvider>
  );
}
