"use client";

import PageLayout from '@/components/core/layout/PageLayout';
import AuthGuard from '@/components/core/auth/AuthGuard';
import { useTranslations } from 'next-intl';

export default function SportsPage() {
  const t = useTranslations('SportsPage');

  return (
    <AuthGuard adminOnly>
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="aspect-[9/16] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center">
            <span className="text-slate-500 dark:text-slate-300 font-mono text-xs">{t('video')} {i}</span>
          </div>
        ))}
      </div>
    </PageLayout>
    </AuthGuard>
  );
}
