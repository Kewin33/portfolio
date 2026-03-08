"use client";

import React from "react";
import { useTranslations } from "next-intl";
import TagSelect from "@/components/timeline/TagSelect";

interface Props {
  availableTags: { tag: string; count: number; color?: string | null }[];
  selected: string[];
  onChange: (next: string[]) => void;
  onCreate?: () => void;
  zoomPercent: number;
  setZoomPercent: React.Dispatch<React.SetStateAction<number>>;
  showZoom?: boolean;
}

export default function FilterBar({ availableTags, selected, onChange, onCreate, zoomPercent, setZoomPercent, showZoom = true }: Props) {
  const t = useTranslations('Timeline');

  const formatZoom = (p: number) => {
    if (p >= 1) return `${Math.round(p)}%`;
    return `${Number(p).toPrecision(6).replace(/\.0+$/,'')}%`;
  };

  return (
    <div className="mb-4 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <TagSelect
          availableTags={availableTags}
          selected={selected}
          onChange={onChange}
          onCreate={onCreate}
          placeholder={t('filterTags') ?? 'Filter tags'}
          allowCreate={true}
        />
      </div>

      {showZoom && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-16">{t('zoom') ?? 'Zoom'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomPercent(p => Math.max(0.0001, p / 2))}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={0.0001}
              max={25}
              step={0.0001}
              value={zoomPercent}
              onChange={(e) => setZoomPercent(Number(e.target.value))}
              className="w-20 sm:w-28 md:w-32 lg:w-40"
            />
            <button
              onClick={() => setZoomPercent(p => Math.min(25, p * 2))}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoomPercent(0.001)}
              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reset
            </button>
          </div>
          <span className="text-sm text-gray-500 w-24 text-right">{formatZoom(zoomPercent)}</span>
        </div>
      )}
    </div>
  );
}
