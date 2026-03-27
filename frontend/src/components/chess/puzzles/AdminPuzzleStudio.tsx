'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { useTranslations } from 'next-intl';
import ChessBoardComponent from '@/components/chess/ChessBoard';
import AdminTreeGraph from '@/components/chess/puzzles/AdminTreeGraph';
import { fetchAdminPuzzles, removePuzzle, reorderAdminPuzzles, savePuzzle } from '@/components/chess/puzzles/api';
import { PuzzleItem, PuzzleMoveNode } from '@/components/chess/puzzles/types';
import { firstLineFromTree, normalizePuzzleTree } from '@/components/chess/puzzles/tree';

const START_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

interface AdminPuzzleStudioProps {
  labels: {
    title: string;
    setupMode: string;
    recordMode: string;
    save: string;
    delete: string;
    dashboard: string;
    saved: string;
    loaded: string;
  };
  onChanged: () => Promise<void>;
}

export default function AdminPuzzleStudio({ labels, onChanged }: AdminPuzzleStudioProps) {
  const t = useTranslations('ChessPuzzles.admin');
  const [items, setItems] = useState<PuzzleItem[]>([]);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error'>('idle');

  const [id, setId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);

  const [builderFen, setBuilderFen] = useState(START_FEN);
  const [tree, setTree] = useState<PuzzleMoveNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [boardKey, setBoardKey] = useState(0);
  const [mode, setMode] = useState<'setup' | 'tree'>('setup');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const loadItems = async () => {
    const data = await fetchAdminPuzzles();
    setItems(data);
  };

  useEffect(() => {
    loadItems().catch(() => {
      setStatus(t('failedToLoad'));
      setStatusType('error');
    });
  }, []);

  const cloneTree = (nodes: PuzzleMoveNode[]): PuzzleMoveNode[] =>
    nodes.map((n) => ({ moveUci: n.moveUci, children: cloneTree(n.children || []) }));

  const updateMoveAtPath = (path: number[], value: string) => {
    setTree((prev) => {
      const next = cloneTree(prev);
      let cursor = next;
      for (let i = 0; i < path.length; i += 1) {
        const idx = path[i];
        if (!cursor[idx]) return prev;
        if (i === path.length - 1) {
          cursor[idx].moveUci = value.toLowerCase().trim();
        } else {
          cursor = cursor[idx].children;
        }
      }
      return next;
    });
  };

  const addRootMove = () => {
    setTree((prev) => [...prev, { moveUci: '', children: [] }]);
  };

  const addChildAtPath = (path: number[]) => {
    setTree((prev) => {
      const next = cloneTree(prev);
      let cursor = next;
      for (let i = 0; i < path.length; i += 1) {
        const idx = path[i];
        if (!cursor[idx]) return prev;
        if (i === path.length - 1) {
          cursor[idx].children.push({ moveUci: '', children: [] });
          setSelectedPath([...path, cursor[idx].children.length - 1]);
        } else {
          cursor = cursor[idx].children;
        }
      }
      return next;
    });
  };

  const removeAtPath = (path: number[]) => {
    if (!path.length) return;
    setTree((prev) => {
      const next = cloneTree(prev);
      if (path.length === 1) {
        next.splice(path[0], 1);
        return next;
      }

      let cursor = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        const idx = path[i];
        if (!cursor[idx]) return prev;
        cursor = cursor[idx].children;
      }
      cursor.splice(path[path.length - 1], 1);
      return next;
    });
    setSelectedPath([]);
  };

  const loadForEdit = (item: PuzzleItem) => {
    setId(item.id);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setEnabled(item.enabled);
    setBuilderFen(item.initialFen || START_FEN);
    setTree(normalizePuzzleTree(item));
    setSelectedPath([]);
    setMode('setup');
    setBoardKey((prev) => prev + 1);
    setStatus(labels.loaded);
    setStatusType('success');
  };

  const parseUci = (uci: string) => ({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  });

  const movesFromPath = (nodes: PuzzleMoveNode[], path: number[]): string[] => {
    const out: string[] = [];
    let cursor = nodes;
    for (const idx of path) {
      if (!cursor[idx]) break;
      out.push(cursor[idx].moveUci);
      cursor = cursor[idx].children || [];
    }
    return out;
  };

  const treeFen = useMemo(() => {
    const game = new Chess(builderFen || START_FEN);
    const pathMoves = movesFromPath(tree, selectedPath);
    for (const uci of pathMoves) {
      if (!uci || uci.length < 4) break;
      const res = game.move(parseUci(uci));
      if (!res) break;
    }
    return game.fen();
  }, [builderFen, selectedPath, tree]);

  const appendMoveAtPath = (path: number[], moveUci: string) => {
    const normalized = moveUci.toLowerCase().trim();
    if (!normalized) return;

    setTree((prev) => {
      if (!path.length) {
        const rootIndex = prev.length;
        const next = [...cloneTree(prev), { moveUci: normalized, children: [] }];
        setSelectedPath([rootIndex]);
        setBoardKey((k) => k + 1);
        return next;
      }

      const next = cloneTree(prev);
      let cursor = next;
      for (let i = 0; i < path.length; i += 1) {
        const idx = path[i];
        if (!cursor[idx]) return prev;
        if (i === path.length - 1) {
          cursor[idx].children.push({ moveUci: normalized, children: [] });
          const newPath = [...path, cursor[idx].children.length - 1];
          setSelectedPath(newPath);
          setBoardKey((k) => k + 1);
        } else {
          cursor = cursor[idx].children;
        }
      }
      return next;
    });
  };

  const onSave = async () => {
    const existing = id ? items.find((it) => it.id === id) : undefined;
    const fallbackOrder = items.length ? Math.max(...items.map((it) => it.roadmapOrder || 0)) + 1 : 1;
    const item = await savePuzzle({
      id,
      title,
      description,
      initialFen: builderFen,
      solutionUci: firstLineFromTree(tree),
      solutionTree: tree,
      roadmapOrder: existing?.roadmapOrder || fallbackOrder,
      enabled,
    });
    setId(item.id);
    setStatus(labels.saved);
    setStatusType('success');
    await loadItems();
    await onChanged();
  };

  const onReorderDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const sourceIndex = items.findIndex((it) => it.id === draggingId);
    const targetIndex = items.findIndex((it) => it.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    setItems(next);
    setDraggingId(null);
    try {
      const reordered = await reorderAdminPuzzles(next.map((it) => it.id));
      setItems(reordered);
      setStatus(t('orderSaved'));
      setStatusType('success');
      await onChanged();
    } catch {
      setStatus(t('orderSaveFailed'));
      setStatusType('error');
      await loadItems().catch(() => undefined);
    }
  };

  const onDelete = async (puzzleId: string) => {
    await removePuzzle(puzzleId);
    if (id === puzzleId) setId(undefined);
    setStatusType('success');
    await loadItems();
    await onChanged();
  };

  return (
    <section className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-4 space-y-4">
      <h2 className="text-xl font-semibold">{labels.title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <input
            className="w-full rounded border px-3 py-2 bg-transparent"
            placeholder={t('titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full rounded border px-3 py-2 bg-transparent"
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              {t('enabled')}
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded border px-3 py-2 ${mode === 'setup' ? 'bg-blue-600 text-white border-blue-600' : ''}`}
              onClick={() => {
                setMode('setup');
                setBoardKey((k) => k + 1);
              }}
            >
              {labels.setupMode}
            </button>
            <button
              className={`rounded border px-3 py-2 ${mode === 'tree' ? 'bg-blue-600 text-white border-blue-600' : ''}`}
              onClick={() => {
                setMode('tree');
                setBoardKey((k) => k + 1);
              }}
            >
              {labels.recordMode}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded border px-3 py-2" onClick={addRootMove}>
              {t('addCriticalMove')}
            </button>
            {!!selectedPath.length && (
              <button className="rounded border px-3 py-2" onClick={() => addChildAtPath(selectedPath)}>
                {t('addDeeper')}
              </button>
            )}
          </div>

          <button
            className="rounded border px-3 py-2 bg-blue-600 text-white"
            onClick={() =>
              onSave().catch(() => {
                setStatus(t('saveFailed'));
                setStatusType('error');
              })
            }
          >
            {labels.save}
          </button>
          <div
            className={`text-sm ${
              statusType === 'error'
                ? 'text-rose-600'
                : statusType === 'success'
                  ? 'text-emerald-600'
                  : 'text-slate-500'
            }`}
          >
            {status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 max-h-[520px] overflow-auto">
          <div className="text-sm font-semibold mb-2">{t('criticalMoveTree')}</div>
          <div className="text-xs text-slate-500 mb-2">{t('criticalMoveTreeHint')}</div>
          <AdminTreeGraph
            nodes={tree}
            selectedPath={selectedPath}
            onSelectPath={setSelectedPath}
            onUpdateMove={updateMoveAtPath}
            onAddChild={addChildAtPath}
            onRemove={removeAtPath}
          />
        </div>
        <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden">
          <ChessBoardComponent
            key={`mode-${mode}-${treeFen}-${builderFen}-${boardKey}`}
            initialFen={mode === 'setup' ? builderFen : treeFen}
            showSidebar={false}
            showFenPgnPanel={false}
            showAnalysisTools={false}
            autoEnableSetupMode={mode === 'setup'}
            onPositionChange={(nextFen) => {
              if (mode === 'setup') setBuilderFen(nextFen);
            }}
            onMoveDetailed={(move) => {
              if (mode !== 'tree') return;
              appendMoveAtPath(selectedPath, move.uci);
            }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold mb-2">{labels.dashboard}</h3>
        <div className="space-y-2 max-h-64 overflow-auto pr-2">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDraggingId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                void onReorderDrop(item.id);
              }}
              className={`flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-3 py-2 cursor-move ${draggingId === item.id ? 'opacity-60' : ''}`}
            >
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-slate-500">#{item.roadmapOrder}</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded border px-2 py-1 text-sm" onClick={() => loadForEdit(item)}>
                  {t('edit')}
                </button>
                <button
                  className="rounded border px-2 py-1 text-sm text-rose-600"
                  onClick={() =>
                    onDelete(item.id).catch(() => {
                      setStatus(t('deleteFailed'));
                      setStatusType('error');
                    })
                  }
                >
                  {labels.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
