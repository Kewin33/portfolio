import { Chess } from 'chess.js';

export interface EngineLine {
  multipv: number;
  depth: number;
  scoreText: string;
  pvSan: string;
  isLong: boolean;
}

interface LichessPv {
  cp?: number;
  mate?: number;
  moves?: string;
}

interface LichessCloudEvalResponse {
  depth?: number;
  pvs?: LichessPv[];
}

export function uciToSanLine(fen: string, uciMoves: string[]): string {
  const game = new Chess(fen);
  const sanMoves: string[] = [];

  for (const moveText of uciMoves) {
    if (moveText.length < 4) break;
    const from = moveText.slice(0, 2);
    const to = moveText.slice(2, 4);
    const promotion = moveText.length > 4 ? moveText[4] : undefined;
    try {
      const move = game.move({ from, to, promotion });
      if (!move) break;
      sanMoves.push(move.san);
    } catch {
      break;
    }
  }

  return sanMoves.join(' ');
}

export function formatLocalScore(line: string): string | null {
  const mate = line.match(/\bscore mate (-?\d+)/);
  if (mate) {
    return `M${mate[1]}`;
  }

  const cp = line.match(/\bscore cp (-?\d+)/);
  if (cp) {
    const value = Number(cp[1]) / 100;
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  }

  return null;
}

function formatCloudScore(pv: LichessPv): string | null {
  if (typeof pv.mate === 'number') {
    return `M${pv.mate}`;
  }
  if (typeof pv.cp === 'number') {
    const value = pv.cp / 100;
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  }
  return null;
}

function buildLinesFromCloud(
  fen: string,
  cloudDepth: number,
  pvs: LichessPv[],
): Record<number, EngineLine> {
  const next: Record<number, EngineLine> = {};
  pvs.forEach((pv, index) => {
    const scoreText = formatCloudScore(pv);
    if (!scoreText) return;
    const uciMoves = (pv.moves || '').trim().split(/\s+/).filter(Boolean);
    const pvSan = uciToSanLine(fen, uciMoves);
    const multipv = index + 1;
    next[multipv] = {
      multipv,
      depth: cloudDepth,
      scoreText,
      pvSan,
      isLong: pvSan.length > 72,
    };
  });
  return next;
}

export async function fetchLichessCloudEval(
  fen: string,
  multiPv: number,
  signal?: AbortSignal,
): Promise<{ ok: boolean; depth: number; lines: Record<number, EngineLine> }> {
  const timeoutMs = 120_000;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      return { ok: false, depth: 0, lines: {} };
    }
    signal.addEventListener('abort', () => timeoutController.abort(), { once: true });
  }

  const url = new URL('https://lichess.org/api/cloud-eval');
  url.searchParams.set('fen', fen);
  url.searchParams.set('multiPv', String(Math.max(1, Math.min(5, multiPv))));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timeoutController.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return { ok: false, depth: 0, lines: {} };
    }

    const payload = (await response.json()) as LichessCloudEvalResponse;
    const cloudDepth = Math.max(1, Number(payload.depth || 0));
    const pvs = Array.isArray(payload.pvs) ? payload.pvs : [];
    const lines = buildLinesFromCloud(fen, cloudDepth, pvs);

    return {
      ok: Object.keys(lines).length > 0,
      depth: cloudDepth,
      lines,
    };
  } catch {
    return { ok: false, depth: 0, lines: {} };
  } finally {
    clearTimeout(timeoutId);
  }
}
