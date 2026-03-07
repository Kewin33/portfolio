"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import Timeline, { TimelineEvent } from "../../../components/timeline/Timeline";
import Tag from '@/components/timeline/Tag';
import TagSelect from '@/components/timeline/TagSelect';

type StoredTimelineEvent = TimelineEvent & {
  id?: string;
  deletedAt?: string | null;
};

const emptyEvent: TimelineEvent = {
  title: "",
  start: "",
  end: "",
  description: "",
  tags: []
};

export default function TimelinePage() {
  const t = useTranslations("Timeline");
  const safeT = (key: string, fallback: string) => {
    try {
      return t(key);
    } catch {
      return fallback;
    }
  };
  const defaultEvents = useMemo<TimelineEvent[]>(() => [
    {
      title: t("events.portfolio.title"),
      start: "2026-03-01",
      end: "2026-03-01",
      description: t("events.portfolio.description")
    },
    {
      title: t("events.tournament.title"),
      start: "2026-02-10",
      end: "2026-02-15",
      description: t("events.tournament.description")
    },
    {
      title: t("events.music.title"),
      start: "2026-01-10",
      end: "2026-01-20",
      description: t("events.music.description")
    },
    {
      title: t("events.studies.title"),
      start: "2026-01-15",
      end: "2026-02-20",
      description: t("events.studies.description")
    }
  ], [t]);
  const [events, setEvents] = useState<StoredTimelineEvent[]>([]);
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number; color?: string | null }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, string | null>>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [formEvent, setFormEvent] = useState<TimelineEvent>(emptyEvent);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(0.001);
  const [searchQuery, setSearchQuery] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  const formatZoom = (p: number) => {
    if (p >= 1) return `${Math.round(p)}%`;
    // show a compact representation for tiny percentages
    return `${Number(p).toPrecision(6).replace(/\.0+$/,'')}%`;
  };

  const _authHeaders = (extra?: Record<string, string>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const base: Record<string, string> = { ...(extra ?? {}) };
    if (token) base.Authorization = `Bearer ${token}`;
    return base;
  };

  const fetchEvents = useCallback(async () => {
    try {
      const url = new URL(`${apiBase}/api/storage/timeline/events`);
      // Admin users should receive soft-deleted events so they can restore them
      if (isAdmin) {
        url.searchParams.set("include_deleted", "true");
      }
      if (selectedTags.length) url.searchParams.set('tags', selectedTags.join(','));
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error("fetch failed");
      const data = await response.json();
      const serverEvents = (data.events ?? []) as StoredTimelineEvent[];
      const serverTagColors = (data.tagColors ?? {}) as Record<string, string | null>;
      if (serverEvents.length > 0) {
        setEvents(serverEvents);
        setTagColors(serverTagColors);
        return;
      }

      const initPayload = {
        events: defaultEvents.map((event) => ({ ...event, deletedAt: null }))
      };
      const initResponse = await fetch(`${apiBase}/api/storage/timeline/events`, {
        method: "PUT",
        headers: _authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(initPayload)
      });
      if (initResponse.ok) {
        const initData = await initResponse.json();
        setEvents(initData.events ?? []);
      } else {
        setEvents(defaultEvents.map((event) => ({ ...event, deletedAt: null })));
      }
    } catch {
      setEvents(defaultEvents.map((event) => ({ ...event, deletedAt: null })));
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, defaultEvents, selectedTags, isAdmin]);

  useEffect(() => {
    fetchEvents();
    fetchTagsList();
  }, [fetchEvents]);

  // determine admin state from localStorage token/role
  useEffect(() => {
    const checkAdminServer = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAdmin(false);
          return;
        }
        const res = await fetch(`${apiBase}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await res.json();
        setIsAdmin(data.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
    };

    checkAdminServer();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'role') checkAdminServer();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const fetchTagsList = async () => {
    try {
      const res = await fetch(`${apiBase}/api/storage/timeline/tags`, { cache: 'no-store' });
      if (!res.ok) return setAvailableTags([]);
      const data = await res.json();
      setAvailableTags(data.tags || []);
    } catch {
      setAvailableTags([]);
    }
  };

  const persistEvents = async (nextEvents: StoredTimelineEvent[]) => {
    const response = await fetch(`${apiBase}/api/storage/timeline/events`, {
      method: "PUT",
      headers: _authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ events: nextEvents })
    });

    if (!response.ok) {
      throw new Error("save failed");
    }

    const data = await response.json();
    const serverEvents = (data.events ?? []) as StoredTimelineEvent[];
    setEvents(serverEvents);
    setTagColors((data.tagColors ?? {}) as Record<string, string | null>);
    // Alert if backend reports a count mismatch
    if (data.count_ok === false) {
      let msg = `Save count mismatch: expected ${data.expected_count}, actual ${data.actual_count}`;
      if ((data as any).backup_path) msg += `\nBackup saved: ${(data as any).backup_path}`;
      // eslint-disable-next-line no-alert
      alert(msg);
    }
  };

  // refetch when selected tags change
  useEffect(() => {
    fetchEvents();
  }, [selectedTags]);

  const resetForm = () => {
    setFormEvent(emptyEvent);
    setEditingIndex(null);
  };

  const handleSubmitEvent = async () => {
    if (!formEvent.title || !formEvent.start || !formEvent.end) return;

    const current = [...events];

    if (editingIndex === null) {
      current.push({
        title: formEvent.title,
        start: formEvent.start,
        end: formEvent.end,
        description: formEvent.description,
        deletedAt: null,
        tags: formEvent.tags ?? []
      });
    } else {
      const existing = current[editingIndex];
      current[editingIndex] = {
        ...existing,
        ...formEvent,
        deletedAt: existing?.deletedAt ?? null
      };
    }

    try {
      await persistEvents(current);
      resetForm();
    } catch {
      // keep current form state on failure
    }
  };

  const handleEditEvent = (index: number) => {
    setFormEvent(events[index]);
    setEditingIndex(index);
  };

  const activeEventEntries = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => !event.deletedAt);

  const deletedEventEntries = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => !!event.deletedAt);

  const filteredActiveEventEntries = activeEventEntries.filter(({ event }) => {
    if (!searchQuery) return true;
    return (event.title || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredDeletedEventEntries = deletedEventEntries.filter(({ event }) => {
    if (!searchQuery) return true;
    return (event.title || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSoftDeleteEvent = async (index: number) => {
    const target = events[index];
    if (!target?.id) {
      const cloned = events.map((event, idx) => {
        if (idx !== index) return event;
        return {
          ...event,
          deletedAt: new Date().toISOString()
        };
      });
      await persistEvents(cloned);
      if (editingIndex === index) resetForm();
      return;
    }

    const response = await fetch(`${apiBase}/api/storage/timeline/events/${target.id}/soft-delete`, {
      method: "PATCH",
      headers: _authHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      if (data.count_ok === false) {
        let msg = `Count mismatch after soft-delete: expected ${data.expected_count}, actual ${data.actual_count}`;
        if ((data as any).backup_path) msg += `\nBackup saved: ${(data as any).backup_path}`;
        // eslint-disable-next-line no-alert
        alert(msg);
      }
      await fetchEvents();
      if (editingIndex === index) resetForm();
    }
  };

  const handleRestoreEvent = async (index: number) => {
    const target = events[index];
    if (!target?.id) {
      const cloned = events.map((event, idx) => {
        if (idx !== index) return event;
        return {
          ...event,
          deletedAt: null
        };
      });
      await persistEvents(cloned);
      if (editingIndex === index) resetForm();
      return;
    }

    const response = await fetch(`${apiBase}/api/storage/timeline/events/${target.id}/restore`, {
      method: "PATCH",
      headers: _authHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      if (data.count_ok === false) {
        let msg = `Count mismatch after restore: expected ${data.expected_count}, actual ${data.actual_count}`;
        if ((data as any).backup_path) msg += `\nBackup saved: ${(data as any).backup_path}`;
        // eslint-disable-next-line no-alert
        alert(msg);
      }
      await fetchEvents();
      if (editingIndex === index) resetForm();
    }
  };

  const handlePermanentDelete = async (index: number) => {
    const target = events[index];
    if (!target?.id) {
      const cloned = events.filter((_, idx) => idx !== index);
      await persistEvents(cloned);
      if (editingIndex === index) resetForm();
      return;
    }

    const response = await fetch(`${apiBase}/api/storage/timeline/events/${target.id}`, {
      method: "DELETE",
      headers: _authHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      if (data.count_ok === false) {
        let msg = `Count mismatch after delete: expected ${data.expected_count}, actual ${data.actual_count}`;
        if ((data as any).backup_path) msg += `\nBackup saved: ${(data as any).backup_path}`;
        // eslint-disable-next-line no-alert
        alert(msg);
      }
      await fetchEvents();
      if (editingIndex === index) resetForm();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full px-4 md:px-8 lg:px-12 py-8"
    >
      <h1 className="mt-16 text-3xl font-bold mb-6">{t("title")}</h1>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <TagSelect
            availableTags={availableTags}
            selected={selectedTags}
            onChange={(next) => setSelectedTags(next)}
            onCreate={fetchTagsList}
            placeholder={t("filterTags") ?? "Filter tags"}
            allowCreate={true}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-16">{t("zoom")}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomPercent(p => Math.max(0.001, p / 2))}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              // allow very large zoom-out values down to 0.001% (tiny fraction)
              min={0.001}
              max={220}
              step={0.001}
              value={zoomPercent}
              onChange={(e) => setZoomPercent(Number(e.target.value))}
              className="w-20 sm:w-28 md:w-32 lg:w-40"
            />
            <button
              onClick={() => setZoomPercent(p => Math.min(220, p * 2))}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoomPercent(100)}
              className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reset
            </button>
          </div>
          <span className="text-sm text-gray-500 w-24 text-right">{formatZoom(zoomPercent)}</span>
        </div>
      </div>
      <div className="w-full lg:pr-[26rem] overflow-x-auto hide-scrollbar pb-2">
        
        {isLoading ? (
          <div className="text-gray-500 dark:text-gray-400">{t("loading")}</div>
        ) : (
          <Timeline
            events={activeEventEntries.map(({ event }) => event)}
            tagColors={tagColors}
            zoom={zoomPercent / 100}
          />
        )}
      </div>
      {isAdmin && (
        <div className="absolute top-8 right-4 md:right-8 lg:right-12 w-full max-w-sm p-6 bg-gray-100 dark:bg-gray-800 rounded-xl shadow z-20">
          <h2 className="text-xl font-semibold mb-4">
            {editingIndex === null ? t("addEvent") : t("editEvent")}
          </h2>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder={t("eventTitle")}
              value={formEvent.title}
              onChange={e => setFormEvent({ ...formEvent, title: e.target.value })}
              className="p-2 rounded border border-gray-300 dark:border-gray-700"
            />
            <div>
              <TagSelect
                availableTags={availableTags}
                selected={formEvent.tags || []}
                onChange={(next) => setFormEvent({ ...formEvent, tags: next })}
                onCreate={fetchTagsList}
                placeholder={t("eventTags") ?? "Tags"}
              />
            </div>
            <div className="flex gap-4">
              <input
                type="date"
                placeholder={t("startDate")}
                value={formEvent.start}
                onChange={e => setFormEvent({ ...formEvent, start: e.target.value })}
                className="p-2 rounded border border-gray-300 dark:border-gray-700 w-1/2"
              />
              <input
                type="date"
                placeholder={t("endDate")}
                value={formEvent.end}
                onChange={e => setFormEvent({ ...formEvent, end: e.target.value })}
                className="p-2 rounded border border-gray-300 dark:border-gray-700 w-1/2"
              />
            </div>
            <textarea
              placeholder={t("eventDescription")}
              value={formEvent.description}
              onChange={e => setFormEvent({ ...formEvent, description: e.target.value })}
              className="p-2 rounded border border-gray-300 dark:border-gray-700"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSubmitEvent}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                {editingIndex === null ? t("add") : t("save")}
              </button>
              {editingIndex !== null && (
                <button
                  onClick={resetForm}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                >
                  {t("cancel")}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold mb-3">{t("manageEvents")}</h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={safeT("searchTitle", "Search by title")}
                className="ml-3 p-1 rounded border border-gray-300 dark:border-gray-700 text-sm w-40"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredActiveEventEntries.map(({ event, index }) => (
                <div
                  key={`${event.title}-${event.start}-${index}`}
                  className="p-3 rounded border border-gray-300 dark:border-gray-700 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.start} - {event.end}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(event.tags || []).map((tg: string) => (
                        <Tag key={tg} name={tg} color={tagColors[tg] || undefined} />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditEvent(index)}
                    className="text-sm px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition shrink-0"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleSoftDeleteEvent(index)}
                    className="text-sm px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 transition shrink-0"
                  >
                    {t("softDelete")}
                  </button>
                </div>
              ))}
            </div>
          </div>
          {deletedEventEntries.length > 0 && (
            <div className="mt-6">
              <details className="bg-transparent rounded">
                <summary className="cursor-pointer text-base font-semibold mb-3 list-none">
                  {safeT("deletedEvents", "Deleted events")} ({deletedEventEntries.length})
                </summary>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 mt-2">
                  {deletedEventEntries.map(({ event, index }) => (
                    <div
                      key={`deleted-${event.title}-${event.start}-${index}`}
                      className="p-3 rounded border border-gray-300 dark:border-gray-700 flex items-start justify-between gap-2 bg-red-50 dark:bg-red-900/20"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">{event.start} - {event.end}</p>
                        <p className="text-xs text-gray-500">{event.deletedAt}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(event.tags || []).map((tg: string) => (
                            <Tag key={tg} name={tg} color={tagColors[tg] || undefined} />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleRestoreEvent(index)}
                          className="text-sm px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition shrink-0"
                        >
                          {safeT("restore", "Restore")}
                        </button>
                        <button
                          onClick={() => handleSoftDeleteEvent(index)}
                          className="text-sm px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 transition shrink-0"
                        >
                          {safeT("softDelete", "Soft delete")}
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(index)}
                          className="text-sm px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition shrink-0"
                        >
                          {safeT("deletePermanent", "Delete permanently")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          {/* Tags are managed via the event tag dropdown; TagEditor removed */}
        </div>
      )}
    </motion.div>
  );
}
