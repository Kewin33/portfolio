'use client';

import { usePathname } from '@/i18n/routing';
import Breadcrumb from '@/components/core/layout/Breadcrumb';
import AccountControls from '@/components/core/auth/AccountControls';

export default function TopBar() {
  const pathname = usePathname();

  if (pathname === '/') {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md px-3 py-1.5 md:px-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Breadcrumb />
        </div>
        <div className="shrink-0">
          <AccountControls variant="topbar" />
        </div>
      </div>
    </div>
  );
}
