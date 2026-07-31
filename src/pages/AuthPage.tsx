import { useState, type FormEvent } from 'react';
import { Building2, Lock, Mail, Loader2, Moon, Sun, Languages } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/ui/Input';
import { classNames } from '@/lib/utils';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleLang, t } = useI18n();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else if (mode === 'signup') {
      toast('Account created. You are signed in.', 'success');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-ink-50 dark:bg-ink-950">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={toggleLang}
          className="p-2.5 rounded-xl bg-white/70 dark:bg-ink-900/70 border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          title="Toggle language"
        >
          <Languages className="h-5 w-5" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white/70 dark:bg-ink-900/70 border border-ink-200 dark:border-ink-800 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">BRO Portal</p>
              <p className="text-xs text-brand-200">Business Resource Operations</p>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Manage your companies, employees & finances in one place.
            </h1>
            <p className="text-brand-100/80 text-lg">
              A premium internal management portal for Dubai business owners. Track licenses,
              visas, documents, invoices and more.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-brand-200">
            <span>Companies</span>
            <span className="h-1 w-1 rounded-full bg-brand-300" />
            <span>Employees</span>
            <span className="h-1 w-1 rounded-full bg-brand-300" />
            <span>Accounting</span>
            <span className="h-1 w-1 rounded-full bg-brand-300" />
            <span>Documents</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">BRO Portal</p>
              <p className="text-xs text-ink-500">{t('app.tagline')}</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? t('auth.welcome') : t('auth.create')}
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1 mb-8">
            {mode === 'login' ? t('auth.subtitle') : t('app.tagline')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              <Input
                type="email"
                name="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              <Input
                type="password"
                name="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={classNames(
                'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
                'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-600/20',
                'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? t('auth.login') : t('auth.signup')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              {mode === 'login' ? t('auth.signup') : t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
