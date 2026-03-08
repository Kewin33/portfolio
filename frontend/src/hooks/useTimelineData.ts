import { useCallback, useEffect, useState } from "react";
import type { TimelineEvent } from "@/components/timeline/Timeline";

type StoredTimelineEvent = TimelineEvent & { id?: string; deletedAt?: string | null };

export default function useTimelineData(defaultEvents: TimelineEvent[] = [], tags: string[] = [], deps: any[] = []) {
  const [events, setEvents] = useState<StoredTimelineEvent[]>([]);
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number; color?: string | null }[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, string | null>>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  const _authHeaders = (extra?: Record<string, string>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const base: Record<string, string> = { ...(extra ?? {}) };
    if (token) base.Authorization = `Bearer ${token}`;
    return base;
  };

  const fetchTagsList = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/storage/timeline/tags`, { cache: 'no-store' });
      if (!res.ok) return setAvailableTags([]);
      const data = await res.json();
      setAvailableTags(data.tags || []);
    } catch {
      setAvailableTags([]);
    }
  }, [apiBase]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = new URL(`${apiBase}/api/storage/timeline/events`);
      if (tags && tags.length) {
        url.searchParams.set('tags', tags.join(','));
      }
      // if running as admin, backend can return soft-deleted events when requested
      if (isAdmin) {
        url.searchParams.set('include_deleted', 'true');
      }
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('fetch failed');
      const data = await response.json();
      const serverEvents = (data.events ?? []) as StoredTimelineEvent[];
      const serverTagColors = (data.tagColors ?? {}) as Record<string, string | null>;
      if (serverEvents.length > 0) {
        setEvents(serverEvents);
        setTagColors(serverTagColors);
      } else {
        setEvents(defaultEvents.map((e) => ({ ...e, deletedAt: null })));
      }
    } catch {
      setEvents(defaultEvents.map((e) => ({ ...e, deletedAt: null })));
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, defaultEvents, tags, isAdmin]);

  useEffect(() => {
    const checkAdminServer = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAdmin(false);
          return;
        }
        const res = await fetch(`${apiBase}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) { setIsAdmin(false); return; }
        const data = await res.json();
        setIsAdmin(data.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    };

    fetchEvents();
    fetchTagsList();
    checkAdminServer();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'role') {
        checkAdminServer();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // deps allow callers to trigger refetch
  }, [fetchEvents, fetchTagsList, apiBase, ...(deps || []), tags]);

  return {
    events,
    setEvents,
    availableTags,
    setAvailableTags,
    tagColors,
    setTagColors,
    isAdmin,
    isLoading,
    fetchEvents,
    fetchTagsList
  };
}
