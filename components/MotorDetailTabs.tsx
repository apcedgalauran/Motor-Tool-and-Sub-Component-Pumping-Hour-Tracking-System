'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';

const TABS = [
  { key: 'info', label: 'Info' },
  { key: 'assembly', label: 'Assembly' },
  { key: 'files', label: 'Files' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

type MotorDetailTabsProps = {
  infoContent: ReactNode;
  assemblyContent: ReactNode;
  filesContent: ReactNode;
};

export function MotorDetailTabs({
  infoContent,
  assemblyContent,
  filesContent,
}: MotorDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get('tab');
  const activeTab: TabKey =
    rawTab === 'assembly' || rawTab === 'files' ? rawTab : 'info';

  const switchTab = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'info') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div>
      {/* Tab bar — horizontal scroll on mobile */}
      <div className="mb-6 overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-1 min-w-max border-b border-[var(--border)]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchTab(tab.key)}
                className={`relative px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-[#121212]'
                    : 'text-[#999] hover:text-[#555]'
                }`}
              >
                {tab.label}
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#9E9EB0]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'info' && infoContent}
        {activeTab === 'assembly' && assemblyContent}
        {activeTab === 'files' && filesContent}
      </div>
    </div>
  );
}
