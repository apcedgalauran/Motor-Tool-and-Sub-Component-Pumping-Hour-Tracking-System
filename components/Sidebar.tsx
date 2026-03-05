'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/motors', label: 'Motors', icon: '⚙' },
  { href: '/sub-components', label: 'Sub-Components', icon: '◎' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--card)] border border-[var(--border)] text-amber-500"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[var(--card)] border-r border-[var(--border)] z-40 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-lg font-bold">
              M
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-100 tracking-tight">Motor Tracker</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Hour System</p>
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
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--card-hover)] border border-transparent'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)]">
          <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
            Export Data
          </div>
          <div className="flex gap-2">
            <a
              href="/api/export?type=motors"
              className="flex-1 text-center text-[10px] text-slate-400 hover:text-amber-400 border border-[var(--border)] hover:border-amber-500/30 rounded-md py-1.5 transition-colors"
            >
              Motors CSV
            </a>
            <a
              href="/api/export?type=sub-components"
              className="flex-1 text-center text-[10px] text-slate-400 hover:text-amber-400 border border-[var(--border)] hover:border-amber-500/30 rounded-md py-1.5 transition-colors"
            >
              Parts CSV
            </a>
          </div>
          <div className="text-[10px] text-slate-700 mt-2">v1.0</div>
        </div>
      </aside>
    </>
  );
}
