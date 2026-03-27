"use client";

import PageLayout from '@/components/core/layout/PageLayout';
import CollectionGrid from '@/components/content/CollectionGrid';
import { useTranslations } from 'next-intl';
import { Puzzle } from 'lucide-react';


export default function ChessKjemPage() {
  const t = useTranslations('ChessFreizeit');

  const apps = [
    {
      id: 'survey-tool',
      title: t('items.surveyTitle'),
      description: t('items.surveyDesc'),
      badgeIcon: <Puzzle></Puzzle>,
      href: '/chess/kjem/umfrage'
    }
  ];

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <section>
        <h2 className="text-xl font-semibold mb-4">{t('collectionTitle')}</h2>
        <CollectionGrid items={apps} columns={6} variant='dense'/>
      </section>
    </PageLayout>
  );
}
