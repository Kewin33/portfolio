import { PuzzleItem, PuzzleProgress } from '@/components/chess/puzzles/types';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string) ||
  (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
  'http://localhost:8000';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchPuzzles(): Promise<{ items: PuzzleItem[]; hasAdminPuzzles: boolean }> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load puzzles');
  return res.json();
}

export async function fetchMyPuzzleProgress(): Promise<PuzzleProgress> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/progress/me`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load puzzle progress');
  return res.json();
}

export async function recordSolvedAttempt(puzzleId: string): Promise<PuzzleProgress> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/${puzzleId}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ solved: true }),
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('DAILY_LIMIT');
    }
    throw new Error('Failed to register solved puzzle');
  }
  const data = await res.json();
  return data.progress as PuzzleProgress;
}

export async function fetchInfinityUrl(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/infinity/source`, { cache: 'no-store' });
  if (!res.ok) return 'https://lichess.org/training';
  const data = await res.json();
  return typeof data.url === 'string' && data.url ? data.url : 'https://lichess.org/training';
}

export async function fetchInfinityPuzzle(): Promise<PuzzleItem> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/infinity/next`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch next Lichess puzzle');
  return (await res.json()) as PuzzleItem;
}

export async function fetchRole(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.role === 'string' ? data.role : null;
}

export async function fetchAdminPuzzles(): Promise<PuzzleItem[]> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/admin`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load admin puzzle dashboard');
  const data = await res.json();
  return data.items || [];
}

export async function savePuzzle(payload: Partial<PuzzleItem>): Promise<PuzzleItem> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save puzzle');
  const data = await res.json();
  return data.item as PuzzleItem;
}

export async function removePuzzle(puzzleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/${puzzleId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Failed to delete puzzle');
}

export async function reorderAdminPuzzles(ids: string[]): Promise<PuzzleItem[]> {
  const res = await fetch(`${API_BASE}/api/chess/puzzles/admin/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to reorder puzzles');
  const data = await res.json();
  return data.items || [];
}