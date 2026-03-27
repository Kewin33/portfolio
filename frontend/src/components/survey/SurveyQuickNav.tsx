"use client";

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LayoutGrid, BarChart3, PencilLine, Workflow, Compass } from 'lucide-react';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string) ||
  (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
  '';

export default function SurveyQuickNav() {
  const t = useTranslations('SurveyTool.nav');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.role === 'admin'))
      .catch(() => setIsAdmin(false));
  }, []);

  const items = useMemo(
    () => [
      {
        href: '/chess/kjem/umfrage',
        label: t('dashboard'),
        icon: <LayoutGrid className="w-4 h-4" strokeWidth={2} />,
        adminOnly: false,
      },
      {
        href: '/chess/kjem/umfrage/auswertung',
        label: t('analysis'),
        icon: <BarChart3 className="w-4 h-4" strokeWidth={2} />,
        adminOnly: false,
      },
      {
        href: '/chess/kjem/umfrage/eingeben',
        label: t('data'),
        icon: <PencilLine className="w-4 h-4" strokeWidth={2} />,
        adminOnly: true,
      },
      {
        href: '/chess/kjem/umfrage/schema',
        label: t('schema'),
        icon: <Workflow className="w-4 h-4" strokeWidth={2} />,
        adminOnly: true,
      },
      {
        href: '/chess/kjem',
        label: t('backToKjem'),
        icon: <Compass className="w-4 h-4" strokeWidth={2} />,
        adminOnly: false,
      },
    ],
    [t]
  );

  return (
    <section className="survey-shell mb-8">
      <div className="survey-shell-badge">{t('externalHint')}</div>
      <nav className="survey-shell-links" aria-label={t('label')}>
        {items
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <Link key={item.href} href={item.href} className="survey-shell-link">
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
      </nav>
    </section>
  );
}
