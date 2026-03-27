'use client';

import { useTranslations } from 'next-intl';

interface ChessFenPgnPanelProps {
  inputFen: string;
  inputPgn: string;
  onInputFenChange: (value: string) => void;
  onInputPgnChange: (value: string) => void;
}

export default function ChessFenPgnPanel({
  inputFen,
  inputPgn,
  onInputFenChange,
  onInputPgnChange,
}: ChessFenPgnPanelProps) {
  const t = useTranslations('ChessFenPgnPanel');

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3 w-full">
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-gray-500">{t('fenLabel')}</label>
        <textarea
          value={inputFen}
          onChange={(e) => onInputFenChange(e.target.value)}
          className="w-full min-h-[72px] px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 font-mono"
          placeholder={t('fenPlaceholder')}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-gray-500">{t('pgnLabel')}</label>
        <textarea
          value={inputPgn}
          onChange={(e) => onInputPgnChange(e.target.value)}
          className="w-full min-h-[120px] px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 font-mono"
          placeholder={t('pgnPlaceholder')}
        />
      </div>
    </div>
  );
}