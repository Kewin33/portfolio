'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import ChessBoardComponent from '@/components/chess/ChessBoard';
import StockfishWorker from '@/hooks/chess/useStockfish';
import { PuzzleItem, PuzzleProgress } from '@/components/chess/puzzles/types';
import { findChildrenForPath, normalizePuzzleTree } from '@/components/chess/puzzles/tree';

interface PuzzlePlayerProps {
  puzzle: PuzzleItem;
  progress: PuzzleProgress | null;
  labels: {
    correct: string;
    wrong: string;
    solved: string;
    dailyLimit: string;
  };
  onSolved: (puzzleId: string) => Promise<void>;
  showDescription?: boolean;
}

interface FlowNode {
  moveUci: string;
  source: 'user' | 'solution' | 'stockfish';
  children: FlowNode[];
}

interface CompareNode {
  moveUci: string;
  children: CompareNode[];
}

export default function PuzzlePlayer({ puzzle, progress: _progress, labels, onSolved, showDescription = false }: PuzzlePlayerProps) {
  const [fen, setFen] = useState(puzzle.initialFen);
  const [flowTree, setFlowTree] = useState<FlowNode[]>([]);
  const [lineMoves, setLineMoves] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<number[]>([]);
  const [pendingCriticalPaths, setPendingCriticalPaths] = useState<number[][]>([]);
  const [userDepth, setUserDepth] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const workerRef = useRef<StockfishWorker | null>(null);
  const solutionTree = useMemo(() => normalizePuzzleTree(puzzle), [puzzle]);

  useEffect(() => {
    if (!workerRef.current) {
      const worker = new StockfishWorker();
      worker.worker.postMessage('uci');
      worker.worker.postMessage('isready');
      workerRef.current = worker;
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setFen(puzzle.initialFen);
    setFlowTree([]);
    setLineMoves([]);
    setActivePath([]);
    setPendingCriticalPaths([]);
    setUserDepth(0);
    setFeedback('');
    setSubmitting(false);
  }, [puzzle.id, puzzle.initialFen]);

  const cloneNodes = (nodes: FlowNode[]): FlowNode[] =>
    nodes.map((node) => ({
      moveUci: node.moveUci,
      source: node.source,
      children: cloneNodes(node.children || []),
    }));

  const puzzleNodesToFlowNodes = (nodes: Array<{ moveUci: string; children?: any[] }>): FlowNode[] =>
    nodes.map((node) => ({
      moveUci: node.moveUci,
      source: 'solution' as const,
      children: puzzleNodesToFlowNodes(node.children || []),
    }));

  const pushChild = (nodes: FlowNode[], parentPath: number[], node: FlowNode): number[] => {
    if (!parentPath.length) {
      const nextIndex = nodes.length;
      nodes.push(node);
      return [nextIndex];
    }

    let cursor = nodes;
    for (let i = 0; i < parentPath.length; i += 1) {
      const idx = parentPath[i];
      if (!cursor[idx]) return [];
      if (i === parentPath.length - 1) {
        const childIndex = cursor[idx].children.length;
        cursor[idx].children.push(node);
        return [...parentPath, childIndex];
      }
      cursor = cursor[idx].children;
    }
    return [];
  };

  const findCriticalMoves = (positionFen: string) =>
    new Promise<string[]>((resolve) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve([]);
        return;
      }

      const randomCount = 2 + Math.floor(Math.random() * 3);
      const pvMoves = new Map<number, string>();
      let fallbackBestMove: string | null = null;

      const handleMessage = (data: string) => {
        if (typeof data !== 'string') return;
        const text = data.trim();

        if (text.startsWith('info') && text.includes(' pv ')) {
          const pvMatch = text.match(/multipv\s+(\d+).*?\spv\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
          if (pvMatch) {
            const idx = Number(pvMatch[1]);
            const move = pvMatch[2].toLowerCase();
            if (Number.isFinite(idx) && move) {
              pvMoves.set(idx, move);
            }
          }
          return;
        }

        if (!text.startsWith('bestmove')) return;
        worker.onMessage = null;
        const parts = text.split(' ');
        fallbackBestMove = parts[1] && parts[1] !== '(none)' ? parts[1].toLowerCase() : null;

        const ordered = [...pvMoves.entries()]
          .sort((a, b) => a[0] - b[0])
          .map((entry) => entry[1]);

        const unique: string[] = [];
        for (const move of ordered) {
          if (!unique.includes(move)) unique.push(move);
        }
        if (fallbackBestMove && !unique.includes(fallbackBestMove)) {
          unique.unshift(fallbackBestMove);
        }

        resolve(unique.slice(0, randomCount));
      };

      worker.stop();
      worker.setOption('MultiPV', randomCount);
      worker.onMessage = handleMessage;
      worker.worker.postMessage(`position fen ${positionFen}`);
      worker.worker.postMessage('go depth 12');
      setTimeout(() => {
        if (worker.onMessage === handleMessage) {
          worker.onMessage = null;
          const unique: string[] = [];
          if (fallbackBestMove && !unique.includes(fallbackBestMove)) unique.push(fallbackBestMove);
          resolve(unique);
        }
      }, 4200);
    });

  const parseUci = (uci: string) => ({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  });

  const movesForPath = (nodes: FlowNode[], path: number[]): string[] => {
    const moves: string[] = [];
    let cursor = nodes;
    for (const idx of path) {
      if (!cursor[idx]) break;
      const move = (cursor[idx].moveUci || '').toLowerCase();
      if (!move) break;
      moves.push(move);
      cursor = cursor[idx].children || [];
    }
    return moves;
  };

  const replayFenForMoves = (moves: string[]): string => {
    const game = new Chess(puzzle.initialFen);
    for (const move of moves) {
      const result = game.move(parseUci(move));
      if (!result) break;
    }
    return game.fen();
  };

  const userDepthForPath = (nodes: FlowNode[], path: number[]): number => {
    let depth = 0;
    let cursor = nodes;
    for (const idx of path) {
      if (!cursor[idx]) break;
      if (cursor[idx].source === 'user') depth += 1;
      cursor = cursor[idx].children || [];
    }
    return depth;
  };

  const onUserBoardMove = async (moveUciRaw: string, nextFen: string) => {
    const moveUci = (moveUciRaw || '').toLowerCase();

    if (pendingCriticalPaths.length > 0) {
      setFeedback('Select one critical move node first.');
      return;
    }
    const nextLineMoves = [...lineMoves, moveUci];
    const solutionChildren = findChildrenForPath(solutionTree, nextLineMoves);

    let createdUserPath: number[] = [];
    let createdCriticalPaths: number[][] = [];
    setFlowTree((prev) => {
      const next = cloneNodes(prev);
      const userNodePath = pushChild(next, activePath, {
        moveUci,
        source: 'user',
        children: [],
      });
      createdUserPath = userNodePath;
      if (!userNodePath.length) {
        createdCriticalPaths = [];
        return prev;
      }

      if (solutionChildren.length > 0) {
        createdCriticalPaths = solutionChildren
          .map((child) =>
            pushChild(next, userNodePath, {
              moveUci: child.moveUci,
              source: 'solution',
              children: [],
            }),
          )
          .filter((path) => path.length > 0);
      } else {
        createdCriticalPaths = [];
      }

      return next;
    });

    setLineMoves(nextLineMoves);
    setFen(nextFen);
    setUserDepth((d) => d + 1);

    if (solutionChildren.length > 0) {
      setPendingCriticalPaths(createdCriticalPaths);
      setFeedback('');
      return;
    }

    const stockfishMoves = await findCriticalMoves(nextFen);
    if (stockfishMoves.length > 0) {
      let stockfishPaths: number[][] = [];
      setFlowTree((prev) => {
        const next = cloneNodes(prev);
        if (!createdUserPath.length) return prev;
        stockfishPaths = stockfishMoves
          .map((uci) =>
            pushChild(next, createdUserPath, {
              moveUci: uci,
              source: 'stockfish',
              children: [],
            }),
          )
          .filter((path) => path.length > 0);
        return next;
      });
      if (stockfishPaths.length) {
        setPendingCriticalPaths(stockfishPaths);
      } else {
        setPendingCriticalPaths([]);
      }
      setFeedback('');
      return;
    }

    setPendingCriticalPaths([]);
    setFeedback('');
  };

  const onNodeClick = (path: number[]) => {
    const node = getNodeByPath(flowTree, path);
    if (!node) return;

    const branchMoves = movesForPath(flowTree, path);
    const branchFen = replayFenForMoves(branchMoves);
    const branchUserDepth = userDepthForPath(flowTree, path);
    setFen(branchFen);
    setLineMoves(branchMoves);
    setUserDepth(branchUserDepth);
    setActivePath(path);
    setPendingCriticalPaths([]);
    setFeedback('Node selected. Continue from this position.');
  };

  const onDeleteUserNode = (path: number[]) => {
    const node = getNodeByPath(flowTree, path);
    if (!node || node.source !== 'user') return;

    const parentPath = path.slice(0, -1);
    let nextTree: FlowNode[] | null = null;
    let removed = false;

    setFlowTree((prev) => {
      const next = cloneNodes(prev);
      if (path.length === 1) {
        if (!next[path[0]]) return prev;
        next.splice(path[0], 1);
        removed = true;
        nextTree = next;
        return next;
      }

      let cursor = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        const idx = path[i];
        if (!cursor[idx]) return prev;
        cursor = cursor[idx].children;
      }
      const childIdx = path[path.length - 1];
      if (!cursor[childIdx]) return prev;
      cursor.splice(childIdx, 1);
      removed = true;
      nextTree = next;
      return next;
    });

    if (!removed || !nextTree) return;

    const nextActivePath = parentPath;
    const nextMoves = movesForPath(nextTree, nextActivePath);
    const nextFen = replayFenForMoves(nextMoves);
    const nextDepth = userDepthForPath(nextTree, nextActivePath);

    setActivePath(nextActivePath);
    setLineMoves(nextMoves);
    setFen(nextFen);
    setUserDepth(nextDepth);
    setPendingCriticalPaths([]);
    setFeedback('User node deleted.');
  };

  const onConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);

    const reallySure = window.confirm('Do you really think that after every path you are better?');
    if (!reallySure) {
      setSubmitting(false);
      return;
    }

    const solved = treesEqual(toCompareNodes(flowTree), toCompareNodes(solutionTree));
    if (solved) {
      setFeedback(labels.solved);
      await onSolved(puzzle.id);
      setSubmitting(false);
      return;
    }

    setFeedback('Das stimmt nicht.');
    setShowSolution(true);
    setSubmitting(false);
  };

  const canPlayBoard = pendingCriticalPaths.length === 0;

  const instructionMessage = canPlayBoard
    ? 'Play a move on the board.'
    : 'Select one generated node.';

  return (
    <div>
      {showDescription && puzzle.description && (
        <div className="mb-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">{puzzle.description}</p>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-3">
          <div className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {showSolution ? 'Solution tree (correct)' : instructionMessage}
          </div>

          <UserTreeGraph
            nodes={showSolution ? puzzleNodesToFlowNodes(solutionTree) : flowTree}
            selectedPath={activePath}
            clickablePaths={showSolution ? [] : pendingCriticalPaths}
            onNodeClick={showSolution ? () => {} : onNodeClick}
            onDeleteNode={showSolution ? () => {} : onDeleteUserNode}
            isSolution={showSolution}
          />
        </div>

        <div className={`rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 ${!canPlayBoard ? 'pointer-events-none opacity-90' : ''}`}>
          <ChessBoardComponent
            key={`${puzzle.id}-${fen}-${userDepth}-${pendingCriticalPaths.length}`}
            initialFen={fen}
            showSidebar={false}
            showAnalysisTools={false}
            showFenPgnPanel={false}
            onMoveDetailed={(move) => {
              if (!canPlayBoard) return;
              void onUserBoardMove(move.uci, move.fen);
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          user moves {userDepth}
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`text-sm font-medium ${
              feedback === labels.solved
                ? 'text-emerald-600'
                : feedback === 'Das stimmt nicht.'
                  ? 'text-red-600'
                  : feedback
                  ? 'text-slate-600 dark:text-slate-300'
                  : 'text-slate-500'
            }`}
          >
            {feedback || '\u00a0'}
          </div>
          {!showSolution ? (
            <>
              <button
                className="rounded border px-3 py-2 bg-emerald-600 text-white disabled:opacity-50"
                onClick={() => void onConfirm()}
                disabled={submitting || userDepth === 0}
              >
                confirm
              </button>
              <button
                className="rounded border px-3 py-2"
                onClick={() => {
                  setFen(puzzle.initialFen);
                  setFlowTree([]);
                  setLineMoves([]);
                  setActivePath([]);
                  setPendingCriticalPaths([]);
                  setUserDepth(0);
                  setFeedback('');
                  setShowSolution(false);
                }}
              >
                reset
              </button>
            </>
          ) : (
            <button
              className="rounded border px-3 py-2 bg-blue-600 text-white"
              onClick={() => {
                setShowSolution(false);
                setFen(puzzle.initialFen);
                setFlowTree([]);
                setLineMoves([]);
                setActivePath([]);
                setPendingCriticalPaths([]);
                setUserDepth(0);
                setFeedback('');
              }}
            >
              try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface UserTreeGraphProps {
  nodes: FlowNode[];
  selectedPath: number[];
  clickablePaths: number[][];
  onNodeClick: (path: number[]) => void;
  onDeleteNode: (path: number[]) => void;
  isSolution?: boolean;
}

function UserTreeGraph({ nodes, selectedPath, clickablePaths, onNodeClick, onDeleteNode, isSolution = false }: UserTreeGraphProps) {
  if (!nodes.length) return <div className="h-6" />;
  return (
    <div className="overflow-auto py-2">
      <div className="min-w-max px-2">
        <UserTreeRow
          nodes={nodes}
          path={[]}
          selectedPath={selectedPath}
          clickablePaths={clickablePaths}
          onNodeClick={onNodeClick}
          onDeleteNode={onDeleteNode}
          isSolution={isSolution}
        />
      </div>
    </div>
  );
}

interface UserTreeRowProps extends UserTreeGraphProps {
  path: number[];
}

function UserTreeRow({ nodes, path, selectedPath, clickablePaths, onNodeClick, onDeleteNode, isSolution = false }: UserTreeRowProps) {
  return (
    <div className="flex items-start justify-center gap-6">
      {nodes.map((node, idx) => {
        const currentPath = [...path, idx];
        const selected = samePath(currentPath, selectedPath);
        const clickable = clickablePaths.some((p) => samePath(p, currentPath));
        const hasChildren = (node.children || []).length > 0;
        const sourceClass =
          node.source === 'user'
            ? 'border-slate-300 dark:border-slate-700'
            : 'border-blue-500/70 bg-blue-50/50 dark:bg-blue-950/20';
        const sourceLabel = node.source === 'user' ? 'user' : 'critical';

        return (
          <div key={currentPath.join('.')} className="flex flex-col items-center">
            <div
              role="button"
              tabIndex={0}
              className={`rounded-xl border p-2 w-48 text-left bg-white/80 dark:bg-slate-900/80 ${sourceClass} ${selected ? 'ring-2 ring-blue-400/70' : ''} cursor-pointer hover:scale-[1.02] ${clickable ? 'ring-1 ring-sky-300/70' : ''}`}
              onClick={() => onNodeClick(currentPath)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNodeClick(currentPath);
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-sm">{node.moveUci}</div>
                {node.source === 'user' && (
                  <button
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[10px] leading-none text-rose-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(currentPath);
                    }}
                  >
                    x
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide">{sourceLabel}</div>
            </div>

            {hasChildren && <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />}

            {hasChildren && (
              <UserTreeRow
                nodes={node.children || []}
                path={currentPath}
                selectedPath={selectedPath}
                clickablePaths={clickablePaths}
                onNodeClick={onNodeClick}
                onDeleteNode={onDeleteNode}
                isSolution={isSolution}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function getNodeByPath(nodes: FlowNode[], path: number[]): FlowNode | null {
  let cursor = nodes;
  let current: FlowNode | null = null;
  for (const idx of path) {
    if (!cursor[idx]) return null;
    current = cursor[idx];
    cursor = cursor[idx].children || [];
  }
  return current;
}

function samePath(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, idx) => value === b[idx]);
}

function toCompareNodes(nodes: Array<{ moveUci: string; children?: any[] }>): CompareNode[] {
  return nodes.map((node) => ({
    moveUci: (node.moveUci || '').toLowerCase(),
    children: toCompareNodes(node.children || []),
  }));
}

function treesEqual(a: CompareNode[], b: CompareNode[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].moveUci !== b[i].moveUci) return false;
    if (!treesEqual(a[i].children, b[i].children)) return false;
  }
  return true;
}
