"use client";

import AuthGuard from '@/components/core/auth/AuthGuard';
import PageLayout from '@/components/core/layout/PageLayout';
import SurveyDataEntry from '@/components/survey/eingeben/page';
import SurveyQuickNav from '@/components/survey/SurveyQuickNav';
import { useTranslations } from 'next-intl';

export default function KjemSurveyDataEntryPage() {
  const t = useTranslations('SurveyTool');

  return (
    <AuthGuard adminOnly>
      <PageLayout title={t('dataTitle')} subtitle={t('dataSubtitle')}>
        <div className="survey-tool">
          <SurveyQuickNav />
          <SurveyDataEntry />
        </div>
      </PageLayout>
    </AuthGuard>
  );
}
