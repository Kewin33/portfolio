"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import Timeline, { TimelineEvent } from "../../../components/timeline/Timeline";
import useTimelineData from '@/hooks/useTimelineData';

const TAB_KEYS = ["education", "projects", /*"hardskills",*/ "awards", "softskills"] as const;
type TabKey = typeof TAB_KEYS[number];

const tabToTagMap: Record<TabKey, string> = {
  education: 'Education',
  projects: 'Project',
  //hardskills: 'Hard Skill',
  awards: 'Awards',
  softskills: 'Soft Skills'
};

export default function CVPage() {
  const t = useTranslations('CV');
  const tt = useTranslations('Timeline');
  const [active, setActive] = useState<TabKey>('education');

  const defaultEvents = useMemo<TimelineEvent[]>(() => [], []);

  const activeTag = tabToTagMap[active];
  const { events, tagColors, isLoading } = useTimelineData(defaultEvents, [activeTag], [activeTag]);
  const filtered = (events || []).filter(ev => (ev.tags || []).includes(activeTag) && !ev.deletedAt);
  const timelineEvents = filtered.length > 0 ? filtered : (events || []).filter(ev => !ev.deletedAt);

  const formatZoom = (p: number) => {
    if (p >= 1) return `${Math.round(p)}%`;
    return `${Number(p).toPrecision(6).replace(/\.0+$/,'')}%`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full px-4 md:px-8 lg:px-12 py-8">
      <h1 className="mt-16 text-3xl font-bold mb-4">{t('title') || 'CV'}</h1>

      <div className="mb-6 flex gap-2 flex-wrap">
        {TAB_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={`px-4 py-2 rounded ${active === k ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
          >
            {t(k) || k}
          </button>
        ))}
      </div>

      {/* CV: no filter or zoom controls here; tabs drive the filtered view */}

      <div className="w-full lg:pr-[26rem] overflow-x-auto hide-scrollbar pb-2">
        {isLoading ? (
          <div className="text-gray-500 dark:text-gray-400">{tt('loading') ?? 'Loading timeline...'}</div>
        ) : (
          <Timeline
              events={timelineEvents}
              tagColors={tagColors}
              zoom={0.001 / 100} // match Timeline page's percent->fraction convention
            />
        )}
      </div>
    </motion.div>
  );
}
