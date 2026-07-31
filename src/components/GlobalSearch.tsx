import { useEffect, useRef, useState } from 'react';
import { Search, Building2, User, FileText, Package, X } from 'lucide-react';
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch';
import { useRouter } from '@/contexts/RouterContext';
import { classNames } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

const typeIcons: Record<SearchResult['type'], typeof Building2> = {
  company: Building2,
  employee: User,
  customer: User,
  document: FileText,
  item: Package,
};

const typeColors: Record<SearchResult['type'], string> = {
  company: 'text-brand-500',
  employee: 'text-violet-500',
  customer: 'text-cyan-500',
  document: 'text-amber-500',
  item: 'text-emerald-500',
};

export function GlobalSearch() {
  const { search, loaded } = useGlobalSearch();
  const { navigate } = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = search(query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    navigate(r.link);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && results[activeIndex]) {
            handleSelect(results[activeIndex]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={t('search.placeholder')}
        className="w-full rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-100/60 dark:bg-ink-800/60 pl-10 pr-9 py-2.5 text-sm placeholder:text-ink-400 focus:bg-white dark:focus:bg-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && query && (
        <div className="absolute top-full mt-2 w-full glass rounded-xl overflow-hidden animate-slide-down z-50 max-h-96 overflow-y-auto">
          {!loaded && (
            <div className="p-4 text-sm text-ink-500 text-center">Loading index…</div>
          )}
          {loaded && results.length === 0 && (
            <div className="p-4 text-sm text-ink-500 text-center">No results for "{query}"</div>
          )}
          {results.length > 0 && (
            <ul className="py-1">
              {results.map((r, i) => {
                const Icon = typeIcons[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => handleSelect(r)}
                      className={classNames(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                        i === activeIndex ? 'bg-brand-50 dark:bg-brand-500/10' : '',
                      )}
                    >
                      <Icon className={classNames('h-4 w-4 flex-shrink-0', typeColors[r.type])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{r.subtitle}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
