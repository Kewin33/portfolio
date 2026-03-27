import { PuzzleItem, PuzzleMoveNode } from '@/components/chess/puzzles/types';

export function buildLinearTree(moves: string[]): PuzzleMoveNode[] {
  let root: PuzzleMoveNode[] = [];
  let cursor = root;
  for (const move of moves) {
    const node: PuzzleMoveNode = { moveUci: move, children: [] };
    cursor.push(node);
    cursor = node.children;
  }
  return root;
}

export function normalizePuzzleTree(item: PuzzleItem): PuzzleMoveNode[] {
  if (Array.isArray(item.solutionTree) && item.solutionTree.length > 0) {
    return cloneTree(item.solutionTree);
  }
  return buildLinearTree(item.solutionUci || []);
}

export function cloneTree(nodes: PuzzleMoveNode[]): PuzzleMoveNode[] {
  return nodes.map((node) => ({
    moveUci: (node.moveUci || '').toLowerCase(),
    children: cloneTree(node.children || []),
  }));
}

export function firstLineFromTree(nodes: PuzzleMoveNode[]): string[] {
  const out: string[] = [];
  let cursor = nodes;
  while (cursor.length > 0) {
    out.push(cursor[0].moveUci);
    cursor = cursor[0].children || [];
  }
  return out;
}

export function maxTreeDepth(nodes: PuzzleMoveNode[]): number {
  if (!nodes.length) return 0;
  let maxDepth = 0;
  for (const node of nodes) {
    maxDepth = Math.max(maxDepth, 1 + maxTreeDepth(node.children || []));
  }
  return maxDepth;
}

export function pathExists(nodes: PuzzleMoveNode[], moves: string[]): boolean {
  let cursor = nodes;
  for (const move of moves) {
    const next = cursor.find((node) => node.moveUci.toLowerCase() === move.toLowerCase());
    if (!next) return false;
    cursor = next.children || [];
  }
  return true;
}

export function findChildrenForPath(nodes: PuzzleMoveNode[], moves: string[]): PuzzleMoveNode[] {
  let cursor = nodes;
  for (const move of moves) {
    const next = cursor.find((node) => node.moveUci.toLowerCase() === move.toLowerCase());
    if (!next) return [];
    cursor = next.children || [];
  }
  return cursor;
}
