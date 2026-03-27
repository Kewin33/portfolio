"use client";

import PageLayout from '@/components/core/layout/PageLayout';
import AuthGuard from '@/components/core/auth/AuthGuard';
import { useTranslations } from 'next-intl';

export default function HobbiesPage() {
  const t = useTranslations('HobbiesPage');

  const items = [
    t('items.chess'),
    t('items.music'),
    t('items.fitness'),
    t('items.travel')
  ];

  return (
    <AuthGuard adminOnly>
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-4 py-8 text-center font-medium text-slate-700 dark:text-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    </PageLayout>
    </AuthGuard>
  );
}
