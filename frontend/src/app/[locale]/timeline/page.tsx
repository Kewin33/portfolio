"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import Timeline, { TimelineEvent } from "../../../components/Timeline";

type StoredTimelineEvent = TimelineEvent & {
  id?: string;
  deletedAt?: string | null;
};

const emptyEvent: TimelineEvent = {
  title: "",
  start: "",
  end: "",
  description: ""
};

export default function TimelinePage() {
  const t = useTranslations("Timeline");
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
  const isAdmin = true;
  const [formEvent, setFormEvent] = useState<TimelineEvent>(emptyEvent);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/storage/timeline/events`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("fetch failed");
      const data = await response.json();
      const serverEvents = (data.events ?? []) as StoredTimelineEvent[];
      if (serverEvents.length > 0) {
        setEvents(serverEvents);
        return;
      }

      const initPayload = {
        events: defaultEvents.map((event) => ({ ...event, deletedAt: null }))
      };
      const initResponse = await fetch(`${apiBase}/api/storage/timeline/events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
  }, [apiBase, defaultEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const persistEvents = async (nextEvents: StoredTimelineEvent[]) => {
    const response = await fetch(`${apiBase}/api/storage/timeline/events`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: nextEvents })
    });

    if (!response.ok) {
      throw new Error("save failed");
    }

    const data = await response.json();
    const serverEvents = (data.events ?? []) as StoredTimelineEvent[];
    setEvents(serverEvents);
  };

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
        deletedAt: null
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
      method: "PATCH"
    });
    if (response.ok) {
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
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <div className="w-full lg:pr-[26rem] overflow-x-auto md:overflow-x-hidden pb-2">
        {isLoading ? (
          <div className="text-gray-500 dark:text-gray-400">{t("loading")}</div>
        ) : (
          <Timeline events={activeEventEntries.map(({ event }) => event)} />
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
            <h3 className="text-base font-semibold mb-3">{t("manageEvents")}</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {activeEventEntries.map(({ event, index }) => (
                <div
                  key={`${event.title}-${event.start}-${index}`}
                  className="p-3 rounded border border-gray-300 dark:border-gray-700 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.start} - {event.end}
                    </p>
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
        </div>
      )}
    </motion.div>
  );
}
