"use client";

import PageLayout from '@/components/PageLayout';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function ChessPage() {
  const t = useTranslations('ChessPage');

  const chessSections = [
    { id: 'puzzles', title: t('sections.puzzlesTitle'), desc: t('sections.puzzlesDesc') },
    { id: 'variants', title: t('sections.variantsTitle'), desc: t('sections.variantsDesc') },
    { id: 'tournaments', title: t('sections.tournamentsTitle'), desc: t('sections.tournamentsDesc') },
    { id: 'freizeit', title: t('sections.freizeitTitle'), desc: t('sections.freizeitDesc') },
  ];

  return (
    <PageLayout title={t('title')} subtitle={t('subtitle')}>
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
  );
}
