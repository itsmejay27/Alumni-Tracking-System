import React, { useEffect, useState } from 'react';
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
  alwaysShowControls = false,
}: {
  page: number;
  pages: number;
  setPage: (p: number) => void;
  from: number;
  to: number;
  total: number;
  label?: string;
  /** Show the page buttons even when everything fits on one page */
  alwaysShowControls?: boolean;
}) {
  if (total === 0) return null;
  // Show up to 5 page numbers around the current page
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing {from}–{to} of {total} {label}
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
}
