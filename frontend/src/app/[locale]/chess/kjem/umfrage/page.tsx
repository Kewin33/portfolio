"use client";

import PageLayout from '@/components/core/layout/PageLayout';
import AuthGuard from '@/components/core/auth/AuthGuard';
import CollectionGrid, { CollectionItem } from '@/components/content/CollectionGrid';
import SurveyQuickNav from '@/components/survey/SurveyQuickNav';
import { useTranslations } from 'next-intl';
import { BarChart2, Edit3, PlusCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function KjemSurveyDashboardPage() {
  const t = useTranslations('SurveyTool');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE =
      (process.env.NEXT_PUBLIC_API_BASE as string) ||
      (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
      '';

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role === 'admin') setIsAdmin(true);
      })
      .catch(() => {
        setIsAdmin(false);
      });
  }, []);

  const items: CollectionItem[] = useMemo(() => {
    const base: CollectionItem[] = [
      {
        id: 'analysis',
        title: t('cards.analysisTitle'),
        description: t('cards.analysisDesc'),
        href: '/chess/kjem/umfrage/auswertung',
        badgeIcon: <BarChart2 className="w-8 h-8" strokeWidth={1.5} />,
      },
    ];
    if (!isAdmin) return base;

    return [
      ...base,
      {
        id: 'data-entry',
        title: t('cards.dataTitle'),
        description: t('cards.dataDesc'),
        href: '/chess/kjem/umfrage/eingeben',
        badgeIcon: <Edit3 className="w-8 h-8" strokeWidth={1.5} />,
      },
      {
        id: 'schema',
        title: t('cards.schemaTitle'),
        description: t('cards.schemaDesc'),
        href: '/chess/kjem/umfrage/schema',
        badgeIcon: <PlusCircle className="w-8 h-8" strokeWidth={1.5} />,
      },
    ];
  }, [isAdmin, t]);

  return (
    <AuthGuard requiredRole="friend">
      <PageLayout title={t('title')} subtitle={t('subtitle')}>
        <div className="survey-tool">
        <SurveyQuickNav />
        <section>
          <CollectionGrid items={items} columns={3} />
        </section>
        </div>
      </PageLayout>
    </AuthGuard>
  );
}
