import { useEffect, useRef, useState } from 'react';
import { Bell, Check, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/contexts/RouterContext';
import { useI18n } from '@/contexts/I18nContext';
import { classNames, formatDate } from '@/lib/utils';

export function NotificationsBell() {
  const { notifications, refresh } = useNotifications();
  const { navigate } = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    refresh();
  };

  const markRead = async (id: string, link: string | null) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    refresh();
    if (link) {
      navigate(link);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
        title={t('notif.title')}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass rounded-xl overflow-hidden animate-slide-down z-50 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-ink-200 dark:border-ink-800">
            <p className="text-sm font-semibold">{t('notif.title')}</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                {t('notif.markAll')}
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-ink-400">
                <BellOff className="h-8 w-8 mb-2" />
                <p className="text-sm">{t('notif.empty')}</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id, n.link)}
                      className={classNames(
                        'w-full text-left px-3 py-3 border-b border-ink-100 dark:border-ink-800/50 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors',
                        !n.read && 'bg-brand-50/50 dark:bg-brand-500/5',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          {n.body && <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[10px] text-ink-400 mt-1">{formatDate(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
