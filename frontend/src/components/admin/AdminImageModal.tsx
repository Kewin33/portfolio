"use client";

import { useTranslations } from 'next-intl';

export default function AdminImageModal({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const t = useTranslations('Admin');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="max-h-[90vh] max-w-5xl overflow-hidden rounded-xl bg-white p-3 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded bg-slate-200 px-3 py-1 text-sm dark:bg-slate-700 dark:text-white">{t('actions.close')}</button>
        </div>
        <img src={src} alt={title} className="max-h-[75vh] w-auto max-w-full rounded object-contain" />
      </div>
    </div>
  );
}