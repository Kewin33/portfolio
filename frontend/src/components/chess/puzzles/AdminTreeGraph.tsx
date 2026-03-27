'use client';

import { useTranslations } from 'next-intl';
import { PuzzleMoveNode } from '@/components/chess/puzzles/types';

interface AdminTreeGraphProps {
  nodes: PuzzleMoveNode[];
  selectedPath: number[];
  onSelectPath: (path: number[]) => void;
  onUpdateMove: (path: number[], value: string) => void;
  onAddChild: (path: number[]) => void;
  onRemove: (path: number[]) => void;
}

export default function AdminTreeGraph({
  nodes,
  selectedPath,
  onSelectPath,
  onUpdateMove,
  onAddChild,
  onRemove,
}: AdminTreeGraphProps) {
  const t = useTranslations('ChessPuzzles.admin');

  if (!nodes.length) {
    return <div className="text-sm text-slate-500">{t('noCriticalMovesYet')}</div>;
  }

  return (
    <div className="overflow-auto py-2">
      <div className="min-w-max px-2">
        <TreeRow
          nodes={nodes}
          path={[]}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onUpdateMove={onUpdateMove}
          onAddChild={onAddChild}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

interface TreeRowProps extends AdminTreeGraphProps {
  path: number[];
}

function TreeRow({
  nodes,
  path,
  selectedPath,
  onSelectPath,
  onUpdateMove,
  onAddChild,
  onRemove,
}: TreeRowProps) {
  const t = useTranslations('ChessPuzzles.admin');

  return (
    <div className="flex items-start justify-center gap-6">
      {nodes.map((node, idx) => {
        const currentPath = [...path, idx];
        const selected = samePath(currentPath, selectedPath);
        const hasChildren = (node.children || []).length > 0;

        return (
          <div key={currentPath.join('.')} className="flex flex-col items-center">
            <div className={`rounded-xl border p-2 w-52 bg-white/80 dark:bg-slate-900/80 ${selected ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700'}`}>
              <div className="flex gap-1 mb-2">
                <button className="text-xs rounded border px-2 py-1" onClick={() => onSelectPath(currentPath)}>
                  {t('select')}
                </button>
                <button className="text-xs rounded border px-2 py-1" onClick={() => onAddChild(currentPath)}>
                  +
                </button>
                <button className="text-xs rounded border px-2 py-1 text-rose-600" onClick={() => onRemove(currentPath)}>
                  x
                </button>
              </div>
              <input
                value={node.moveUci}
                onChange={(e) => onUpdateMove(currentPath, e.target.value)}
                placeholder={t('uciMovePlaceholder')}
                className="w-full rounded border px-2 py-1 bg-transparent text-sm"
              />
            </div>

            {hasChildren && <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />}

            {hasChildren && (
              <TreeRow
                nodes={node.children || []}
                path={currentPath}
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
                onUpdateMove={onUpdateMove}
                onAddChild={onAddChild}
                onRemove={onRemove}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function samePath(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, idx) => value === b[idx]);
}