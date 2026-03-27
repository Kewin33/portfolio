"use client";

import AuthGuard from '@/components/core/auth/AuthGuard';
import PageLayout from '@/components/core/layout/PageLayout';
import SurveySchemaEditor from '@/components/survey/schema/page';
import SurveyQuickNav from '@/components/survey/SurveyQuickNav';
import { useTranslations } from 'next-intl';

export default function KjemSurveySchemaPage() {
  const t = useTranslations('SurveyTool');

  return (
    <AuthGuard adminOnly>
      <PageLayout title={t('schemaTitle')} subtitle={t('schemaSubtitle')}>
        <div className="survey-tool">
          <SurveyQuickNav />
          <SurveySchemaEditor />
        </div>
      </PageLayout>
    </AuthGuard>
  );
}
