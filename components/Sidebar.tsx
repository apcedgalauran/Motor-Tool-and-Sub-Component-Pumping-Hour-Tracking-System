'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/motors', label: 'Motors', icon: '⚙' },
  { href: '/sub-components', label: 'Sub-Components', icon: '◎' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    const isDone = pendingHref === '/' ? pathname === '/' : pathname.startsWith(pendingHref);
    if (isDone) {
      setPendingHref(null);
      setMobileOpen(false);
    }
  }, [pathname, pendingHref]);

  const isNavigating = pendingHref !== null;

  function handleNavClick(href: string) {
    const isCurrent = href === '/' ? pathname === '/' : pathname.startsWith(href);
    if (isCurrent) {
      setMobileOpen(false);
      return;
    }
    setPendingHref(href);
  }

  return (
    <>
      {/* Mobile Top Header (Sticky) */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#EBEBEB] border-b border-[var(--border)] z-50 flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#9E9EB0]/10 border border-[#9E9EB0]/30 flex items-center justify-center text-[#9E9EB0] text-sm font-bold">
            M
          </div>
          <div>
            <h1 className="text-[13px] font-semibold text-[#121212] tracking-tight">Motor Tracker</h1>
          </div>
        </div>
        <button
          onClick={() => !isNavigating && setMobileOpen(!mobileOpen)}
          disabled={isNavigating}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#9E9EB0]/10 transition-colors text-[#333333] disabled:opacity-50"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden top-16"
          onClick={() => !isNavigating && setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 md:top-0 left-0 h-[calc(100%-4rem)] md:h-full w-64 bg-[#EBEBEB] border-r border-[var(--border)] z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 overflow-y-auto`}
      >
        {/* Logo (Desktop Only) */}
        <div className="hidden md:block p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#9E9EB0]/10 border border-[#9E9EB0]/30 flex items-center justify-center text-[#9E9EB0] text-lg font-bold">
              M
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#121212] tracking-tight">Motor Tracker</h1>
              <p className="text-[10px] text-[#333333] uppercase tracking-widest">Hour System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 mt-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                      ? 'bg-[#9E9EB0]/15 text-[#121212] border border-[#9E9EB0]/30 font-semibold'
                      : 'text-[#333333] hover:text-[#121212] hover:bg-[var(--card-hover)] border border-transparent'
                      }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {pendingHref === item.href && (
                      <span className="ml-auto text-[10px] text-[#333333]/70 animate-pulse">Loading...</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)]">
          <div className="text-[10px] text-[#333333] uppercase tracking-wider mb-2">
            Export Data
          </div>
          <div className="flex gap-2">
            <a
              href="/api/export?type=motors"
              className="flex-1 text-center text-[10px] text-[#333333] hover:text-[#9E9EB0] border border-[var(--border)] hover:border-[#9E9EB0]/50 rounded-md py-1.5 transition-colors"
            >
              Motors CSV
            </a>
            <a
              href="/api/export?type=sub-components"
              className="flex-1 text-center text-[10px] text-[#333333] hover:text-[#9E9EB0] border border-[var(--border)] hover:border-[#9E9EB0]/50 rounded-md py-1.5 transition-colors"
            >
              Parts CSV
            </a>
          </div>
          <div className="text-[10px] text-[#A3A3A3] mt-2">v1.0</div>
          <div className="mt-3">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-[10px] text-[#333333] hover:text-[#9E9EB0] border border-[var(--border)] hover:border-[#9E9EB0]/50 rounded-md py-1.5 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
