"use client";

import PageLayout from '@/components/PageLayout';
import AuthGuard from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import Timeline from '@/components/timeline/Timeline';
import { useEffect, useState } from 'react';
import ChessBoardComponent from '@/components/chess/ChessBoard';

export default function ChessPage() {
  const t = useTranslations('ChessPage');

  const chessSections = [
    { id: 'puzzles', title: t('sections.puzzlesTitle'), desc: t('sections.puzzlesDesc') },
    { id: 'variants', title: t('sections.variantsTitle'), desc: t('sections.variantsDesc') },
    { id: 'tournaments', title: t('sections.tournamentsTitle'), desc: t('sections.tournamentsDesc') },
    { id: 'freizeit', title: t('sections.freizeitTitle'), desc: t('sections.freizeitDesc') },
  ];

  return (
    <AuthGuard adminOnly>
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
      <div className="flex flex-col gap-12">
        <section className="bg-white/50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h2 className="text-2xl font-bold mb-6 text-center">{t('boardTitle')}</h2>
          <ChessBoardComponent />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {chessSections.map((section, i) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link 
                href={`/chess/${section.id}`}
                className="block p-8 rounded-2xl bg-white/90 dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-400 transition-all group"
              >
                <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {section.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  {section.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Recent timeline</h3>
        <div className="bg-white/90 dark:bg-slate-900 rounded-xl p-4">
          <EmbeddedTimeline />
        </div>
      </div>
      {/* Example Lichess Embed Skeleton */}
      <div className="mt-16">
        <h3 className="text-xl font-bold mb-6">{t('studyTitle')}</h3>
        <div className="w-full aspect-video md:aspect-[21/9] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 relative flex items-center justify-center">
            {/* Real implementation would be something like:
            <iframe src="https://lichess.org/study/embed/..." /> */}
            <span className="text-slate-500 dark:text-slate-300 font-mono">{t('studyPlaceholder')}</span>
        </div>
      </div>
    </PageLayout>
    </AuthGuard>
  );
}

function TagPalette() {
  return null;
}

function EmbeddedTimeline() {
  const [events, setEvents] = useState<any[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/storage/timeline/events`, { cache: 'no-store' });
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
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading timeline…</div>;
  if (!events.length) return <div className="text-sm text-slate-500">No events yet.</div>;

  return <Timeline events={events} tagColors={tagColors} />;
}
