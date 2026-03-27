'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EngineLine {
  multipv: number;
  depth: number;
  scoreText: string;
  pvSan: string;
  isLong: boolean;
}

interface ChessSidebarAnalysisViewProps {
  showEngineHeader?: boolean;
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
  moves: string[];
  positionIndex: number;
  onToggleEngine: () => void;
  onToggleSettings: () => void;
  onAnalysisDepthChange: (value: number) => void;
  onMultiPvChange: (value: number) => void;
  onThreadsChange: (value: number) => void;
  onHashMbChange: (value: number) => void;
  onGoToMove: (index: number) => void;
}

export default function ChessSidebarAnalysisView({
  showEngineHeader = true,
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
  moves,
  positionIndex,
  onToggleEngine,
  onToggleSettings,
  onAnalysisDepthChange,
  onMultiPvChange,
  onThreadsChange,
  onHashMbChange,
  onGoToMove,
}: ChessSidebarAnalysisViewProps) {
  const t = useTranslations('ChessSidebar');
  const [expandedLines, setExpandedLines] = useState<Record<number, boolean>>({});

  const depthSteps = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
  const lineSteps = [1, 2, 3, 4, 5];
  const threadSteps = [1, 2, 4, 6, 8, 12, 16];
  const hashSteps = [128, 256, 512, 1024, 1536, 2048];

  const getStepIndex = (steps: number[], value: number) => {
    const exact = steps.indexOf(value);
    if (exact >= 0) return exact;
    let bestIndex = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let i = 0; i < steps.length; i += 1) {
      const delta = Math.abs(steps[i] - value);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }
    return bestIndex;
  };

  const movePairs: Array<{ moveNumber: number; white: string; black: string }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || '',
    });
  }

  const sourceLabel =
    analysisSource === 'cloud' ? t('source.cloud') : analysisSource === 'local' ? t('source.local') : t('source.idle');
  const sourceClasses =
    analysisSource === 'cloud'
      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
      : analysisSource === 'local'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

  return (
    <div className="relative flex flex-1 flex-col min-h-0">
      {showEngineHeader && (
        <div className="sticky top-0 z-30 relative">
          <div className="border-y border-violet-200/80 dark:border-violet-900/80 bg-gradient-to-br from-violet-50 via-gray-50 to-violet-100 dark:from-violet-950/50 dark:via-gray-900 dark:to-violet-900/40 backdrop-blur">
            {engineEnabled && (
              <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-violet-200/60 dark:bg-violet-900/50">
                <div
                  className="relative h-full bg-violet-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                >
                  {isAnalyzing && <div className="progress-spark absolute inset-y-0 w-10" />}
                </div>
              </div>
            )}

            <div className="p-4 flex items-center gap-2">
            <button
              onClick={onToggleEngine}
              className={`w-11 h-5 rounded-full relative transition-colors ${
                engineEnabled ? 'bg-violet-600' : 'bg-gray-400'
              }`}
              aria-label={t('actions.toggleEngine')}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                  engineEnabled ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>

            <p className="text-violet-700 dark:text-violet-300 font-mono text-lg leading-tight">{evaluation}</p>
            <div className="min-w-0 leading-tight">
              <p className="min-w-0 truncate text-xs text-violet-700/90 dark:text-violet-300/90">
                {engineLabel}
              </p>
              {engineEnabled && (
                <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <span>{t('controls.depth')} {engineDepth || '-'}</span>
                  <span>|</span>
                  <span>{engineNpsMn}</span>
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${sourceClasses}`}>{sourceLabel}</span>
                </div>
              )}
            </div>

            <button
              onClick={onToggleSettings}
              className="ml-auto h-7 w-7 flex items-center justify-center rounded-md text-violet-700 dark:text-violet-300 hover:bg-violet-100/70 dark:hover:bg-violet-900/40"
              aria-label={t('actions.engineSettings')}
            >
              <Settings className="h-4 w-4" />
            </button>
            </div>

          </div>

          {settingsOpen && (
            <div className="absolute left-3 right-3 top-full mt-2 z-40 rounded-lg border border-violet-200 dark:border-violet-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-3 shadow-xl">
              <div className="space-y-3 text-xs">
                <label className="block text-gray-600 dark:text-gray-300">
                  <div className="mb-1 flex items-center justify-between">
                    <span>{t('controls.depth')}</span>
                    <span className="font-mono">{analysisDepth}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={depthSteps.length - 1}
                    step={1}
                    value={getStepIndex(depthSteps, analysisDepth)}
                    onChange={(e) => onAnalysisDepthChange(depthSteps[Number(e.target.value)])}
                    className="w-full"
                  />
                </label>
                <label className="block text-gray-600 dark:text-gray-300">
                  <div className="mb-1 flex items-center justify-between">
                    <span>{t('controls.lines')}</span>
                    <span className="font-mono">{multiPv}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={lineSteps.length - 1}
                    step={1}
                    value={getStepIndex(lineSteps, multiPv)}
                    onChange={(e) => onMultiPvChange(lineSteps[Number(e.target.value)])}
                    className="w-full"
                  />
                </label>
                <label className="block text-gray-600 dark:text-gray-300">
                  <div className="mb-1 flex items-center justify-between">
                    <span>{t('controls.threads')}</span>
                    <span className="font-mono">{threads}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={threadSteps.length - 1}
                    step={1}
                    value={getStepIndex(threadSteps, threads)}
                    onChange={(e) => onThreadsChange(threadSteps[Number(e.target.value)])}
                    className="w-full"
                  />
                </label>
                <label className="block text-gray-600 dark:text-gray-300">
                  <div className="mb-1 flex items-center justify-between">
                    <span>{t('controls.memoryMb')}</span>
                    <span className="font-mono">{hashMb} MB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={hashSteps.length - 1}
                    step={1}
                    value={getStepIndex(hashSteps, hashMb)}
                    onChange={(e) => onHashMbChange(hashSteps[Number(e.target.value)])}
                    className="w-full"
                  />
                </label>
                {/* Fast Stockfish toggle removed */}
              </div>
            </div>
          )}
        </div>
      )}

      {showEngineHeader && engineEnabled && (
        <div className="border-y border-violet-200/80 dark:border-violet-900/70 py-2 px-4 space-y-1.5 text-xs bg-white dark:bg-gray-900">
            {lines.map((line) => {
              const isExpanded = !!expandedLines[line.multipv];
              const movePreview = line.isLong && !isExpanded ? `${line.pvSan.slice(0, 56)}...` : line.pvSan;
              return (
                <div
                  key={line.multipv}
                  className="rounded-md border border-violet-200/70 dark:border-violet-900/60 bg-white/70 dark:bg-violet-950/20 px-2 py-1"
                >
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <p className="font-mono text-violet-700 dark:text-violet-300 whitespace-nowrap">
                      {line.scoreText}
                    </p>
                    <p className="text-gray-700 dark:text-gray-200 truncate">{movePreview || '-'}</p>
                    {line.isLong ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLines((prev) => ({
                            ...prev,
                            [line.multipv]: !prev[line.multipv],
                          }))
                        }
                        className="h-5 w-5 rounded text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                        aria-label={isExpanded ? t('actions.collapseLine') : t('actions.expandLine')}
                      >
                        {isExpanded ? '▴' : '▾'}
                      </button>
                    ) : (
                      <span className="h-5 w-5" />
                    )}
                  </div>
                  {line.isLong && isExpanded && (
                    <p className="mt-1 text-gray-700 dark:text-gray-200 break-words">{line.pvSan}</p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <div className="p-4 flex-1 min-h-[220px] overflow-y-auto border-b border-gray-200 dark:border-gray-700 font-mono text-sm flex flex-col gap-1 bg-gray-50 dark:bg-gray-800/40">
        {movePairs.map((pair, i) => (
          <div
            key={`${pair.moveNumber}-${pair.white}`}
            className="flex gap-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <span className="w-8 text-gray-500">{pair.moveNumber}.</span>
            <button
              onClick={() => onGoToMove(i * 2 + 1)}
              className={`flex-1 text-left px-1 rounded ${
                positionIndex === i * 2 + 1
                  ? 'bg-blue-200 dark:bg-blue-900 font-bold'
                  : 'hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {pair.white}
            </button>
            <button
              onClick={() => onGoToMove(i * 2 + 2)}
              disabled={!pair.black}
              className={`flex-1 text-left px-1 rounded ${
                positionIndex === i * 2 + 2
                  ? 'bg-blue-200 dark:bg-blue-900 font-bold'
                  : pair.black
                  ? 'hover:bg-gray-300 dark:hover:bg-gray-600'
                  : ''
              }`}
            >
              {pair.black}
            </button>
          </div>
        ))}
        {moves.length === 0 && (
          <span className="text-gray-400 italic p-2 text-center block">{t('noMovesYet')}</span>
        )}
      </div>

      <style jsx global>{`
        .progress-spark {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.9) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: progress-spark-move 1s linear infinite;
          filter: blur(0.2px);
        }

        @keyframes progress-spark-move {
          from {
            transform: translateX(-180%);
          }
          to {
            transform: translateX(320%);
          }
        }
      `}</style>
    </div>
  );
}