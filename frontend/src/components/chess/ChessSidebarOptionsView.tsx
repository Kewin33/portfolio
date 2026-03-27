'use client';

interface ChessSidebarOptionsViewProps {
  engineEnabled: boolean;
  editMode: boolean;
  analysisDepth: number;
  multiPv: number;
  threads: number;
  hashMb: number;
  onToggleEngine: () => void;
  onAnalysisDepthChange: (value: number) => void;
  onMultiPvChange: (value: number) => void;
  onThreadsChange: (value: number) => void;
  onHashMbChange: (value: number) => void;
  onToggleEditMode: () => void;
  onReset: () => void;
}

export default function ChessSidebarOptionsView({
  engineEnabled,
  editMode,
  analysisDepth,
  multiPv,
  threads,
  hashMb,
  onToggleEngine,
  onAnalysisDepthChange,
  onMultiPvChange,
  onThreadsChange,
  onHashMbChange,
  onToggleEditMode,
  onReset,
}: ChessSidebarOptionsViewProps) {
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

  return (
    <div className="p-4 space-y-4 min-h-[420px] bg-gray-50/70 dark:bg-gray-800/30">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Optionen</p>

        <button
          onClick={onToggleEngine}
          className={`w-full px-3 py-2 rounded text-left transition-colors ${
            engineEnabled
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Engine {engineEnabled ? 'aktiv' : 'aus'}
        </button>

        <button
          onClick={onToggleEditMode}
          className={`w-full px-3 py-2 rounded text-left transition-colors ${
            editMode
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Stellung aufbauen {editMode ? '(aktiv)' : ''}
        </button>

        <button
          onClick={onReset}
          className="w-full px-3 py-2 rounded text-left bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200"
        >
          Reset Board
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Analyse</p>

        <label className="block text-xs text-gray-500">
          <div className="mb-1 flex items-center justify-between">
            <span>Depth</span>
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

        <label className="block text-xs text-gray-500">
          <div className="mb-1 flex items-center justify-between">
            <span>Lines</span>
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

        <label className="block text-xs text-gray-500">
          <div className="mb-1 flex items-center justify-between">
            <span>Threads</span>
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

        <label className="block text-xs text-gray-500">
          <div className="mb-1 flex items-center justify-between">
            <span>Memory (MB)</span>
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

        {/* Fast Stockfish mode removed */}
      </div>
    </div>
  );
}