"use client";

import PageLayout from '@/components/PageLayout';
import AuthGuard from '@/components/AuthGuard';
import { useTranslations } from 'next-intl';

export default function MusicPage() {
  const t = useTranslations('MusicPage');

  return (
    <AuthGuard adminOnly>
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4">{t('playerTitle')}</h2>
        <div className="h-64 bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-300 font-mono">{t('playerPlaceholder')}</span>
        </div>
      </div>
    </PageLayout>
    </AuthGuard>
  );
}
