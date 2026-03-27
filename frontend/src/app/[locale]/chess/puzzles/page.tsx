'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Target, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import PageLayout from '@/components/core/layout/PageLayout';
import PuzzlePlayer from '@/components/chess/puzzles/PuzzlePlayer';
import AdminPuzzleStudio from '@/components/chess/puzzles/AdminPuzzleStudio';
import CollectionGrid from '@/components/content/CollectionGrid';
import {
  fetchMyPuzzleProgress,
  fetchPuzzles,
  fetchRole,
  recordSolvedAttempt,
} from '@/components/chess/puzzles/api';
import { PuzzleItem, PuzzleProgress } from '@/components/chess/puzzles/types';

const GUEST_PROGRESS_KEY = 'portfolio_guest_puzzle_progress_v1';

function emptyProgress(): PuzzleProgress {
  return {
    totalSolved: 0,
    canSolveToday: true,
    dailyLimit: 1,
    solvedPuzzleIds: [],
  };
}

function readGuestProgress(): PuzzleProgress {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<PuzzleProgress>;
    return {
      ...emptyProgress(),
      ...parsed,
      solvedPuzzleIds: Array.isArray(parsed.solvedPuzzleIds) ? parsed.solvedPuzzleIds : [],
    };
  } catch {
    return emptyProgress();
  }
}

function writeGuestProgress(progress: PuzzleProgress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
}

export default function ChessPuzzlesPage() {
  const t = useTranslations('ChessPuzzles');

  const [items, setItems] = useState<PuzzleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topMessage, setTopMessage] = useState('');
  const [playerOpen, setPlayerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedPuzzle = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0],
    [items, selectedId],
  );

  const collectionItems = useMemo(() => {
    const solvedSet = new Set(progress?.solvedPuzzleIds || []);
    const sorted = [...items].sort((a, b) => a.roadmapOrder - b.roadmapOrder);

    return sorted.map((puzzle) => {
      const solved = solvedSet.has(puzzle.id);
      return {
        id: puzzle.id,
        title: puzzle.title,
        onClick: () => {
          setSelectedId(puzzle.id);
          setPlayerOpen(true);
        },
        badgeIcon: /^\d+$/.test(puzzle.id)
          ? puzzle.id
          : String(puzzle.roadmapOrder || 0),
        solved,
      };
    });
  }, [items, progress]);

  const reload = async () => {
    const [puzzleData, progressData, userRole] = await Promise.all([
      fetchPuzzles(),
      fetchMyPuzzleProgress().catch(() => null),
      fetchRole(),
    ]);
    setItems(puzzleData.items || []);
    setProgress(userRole ? progressData : readGuestProgress());
    setRole(userRole);
    if (puzzleData.items?.length) {
      setSelectedId((prev) => prev || puzzleData.items[0].id);
    }
  };

  useEffect(() => {
    reload()
      .catch(() => setTopMessage(t('loadError')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!playerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [playerOpen]);

  const onSolved = async (puzzleId: string) => {
    if (!role) {
      const current = progress ?? readGuestProgress();
      if (current.solvedPuzzleIds.includes(puzzleId)) {
        setTopMessage(t('solvedGuest'));
        return;
      }
      const next: PuzzleProgress = {
        ...current,
        totalSolved: (current.totalSolved || 0) + 1,
        solvedPuzzleIds: [...current.solvedPuzzleIds, puzzleId],
        lastSolvedDate: new Date().toISOString(),
      };
      setProgress(next);
      writeGuestProgress(next);
      setTopMessage(t('solvedGuest'));
      return;
    }

    try {
      const next = await recordSolvedAttempt(puzzleId);
      setProgress(next);
      if (role) {
        setTopMessage(t('solvedSaved'));
      } else {
        setTopMessage(t('solvedGuest'));
      }
    } catch {
      setTopMessage(t('saveError'));
    }
  };

  return (
      <PageLayout title={t('title')} subtitle={t('subtitle')}>
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
                <Target className="w-4 h-4" />
              </div>
              <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">{t('counterLabel')}</div>
              <div className="text-2xl font-bold">{progress?.totalSolved ?? 0}</div>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {role ? (
                t('trackingSignedIn')
              ) : (
                <span>
                  {t('trackingGuest')} {' '}
                  <Link href="/login" className="underline font-medium">
                    Register
                  </Link>
                </span>
              )}
            </div>
          </section>

          {topMessage && (
            <section className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/20 px-4 py-3 text-sm">
              {topMessage}
            </section>
          )}

          {items.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Select a Puzzle :)</h2>
              <CollectionGrid items={collectionItems} columns={6} variant="dense" />
            </section>
          )}

          <section>
            {loading && <div className="text-sm text-slate-500">{t('loading')}</div>}
            {!loading && !selectedPuzzle && <div className="text-sm text-slate-500">{t('noPuzzles')}</div>}
          </section>

          {mounted && playerOpen && selectedPuzzle && createPortal(
            <section className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm overflow-hidden">
              <div className="h-full w-full p-3 py-4 sm:p-6 sm:py-8 flex items-start justify-center">
              <div className="w-full max-w-6xl rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedPuzzle.title}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlayerOpen(false)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Close puzzle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 sm:p-4 overflow-y-auto">
                  <PuzzlePlayer
                    puzzle={selectedPuzzle}
                    progress={progress}
                    labels={{
                      correct: t('feedback.correct'),
                      wrong: t('feedback.wrong'),
                      solved: t('feedback.solved'),
                      dailyLimit: t('dailyLimitReached'),
                    }}
                    onSolved={onSolved}
                    showDescription={true}
                  />
                </div>
              </div>
              </div>
            </section>,
            document.body,
          )}

          {role === 'admin' && (
            <AdminPuzzleStudio
              labels={{
                title: t('admin.title'),
                setupMode: t('admin.setupMode'),
                recordMode: t('admin.recordMode'),
                save: t('admin.save'),
                delete: t('admin.delete'),
                dashboard: t('admin.dashboard'),
                saved: t('admin.saved'),
                loaded: t('admin.loaded'),
              }}
              onChanged={reload}
            />
          )}
        </div>
      </PageLayout>
  );
}