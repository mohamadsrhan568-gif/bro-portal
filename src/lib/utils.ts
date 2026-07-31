export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number | null | undefined, currency = 'AED'): string {
  if (amount == null) amount = 0;
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export type ExpiryBucket = 'expired' | '30' | '60' | '90' | 'ok';

export function expiryBucket(date: string | null | undefined): ExpiryBucket {
  const days = daysUntil(date);
  if (days == null) return 'ok';
  if (days < 0) return 'expired';
  if (days <= 30) return '30';
  if (days <= 60) return '60';
  if (days <= 90) return '90';
  return 'ok';
}

export function expiryColor(bucket: ExpiryBucket): string {
  switch (bucket) {
    case 'expired':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    case '30':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
    case '60':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    case '90':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400';
    default:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
  }
}

export function expiryLabel(date: string | null | undefined): string {
  const days = daysUntil(date);
  if (days == null) return 'No date';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `In ${days}d`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function downloadFile(content: string, filename: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
