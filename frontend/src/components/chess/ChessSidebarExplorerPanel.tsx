'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ExplorerTab = 'masters' | 'lichess' | 'player';
type ExplorerMode = 'opening' | 'tablebase';

interface ExplorerMove {
  uci: string;
  san?: string;
  game?: number;
  white?: number;
  draws?: number;
  black?: number;
  averageRating?: number;
  category?: string;
  dtz?: number;
  dtm?: number;
}

interface OpeningExplorerResponse {
  opening?: { eco?: string; name?: string };
  white?: number;
  draws?: number;
  black?: number;
  moves?: ExplorerMove[];
}

interface TablebaseResponse {
  category?: string;
  dtz?: number;
  dtm?: number;
  moves?: ExplorerMove[];
}

interface ChessSidebarExplorerPanelProps {
  currentFen: string;
  onPlayUciMove: (uci: string) => boolean;
  onClose: () => void;
}

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string) ||
  (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
  'http://localhost:8000';
const CACHE_TTL_MS = 90_000;

const responseCache = new Map<string, { ts: number; data: unknown }>();
let rateLimitedUntil = 0;

function countPieces(fen: string): number {
  const board = fen.split(' ')[0] || '';
  return (board.match(/[pnbrqkPNBRQK]/g) || []).length;
}

function toPercent(part: number | undefined, total: number): string {
  if (!part || total <= 0) return '0.0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function toRatio(part: number | undefined, total: number): number {
  if (!part || total <= 0) return 0;
  return (part / total) * 100;
}

function formatGamesCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')} Mrd.`;
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} Mio`;
  return value.toLocaleString('de-DE');
}

async function fetchWithCache(url: string, signal: AbortSignal): Promise<unknown> {
  const now = Date.now();
  if (rateLimitedUntil > now) {
    const waitSec = Math.ceil((rateLimitedUntil - now) / 1000);
    throw new Error(`Rate limit active. Bitte warte ${waitSec}s.`);
  }

  const cached = responseCache.get(url);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(url, { signal });
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') || '20');
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 20_000;
      rateLimitedUntil = Date.now() + Math.max(5_000, waitMs);
      throw new Error('Zu viele Requests (429). Automatisch pausiert.');
    }
    throw new Error(`API Fehler (${res.status})`);
  }

  const data = await res.json();
  responseCache.set(url, { ts: now, data });
  return data;
}

export default function ChessSidebarExplorerPanel({
  currentFen,
  onPlayUciMove,
  onClose,
}: ChessSidebarExplorerPanelProps) {
  const pieceCount = useMemo(() => countPieces(currentFen), [currentFen]);
  const mode: ExplorerMode = pieceCount <= 7 ? 'tablebase' : 'opening';
  const [tab, setTab] = useState<ExplorerTab>('masters');
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openingData, setOpeningData] = useState<OpeningExplorerResponse | null>(null);
  const [tablebaseData, setTablebaseData] = useState<TablebaseResponse | null>(null);
  const tableGridClass = 'grid items-center gap-x-0 gap-y-2';
  const tableGridStyle = {
    gridTemplateColumns: '12% minmax(0, 23%) 65%',
  } as const;

  useEffect(() => {
    const trimmedPlayer = playerName.trim();
    if (mode === 'opening' && tab === 'player' && trimmedPlayer.length < 2) {
      setOpeningData(null);
      setError('Bitte gib einen Lichess-Nutzernamen ein.');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');

        if (mode === 'tablebase') {
          const url = `${API_BASE}/api/chess/explorer/tablebase?fen=${encodeURIComponent(currentFen)}`;
          const data = (await fetchWithCache(url, controller.signal)) as TablebaseResponse;
          setTablebaseData(data);
          return;
        }

        const fenParam = `fen=${encodeURIComponent(currentFen)}`;
        let url = `${API_BASE}/api/chess/explorer/opening?source=masters&${fenParam}`;
        if (tab === 'lichess') {
          url = `${API_BASE}/api/chess/explorer/opening?source=lichess&${fenParam}`;
        }
        if (tab === 'player') {
          url = `${API_BASE}/api/chess/explorer/opening?source=player&player=${encodeURIComponent(trimmedPlayer)}&color=${playerColor}&${fenParam}`;
        }

        const data = (await fetchWithCache(url, controller.signal)) as OpeningExplorerResponse;
        setOpeningData(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden.');
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, tab, currentFen, playerName, playerColor]);

  const openingTotals =
    (openingData?.white || 0) + (openingData?.draws || 0) + (openingData?.black || 0);

  return (
    <div className="explorer-scrollbar absolute inset-x-0 bottom-16 h-[50%] z-50 border-t border-violet-200 dark:border-violet-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-3 shadow-[0_-10px_24px_rgba(0,0,0,0.24)] overflow-auto">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Explorer</p>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Explorer schliessen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {mode === 'opening' && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {(['masters', 'lichess', 'player'] as ExplorerTab[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`px-2 py-1 rounded capitalize ${
                  tab === item
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === 'player' && (
            <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-xs"
                placeholder="Lichess Username"
              />
              <button
                type="button"
                onClick={() => setPlayerColor('white')}
                className={`px-2 py-1 rounded text-xs ${
                  playerColor === 'white'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => setPlayerColor('black')}
                className={`px-2 py-1 rounded text-xs ${
                  playerColor === 'black'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Black
              </button>
              {loading && (
                <span className="text-[11px] text-violet-700 dark:text-violet-300 animate-pulse whitespace-nowrap">
                  lädt...
                </span>
              )}
            </div>
          )}

          <div className={`mt-3 space-y-1.5 transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}>
            <div
              className={`${tableGridClass} px-2 text-[10px] uppercase tracking-wide text-gray-500`}
              style={tableGridStyle}
            >
              <span>Zug</span>
              <span className="text-[10px]">#Partien</span>
              <span>Weiss/Remis/Schwarz</span>
            </div>
            {(openingData?.moves || []).slice(0, 10).map((move) => {
              const sum = (move.white || 0) + (move.draws || 0) + (move.black || 0);
              const whiteRatio = toRatio(move.white, sum);
              const drawRatio = toRatio(move.draws, sum);
              const blackRatio = toRatio(move.black, sum);
              return (
                <div
                  key={`${move.uci}-${move.san}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onPlayUciMove(move.uci);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayUciMove(move.uci);
                    }
                  }}
                  className={`text-xs rounded border border-violet-200/70 dark:border-violet-900/60 px-2 py-1 cursor-pointer transition-all duration-150 hover:bg-violet-100 dark:hover:bg-violet-800/40 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.35)] ${tableGridClass}`}
                  style={tableGridStyle}
                >
                  <p className="font-mono text-violet-700 dark:text-violet-300">{move.san || move.uci}</p>
                  <p className="text-[8px] text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis pr-3">
                    {formatGamesCompact(sum)} ({toPercent(sum, openingTotals)})
                  </p>
                  <div
                    className="relative h-4 w-full rounded-md bg-gray-300 dark:bg-gray-700 overflow-hidden flex shadow-[inset_0_1px_2px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.18)]"
                    title={`W ${toPercent(move.white, sum)} • D ${toPercent(move.draws, sum)} • B ${toPercent(move.black, sum)}`}
                  >
                    <span
                      className="relative h-full bg-gradient-to-b from-slate-100 to-slate-300 flex items-center justify-center"
                      style={{ width: `${whiteRatio}%` }}
                    >
                      {whiteRatio >= 5 && (
                        <span className="text-[9px] leading-none font-semibold text-gray-900">
                          {Math.round(whiteRatio)}%
                        </span>
                      )}
                    </span>
                    <span
                      className="relative h-full bg-gradient-to-b from-gray-400 to-gray-600 flex items-center justify-center"
                      style={{ width: `${drawRatio}%` }}
                    >
                      {drawRatio >= 5 && (
                        <span className="text-[9px] leading-none font-semibold text-gray-100">
                          {Math.round(drawRatio)}%
                        </span>
                      )}
                    </span>
                    <span
                      className="relative h-full bg-gradient-to-b from-gray-700 to-black flex items-center justify-center"
                      style={{ width: `${blackRatio}%` }}
                    >
                      {blackRatio >= 5 && (
                        <span className="text-[9px] leading-none font-semibold text-white">
                          {Math.round(blackRatio)}%
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
            {!loading && !error && (openingData?.moves || []).length === 0 && (
              <p className="text-xs text-gray-500">Keine Daten fuer diese Stellung.</p>
            )}
          </div>
        </>
      )}

      {mode === 'tablebase' && (
        <>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
            {pieceCount <= 7
              ? 'Tablebase ist geeignet fuer diese Stellung.'
              : 'Tablebase ist meist nur bis 7 Steine sinnvoll.'}
          </p>
          {tablebaseData?.category && (
            <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
              {tablebaseData.category} {tablebaseData.dtz ? `• DTZ ${tablebaseData.dtz}` : ''}
              {tablebaseData.dtm ? ` • DTM ${tablebaseData.dtm}` : ''}
            </p>
          )}
          <div className={`mt-3 space-y-1.5 transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}>
            {(tablebaseData?.moves || []).slice(0, 10).map((move) => (
              <div
                key={`${move.uci}-${move.san}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onPlayUciMove(move.uci);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPlayUciMove(move.uci);
                  }
                }}
                className="text-xs rounded border border-violet-200/70 dark:border-violet-900/60 px-2 py-1 cursor-pointer transition-all duration-150 hover:bg-violet-100 dark:hover:bg-violet-800/40 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.35)]"
              >
                <p className="font-mono text-violet-700 dark:text-violet-300">{move.san || move.uci}</p>
                <p className="text-gray-600 dark:text-gray-300">
                  {move.category || '-'} {move.dtz !== undefined ? `• DTZ ${move.dtz}` : ''}
                  {move.dtm !== undefined ? ` • DTM ${move.dtm}` : ''}
                </p>
              </div>
            ))}
            {!loading && !error && (tablebaseData?.moves || []).length === 0 && (
              <p className="text-xs text-gray-500">Keine Tablebase-Zuege verfuegbar.</p>
            )}
          </div>
        </>
      )}

      {!!error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      <style jsx global>{`
        .explorer-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(107, 114, 128, 0.75) transparent;
        }

        .explorer-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .explorer-scrollbar::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }

        .explorer-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.75);
          border-radius: 0;
        }

        .explorer-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 0;
        }
      `}</style>
    </div>
  );
}