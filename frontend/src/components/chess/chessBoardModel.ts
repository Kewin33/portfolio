import { Chess, Color, PieceSymbol } from 'chess.js';

export type Piece = { type: PieceSymbol; color: Color };

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const PIECES: Piece[] = [
  { type: 'p', color: 'w' },
  { type: 'n', color: 'w' },
  { type: 'b', color: 'w' },
  { type: 'r', color: 'w' },
  { type: 'q', color: 'w' },
  { type: 'k', color: 'w' },
  { type: 'p', color: 'b' },
  { type: 'n', color: 'b' },
  { type: 'b', color: 'b' },
  { type: 'r', color: 'b' },
  { type: 'q', color: 'b' },
  { type: 'k', color: 'b' },
];

export function stripPgnHeaders(pgn: string): string {
  return pgn
    .replace(/^\[[^\]]*\]\s*$/gm, '')
    .replace(/^\s+/, '')
    .trim();
}

export function rebuildFensFromMoves(startFen: string, moves: string[]): string[] {
  const replay = new Chess(startFen || undefined);
  const fens = [replay.fen()];
  for (const san of moves) {
    replay.move(san);
    fens.push(replay.fen());
  }
  return fens;
}

export function getInitialBoardState(initialFen?: string, initialPgn = '') {
  if (initialPgn.trim()) {
    try {
      const parsed = new Chess();
      parsed.loadPgn(initialPgn.trim());
      const parsedMoves = parsed.history();
      const fens = rebuildFensFromMoves(START_FEN, parsedMoves);
      return { game: parsed, fens, index: fens.length - 1 };
    } catch {
      // fall back
    }
  }

  try {
    const parsed = new Chess(initialFen || undefined);
    const fen = parsed.fen();
    return { game: parsed, fens: [fen], index: 0 };
  } catch {
    const fallback = new Chess();
    return { game: fallback, fens: [fallback.fen()], index: 0 };
  }
}
