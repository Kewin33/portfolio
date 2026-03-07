"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import Timeline, { TimelineEvent } from "../../../components/timeline/Timeline";
import TagSelect from '@/components/timeline/TagSelect';
import useTimelineData from '@/hooks/useTimelineData';

const TAB_KEYS = ["education", "projects", "hardskills", "awards", "softskills"] as const;
type TabKey = typeof TAB_KEYS[number];

const tabToTagMap: Record<TabKey, string> = {
  education: 'education',
  projects: 'project',
  hardskills: 'hardskill',
  awards: 'award',
  softskills: 'softskill'
};

export default function CVPage() {
  const t = useTranslations('CV');
  const tt = useTranslations('Timeline');
  const [active, setActive] = useState<TabKey>('education');

  const defaultEvents = useMemo<TimelineEvent[]>(() => [], []);

  const { events, tagColors, isLoading, availableTags, fetchTagsList } = useTimelineData(defaultEvents, []);
  const [zoomPercent, setZoomPercent] = useState(0.01);

  const activeTag = tabToTagMap[active];
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

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <TagSelect
            availableTags={availableTags}
            selected={[]}
            onChange={() => { /* no-op: tabs drive filter */ }}
            onCreate={fetchTagsList}
            placeholder={tt('filterTags') ?? 'Filter tags'}
            allowCreate={false}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-16">{tt('zoom') ?? 'Zoom'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomPercent(p => Math.max(0.001, p / 2))}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={0.001}
              max={220}
              step={0.001}
              value={zoomPercent}
              onChange={(e) => setZoomPercent(Number(e.target.value))}
              className="w-20 sm:w-28 md:w-32 lg:w-40"
            />
            <button
              onClick={() => setZoomPercent(p => Math.min(220, p * 2))}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoomPercent(100)}
              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reset
            </button>
          </div>
          <span className="text-sm text-gray-500 w-24 text-right">{formatZoom(zoomPercent)}</span>
        </div>
      </div>

      <div className="w-full lg:pr-[26rem] overflow-x-auto hide-scrollbar pb-2">
        {isLoading ? (
          <div className="text-gray-500 dark:text-gray-400">{tt('loading') ?? 'Loading timeline...'}</div>
        ) : (
          <Timeline events={timelineEvents} tagColors={tagColors} zoom={Math.max(0.0001, zoomPercent / 100)} />
        )}
      </div>
    </motion.div>
  );
}
