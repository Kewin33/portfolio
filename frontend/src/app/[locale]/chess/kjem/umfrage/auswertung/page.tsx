"use client";

import AuthGuard from '@/components/core/auth/AuthGuard';
import PageLayout from '@/components/core/layout/PageLayout';
import SurveyAnalysis from '@/components/survey/auswertung/page';
import SurveyQuickNav from '@/components/survey/SurveyQuickNav';
import { useTranslations } from 'next-intl';

export default function KjemSurveyAnalysisPage() {
  const t = useTranslations('SurveyTool');

  return (
    <AuthGuard requiredRole="friend">
      <PageLayout title={t('analysisTitle')} subtitle={t('analysisSubtitle')}>
        <div className="survey-tool">
          <SurveyQuickNav />
          <SurveyAnalysis />
        </div>
      </PageLayout>
    </AuthGuard>
  );
}
