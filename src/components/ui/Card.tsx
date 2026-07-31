import { type ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={classNames('glass rounded-2xl p-5', hover && 'glass-hover cursor-pointer', className)}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  trend?: string;
  accent?: 'brand' | 'emerald' | 'amber' | 'red' | 'violet' | 'cyan';
  onClick?: () => void;
}

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand: 'from-brand-500/20 to-brand-500/5 text-brand-600 dark:text-brand-400',
  emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  amber: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400',
  red: 'from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400',
  violet: 'from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400',
  cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400',
};

export function StatCard({ label, value, icon, trend, accent = 'brand', onClick }: StatCardProps) {
  return (
    <Card hover={!!onClick} onClick={onClick} className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold truncate">{value}</p>
          {trend && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{trend}</p>}
        </div>
        <div
          className={classNames(
            'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br flex-shrink-0',
            accentClasses[accent],
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return <span className={classNames('badge', className)}>{children}</span>;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 dark:bg-ink-800 text-ink-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
