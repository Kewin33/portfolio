'use client';

import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ChessSidebarAnalysisView from '@/components/chess/ChessSidebarAnalysisView';
import ChessSidebarExplorerPanel from '@/components/chess/ChessSidebarExplorerPanel';
import ChessSidebarOptionsView from '@/components/chess/ChessSidebarOptionsView';
import { useEffect, useState } from 'react';

interface EngineLine {
  multipv: number;
  depth: number;
  scoreText: string;
  pvSan: string;
  isLong: boolean;
}

interface ChessSidebarProps {
  showAnalysisTools: boolean;
  engineEnabled: boolean;
  evaluation: string;
  engineLabel: string;
  analysisSource: 'idle' | 'cloud' | 'local';
  engineDepth: number;
  engineNpsMn: string;
  isAnalyzing: boolean;
  progressPercent: number;
  lines: EngineLine[];
  settingsOpen: boolean;
  analysisDepth: number;
  multiPv: number;
  threads: number;
  hashMb: number;
  currentFen: string;
  moves: string[];
  positionIndex: number;
  menuOpen: boolean;
  editMode: boolean;
  onToggleEngine: () => void;
  onToggleSettings: () => void;
  onAnalysisDepthChange: (value: number) => void;
  onMultiPvChange: (value: number) => void;
  onThreadsChange: (value: number) => void;
  onHashMbChange: (value: number) => void;
  
  onGoToMove: (index: number) => void;
  onPlayUciMove: (uci: string) => boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleMenu: () => void;
  onToggleEditMode: () => void;
  onReset: () => void;
}

export default function ChessSidebar({
  showAnalysisTools,
  engineEnabled,
  evaluation,
  engineLabel,
  analysisSource,
  engineDepth,
  engineNpsMn,
  isAnalyzing,
  progressPercent,
  lines,
  settingsOpen,
  analysisDepth,
  multiPv,
  threads,
  hashMb,
  currentFen,
  moves,
  positionIndex,
  menuOpen,
  editMode,
  onToggleEngine,
  onToggleSettings,
  onAnalysisDepthChange,
  onMultiPvChange,
  onThreadsChange,
  onHashMbChange,
  
  onGoToMove,
  onPlayUciMove,
  onPrev,
  onNext,
  onToggleMenu,
  onToggleEditMode,
  onReset,
}: ChessSidebarProps) {
  const t = useTranslations('ChessSidebar');
  const [explorerOpen, setExplorerOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      setExplorerOpen(false);
    }
  }, [menuOpen]);

  return (
    <aside className="relative w-full h-full max-w-none xl:max-w-[420px] rounded-xl border border-violet-200/80 dark:border-violet-900/70 bg-white dark:bg-gray-900 shadow-lg overflow-hidden flex flex-col min-h-0">
      {showAnalysisTools && menuOpen ? (
        <ChessSidebarOptionsView
          engineEnabled={engineEnabled}
          editMode={editMode}
          analysisDepth={analysisDepth}
          multiPv={multiPv}
          threads={threads}
          hashMb={hashMb}
          onToggleEngine={onToggleEngine}
          onAnalysisDepthChange={onAnalysisDepthChange}
          onMultiPvChange={onMultiPvChange}
          onThreadsChange={onThreadsChange}
          onHashMbChange={onHashMbChange}
          onToggleEditMode={onToggleEditMode}
          onReset={onReset}
        />
      ) : (
        <ChessSidebarAnalysisView
          showEngineHeader={showAnalysisTools}
          engineEnabled={engineEnabled}
          evaluation={evaluation}
          engineLabel={engineLabel}
          analysisSource={analysisSource}
          engineDepth={engineDepth}
          engineNpsMn={engineNpsMn}
          isAnalyzing={isAnalyzing}
          progressPercent={progressPercent}
          lines={lines}
          settingsOpen={showAnalysisTools ? settingsOpen : false}
          analysisDepth={analysisDepth}
          multiPv={multiPv}
          threads={threads}
          hashMb={hashMb}
          moves={moves}
          positionIndex={positionIndex}
          onToggleEngine={onToggleEngine}
          onToggleSettings={onToggleSettings}
          onAnalysisDepthChange={onAnalysisDepthChange}
          onMultiPvChange={onMultiPvChange}
          onThreadsChange={onThreadsChange}
          onHashMbChange={onHashMbChange}
          onGoToMove={onGoToMove}
        />
      )}

      {showAnalysisTools && explorerOpen && (
        <ChessSidebarExplorerPanel
          currentFen={currentFen}
          onPlayUciMove={onPlayUciMove}
          onClose={() => setExplorerOpen(false)}
        />
      )}

      <div className="p-4">
        <div className={`grid ${showAnalysisTools ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
          <button
            onClick={onPrev}
            disabled={positionIndex <= 0}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
            aria-label={t('actions.previous')}
          >
            ←
          </button>
          <button
            onClick={onNext}
            disabled={positionIndex >= moves.length}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
            aria-label={t('actions.next')}
          >
            →
          </button>
          {showAnalysisTools && (
            <button
              onClick={onToggleMenu}
              className={`px-4 py-2 rounded transition-colors ${
                menuOpen
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100 hover:bg-violet-200 dark:hover:bg-violet-900/60'
              }`}
              aria-label={t('actions.menu')}
            >
              ☰
            </button>
          )}
          {showAnalysisTools && (
            <button
              onClick={() => setExplorerOpen((prev) => !prev)}
              className={`px-3 py-2 rounded transition-colors flex items-center justify-center ${
                explorerOpen
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100 hover:bg-violet-200 dark:hover:bg-violet-900/60'
              }`}
              aria-label={t('actions.openingExplorer')}
              title={t('titles.openingExplorerTablebase')}
            >
              <BookOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
