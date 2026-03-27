'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb() {
  const pathname = usePathname();
  const locale = useLocale();

  // Remove locale from pathname
  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
  const segments = pathWithoutLocale.split('/').filter(Boolean);

  // Map of slug to display text
  const slugMap: Record<string, string> = {
    'chess': 'Chess',
    'puzzles': 'Puzzles',
    'cv': 'CV',
    'timeline': 'Timeline',
    'music': 'Music',
    'studies': 'Studies',
    'hobbies': 'Hobbies',
    'sports': 'Sports',
    'admin': 'Admin',
    'profile': 'Profile',
    'survey': 'Survey',
  };

  const getBreadcrumbs = () => {
    const crumbs = [{ name: 'Home', path: '/', active: segments.length === 0 }];

    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      const isLast = i === segments.length - 1;
      crumbs.push({
        name: slugMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentPath,
        active: isLast,
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length === 1 && breadcrumbs[0].active) {
    return null; // Don't show breadcrumb on home page
  }

  return (
    <nav
      className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"
      aria-label="Breadcrumb"
    >
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
          )}
          {crumb.active ? (
            <span className="text-slate-900 dark:text-slate-100 font-medium">
              {crumb.name}
            </span>
          ) : (
            <Link
              href={crumb.path}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
