import { PuzzleItem } from '@/components/chess/puzzles/types';

interface PuzzleRoadmapProps {
  items: PuzzleItem[];
  selectedId?: string;
  solvedPuzzleIds: string[];
  onSelect: (id: string) => void;
}

export default function PuzzleRoadmap({
  items,
  selectedId,
  solvedPuzzleIds,
  onSelect,
}: PuzzleRoadmapProps) {
  if (!items.length) return null;

  const solvedSet = new Set(solvedPuzzleIds || []);
  const sorted = [...items].sort((a, b) => a.roadmapOrder - b.roadmapOrder);

  const visibleItems: Array<{
    puzzle: PuzzleItem;
    solved: boolean;
    unlocked: boolean;
    selectable: boolean;
  }> = [];

  let allBeforeSolved = true;
  let shownNextLocked = false;

  for (const puzzle of sorted) {
    const solved = solvedSet.has(puzzle.id);
    const unlocked = allBeforeSolved;
    const selectable = solved || unlocked;
    const shouldShow = unlocked || solved || !shownNextLocked;

    if (shouldShow) {
      visibleItems.push({ puzzle, solved, unlocked, selectable });
    }

    if (!unlocked && !solved && !shownNextLocked) {
      shownNextLocked = true;
    }

    allBeforeSolved = allBeforeSolved && solved;
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 p-4 md:p-5">
      <div className="space-y-3">
        {visibleItems.map(({ puzzle, solved, unlocked, selectable }, index) => {
          const active = selectedId === puzzle.id;
          const locked = !solved && !unlocked;
          return (
            <button
              key={puzzle.id}
              disabled={!selectable}
              onClick={() => {
                if (selectable) onSelect(puzzle.id);
              }}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-all relative ${
                active
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm'
                  : locked
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/60 opacity-75'
                    : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-sm'
              }`}
            >
              {index < visibleItems.length - 1 && (
                <div className="absolute left-6 top-full h-3 w-px bg-slate-300 dark:bg-slate-700" />
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                    solved
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : locked
                        ? 'bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        : 'bg-blue-500 border-blue-500 text-white'
                  }`}
                >
                  {solved ? 'OK' : puzzle.roadmapOrder}
                </div>
                <div>
                  <div className="text-xs text-slate-500">Step {puzzle.roadmapOrder}</div>
                  <div className="font-semibold text-sm mt-0.5 line-clamp-2">{puzzle.title}</div>
                  <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                    {solved
                      ? 'Solved'
                      : locked
                        ? 'Locked'
                        : 'Unlocked'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}