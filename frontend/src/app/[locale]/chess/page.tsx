"use client";

import PageLayout from '@/components/core/layout/PageLayout';
import { useTranslations } from 'next-intl';
import Timeline from '@/components/timeline/Timeline';
import type { TimelineEvent } from '@/components/timeline/Timeline';
import { useEffect, useState } from 'react';
import ChessBoardComponent from '@/components/chess/ChessBoard';
import CollectionGrid, { CollectionItem } from '@/components/content/CollectionGrid';
import { Puzzle, Tent, Wrench } from 'lucide-react';

export default function ChessPage() {
  const t = useTranslations('ChessPage');

  const chessSections: CollectionItem[] = [
    { id: 'puzzles', title: t('sections.puzzlesTitle'), description: t('sections.puzzlesDesc'), href: '/chess/puzzles', badgeIcon: <Puzzle className="w-8 h-8" strokeWidth={1.5} /> },
    //{ id: 'variants', title: t('sections.variantsTitle'), description: t('sections.variantsDesc'), href: '/chess/variants', badgeIcon: <Swords className="w-8 h-8" strokeWidth={1.5} /> },
    //{ id: 'tournaments', title: t('sections.tournamentsTitle'), description: t('sections.tournamentsDesc'), href: '/chess/tournaments', badgeIcon: <Trophy className="w-8 h-8" strokeWidth={1.5} /> },
    { id: 'kjem', title: t('sections.freizeitTitle'), description: t('sections.freizeitDesc'), href: '/chess/kjem', badgeIcon: <Tent className="w-8 h-8" strokeWidth={1.5} /> },
    { id: 'tools', title: t('sections.analysisTitle'), description: t('sections.analysisDesc'), href: '/chess/analysis', badgeIcon: <Wrench className="w-8 h-8" strokeWidth={1.5} /> },
    //{ id: 'collection', title: t('sections.collectionTitle'), description: t('sections.collectionDesc'), href: '/chess/collection', badgeIcon: <Library className="w-8 h-8" strokeWidth={1.5} /> },
  ];

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="flex flex-col gap-12">

        <CollectionGrid items={chessSections} columns={6} variant="dense" />
      </div>
      <div className="mt-96">
        <h3 className="text-3xl font-semibold mb-12">{t('timelineTitle')}</h3>
        <div className="bg-white/90 dark:bg-slate-900 rounded-xl p-4">
          <EmbeddedTimeline />
        </div>
      </div>
      {/* Example Lichess Embed Skeleton 
      <div className="mt-16">
        <h3 className="text-xl font-bold mb-6">{t('studyTitle')}</h3>
        <div className="w-full aspect-video md:aspect-[21/9] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 relative flex items-center justify-center">
          <span className="text-slate-500 dark:text-slate-300 font-mono">{t('studyPlaceholder')}</span>
        </div>
      </div>
      */}

    </PageLayout>
  );
}

function EmbeddedTimeline() {
  const t = useTranslations('ChessPage');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = new URL(`${apiBase}/api/storage/timeline/events`);
        url.searchParams.set('tags', 'Schach');
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!mounted) return;
        setEvents((data.events ?? []));
        setTagColors(data.tagColors ?? {});
      } catch {
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  if (loading) return <div className="text-sm text-slate-500">{t('timelineLoading')}</div>;
  if (!events.length) return <div className="text-sm text-slate-500">{t('timelineEmpty')}</div>;

  return <Timeline events={events} tagColors={tagColors} />;
}
