export interface PuzzleMoveNode {
  moveUci: string;
  children: PuzzleMoveNode[];
}

export interface PuzzleItem {
  id: string;
  title: string;
  description: string;
  initialFen: string;
  solutionUci: string[];
  solutionTree?: PuzzleMoveNode[];
  roadmapOrder: number;
  enabled: boolean;
  source?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PuzzleProgress {
  totalSolved: number;
  lastSolvedDate?: string | null;
  todayPuzzleId?: string | null;
  canSolveToday: boolean;
  dailyLimit: number;
  solvedPuzzleIds: string[];
}