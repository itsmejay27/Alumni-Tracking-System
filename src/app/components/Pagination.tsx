import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/preferences';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Splits a list into pages. Jumps back to page 1 when the list's length changes (e.g. a filter). */
export function usePaged<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [items.length, pageSize]);
  const current = Math.min(page, pages);
  return {
    page: current,
    pages,
    setPage,
    pageItems: items.slice((current - 1) * pageSize, current * pageSize),
    from: items.length ? (current - 1) * pageSize + 1 : 0,
    to: Math.min(current * pageSize, items.length),
    total: items.length,
  };
}

export function Pagination({
  page,
  pages,
  setPage,
  from,
  to,
  total,
  label = 'items',
  alwaysShowControls = true,
  inline = false,
}: {
  page: number;
  pages: number;
  setPage: (p: number) => void;
  from: number;
  to: number;
  total: number;
  label?: string;
  /** Show the page buttons even when everything fits on one page (on by default, so every list looks the same) */
  alwaysShowControls?: boolean;
  /** Keep the bar where it is in the page instead of the bottom edge of the screen */
  inline?: boolean;
}) {
  const t = useT();
  // The page's bar goes in the footer strip at the bottom of the screen (see App)
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!inline) setSlot(document.getElementById('page-footer'));
  }, [inline]);
  if (total === 0) return null;
  // Show up to 5 page numbers around the current page
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const bar = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 text-sm">
      <p className="text-muted-foreground">
        {t('Showing {from}–{to} of {total}', { from, to, total })} {label}
      </p>
      {(pages > 1 || alwaysShowControls) && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          {nums.map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium ${
                n === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
  if (inline) return bar;
  return slot ? createPortal(bar, slot) : null;
}
