'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';

type ClickableRowProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

/**
 * A thin client wrapper that makes a `<tr>` clickable via router.push.
 * Clicks originating from `<a>` or `<button>` elements are ignored so
 * that inline links (e.g. sort headers, motor location links) still work.
 */
export function ClickableRow({ href, className, children }: ClickableRowProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    // Don't navigate if the user clicked an existing link or button inside the row
    const target = event.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;

    router.push(href);
  }

  return (
    <tr onClick={handleClick} className={className} style={{ cursor: 'pointer' }}>
      {children}
    </tr>
  );
}
