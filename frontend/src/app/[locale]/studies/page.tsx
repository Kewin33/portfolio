"use client";

import PageLayout from '@/components/core/layout/PageLayout';
import AuthGuard from '@/components/core/auth/AuthGuard';
import { useTranslations } from 'next-intl';

export default function StudiesPage() {
  const t = useTranslations('StudiesPage');

  return (
    <AuthGuard adminOnly>
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold mb-4">{t('toolTitle')}</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">{t('toolDescription')}</p>
          <div className="h-32 bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-300 font-mono text-sm max-w-xs text-center">{t('toolPlaceholder')}</span>
          </div>
        </div>
      </div>
    </PageLayout>
    </AuthGuard>
  );
}
