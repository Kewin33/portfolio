import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import MarkdownContent from "../content/MarkdownContent";

export interface TimelineEvent {
  title: string;
  start: string; // ISO date
  end: string;   // ISO date
  description?: string;
  tags?: string[];
}

interface TimelineProps {
  events: TimelineEvent[];
  tagColors?: Record<string, string | null>;
  zoom?: number;
}

// Zoom is expressed as fraction (1 = 100%).
// Requested ranges are percentages: min 0.0001% .. max 25%, default 0.001%
// Convert percentages to fractions: 0.0001% == 0.000001, 0.001% == 0.00001
const MIN_ZOOM = 0.000001; // 0.0001%
const MAX_ZOOM = 0.25;     // 25%
// Thresholds adapted for the very small default zoom scale
const YEAR_LABEL_THRESHOLD = 0.1; // 10% -> show years when zoom is extremely small
const COMPACT_THRESHOLD = 0.0005;    // 0.05% -> compact rendering when zoom is very small

function getTimelineRange(events: TimelineEvent[]) {
  const dates = events.flatMap(e => [new Date(e.start).getTime(), new Date(e.end).getTime()]);
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return { min, max };
}

export default function Timeline({ events, tagColors, zoom = 0.00001 }: TimelineProps) {
  if (events.length === 0) {
    return <div className="text-gray-400 text-center">No events yet.</div>;
  }

  const { min, max } = getTimelineRange(events);
  const total = max - min || 1;
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const normalized = sorted.map((event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    return {
      event,
      start,
      end: Math.max(start, end)
    };
  });
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.ceil(total / dayMs));
  // clamp zoom to allowed range and use `z` for all calculations
  const z = Math.min(Math.max(zoom ?? 0.001, MIN_ZOOM), MAX_ZOOM);
  const compact = z <= COMPACT_THRESHOLD;

  const axisHeight = Math.max(760, totalDays * 12 * z);
  const topPadding = 40;
  const bottomPadding = 80;
  const drawableHeight = axisHeight - topPadding - bottomPadding;
  const barWidth = 44;
  const descriptionOffset = 70;
  const descriptionWidth = 180;
  const laneEndTimes: number[] = [];
  const eventLanes = normalized.map(({ start, end }) => {
    let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd < start);
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(end);
    } else {
      laneEndTimes[laneIndex] = end;
    }
    return laneIndex;
  });
  const laneCount = Math.max(...eventLanes, 0) + 1;
  const preferredWidth = 980;
  const fixedOffset = 120 + descriptionOffset + descriptionWidth;
  const laneSpacing = laneCount > 1
    // increase minimum spacing so event titles have more room and don't overlap
    ? Math.max(260, Math.min(460, Math.floor((preferredWidth - fixedOffset) / (laneCount - 1))))
    : 0;

  // Color palette for events (fallback)
  const colors = [
    "#2563eb", // blue
    "#16a34a", // green
    "#eab308", // yellow
    "#db2777", // pink
    "#f97316", // orange
    "#0ea5e9", // sky
    "#a21caf", // purple
    "#f43f5e"  // red
  ];

  

  const [hovered, setHovered] = useState<number | null>(null);
  const elementRefs = useRef<Array<HTMLDivElement | null>>([]);
  const titleRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const TOOLTIP_VERTICAL_OFFSET = 20;

  // Keep tooltip sticky to the title while hovered by updating position on scroll/resize
  useEffect(() => {
    if (hovered === null) return;
    let raf = 0;
    const updatePos = () => {
      const titleEl = titleRefs.current[hovered] ?? elementRefs.current[hovered];
      if (titleEl && typeof window !== 'undefined') {
        const r = titleEl.getBoundingClientRect();
        const tooltipW = 256;
        const tooltipH = 120;
        const padding = 8;
        const preferRight = r.right + 12;
        let left: number;
        if (preferRight + tooltipW + padding <= window.innerWidth) {
          left = preferRight;
        } else {
          left = Math.max(padding, r.left - tooltipW - 12);
        }
        let top = r.top + (r.height / 2) - (tooltipH / 2) + TOOLTIP_VERTICAL_OFFSET;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipH - padding));
        setTooltipPos({ left, top });
      }
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(updatePos); };
    updatePos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [hovered]);

  return (
    <div
      className="relative py-8"
      style={{
        height: `${axisHeight}px`
      }}
    >
      {/* Vertical timeline axis */}
      <div className="absolute left-[3%] top-0 -translate-x-1/2 w-3 h-full bg-gray-300 dark:bg-gray-700 rounded" />
      {/* Month labels along axis */}
      {(() => {
        const months: { time: number; label: string }[] = [];
        // if zoom is very small (<= YEAR_LABEL_THRESHOLD) show year labels instead of months
        if (z <= YEAR_LABEL_THRESHOLD) {
          const startYear = new Date(min).getFullYear();
          const endYear = new Date(max).getFullYear();
          for (let y = startYear; y <= endYear; y++) {
            const d = new Date(Date.UTC(y, 0, 1));
            months.push({ time: d.getTime(), label: `${y}` });
          }
        } else {
          const startDate = new Date(min);
          startDate.setDate(1);
          startDate.setHours(0,0,0,0);
          let cur = new Date(startDate.getTime());
          while (cur.getTime() <= max) {
            const label = cur.toLocaleString(undefined, { month: 'short', year: 'numeric' });
            months.push({ time: cur.getTime(), label });
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          }
        }
        return months.map((m, i) => {
          const top = topPadding + ((m.time - min) / total) * drawableHeight;
          // year-only labels: shift right by 20px relative to previous left-offset
          const labelLeft = typeof m.label === 'string' && /^\d{4}$/.test(m.label) ? '-2px' : '8px';
          return (
            <React.Fragment key={`m-${i}`}>
              <div
                style={{ top: `${top}px` }}
                className="absolute left-[3%] -translate-x-1/2 w-5 h-[2px] bg-gray-500/70 dark:bg-gray-400/70 z-10"
              />
              <div
                className="absolute z-10 text-xs text-gray-600 dark:text-gray-400 text-right w-16"
                style={{ top: `${top - 8}px`, left: labelLeft }}
                title={m.label}
              >
                <span className="bg-white/70 dark:bg-gray-900/70 px-1 rounded">{m.label}</span>
              </div>
            </React.Fragment>
          );
        });
      })()}
      {/* Events as vertical bars */}
      {normalized.map(({ event, start, end }, idx) => {
        const top = topPadding + ((start - min) / total) * drawableHeight;
        const height = Math.max(16, ((end - start) / total) * drawableHeight);
        const laneIndex = eventLanes[idx];
        let color = colors[idx % colors.length];
        // prefer tag color mapping when available
        try {
          if ((event as any).tags && tagColors) {
            const evTags: string[] = (event as any).tags || [];
            for (const tg of evTags) {
              const c = tagColors[tg];
              if (c) {
                color = c;
                break;
              }
            }
          }
        } catch (e) {
          // ignore
        }
          return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="absolute"
            ref={(el) => { elementRefs.current[idx] = el; }}
            onMouseEnter={() => {
              setHovered(idx);
              const titleEl = titleRefs.current[idx];
              const el = titleEl ?? elementRefs.current[idx];
              if (el && typeof window !== 'undefined') {
                const r = el.getBoundingClientRect();
                const tooltipW = 256; // approximate tooltip width (px)
                const tooltipH = 120; // approximate tooltip height
                const padding = 8;
                const preferRight = r.right + 12; // candidate to the right of title
                let left: number;
                if (preferRight + tooltipW + padding <= window.innerWidth) {
                  left = preferRight;
                } else {
                  // place to the left of the element if right doesn't fit
                  left = Math.max(padding, r.left - tooltipW - 12);
                }
                // center vertically on the title element and shift downward by 20px
                const TOOLTIP_VERTICAL_OFFSET = 20;
                let top = r.top + (r.height / 2) - (tooltipH / 2) + TOOLTIP_VERTICAL_OFFSET;
                // clamp inside viewport
                top = Math.max(padding, Math.min(top, window.innerHeight - tooltipH - padding));
                setTooltipPos({ left, top });
              }
            }}
            onMouseLeave={() => {
              setHovered(null);
              setTooltipPos(null);
            }}
            style={{
              left: `calc(8% + ${laneIndex * laneSpacing}px)`,
              top: `${top}px`,
              width: `${barWidth}px`,
              height: `${height}px`,
              zIndex: 2
            }}
          >
            {/* Bar */}
            <div style={{ background: color }} className="w-full h-full rounded-full shadow relative flex items-end z-10">
              {/* Marker at start */}
              <div style={{ background: color }} className="absolute left-1/2 -translate-x-1/2 top-0 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900" />
            </div>
            {/* Description */}
            <div
              className="absolute top-0 flex flex-col justify-center h-full z-20"
              style={{
                left: `${descriptionOffset}px`,
                width: `${descriptionWidth}px`
              }}
            >
                <div className="font-bold text-lg" style={{ color }} ref={(el) => { titleRefs.current[idx] = el; }}>{event.title}</div>
                {!compact && (
                  <>
                    <div className="text-sm text-gray-500 mb-1">{event.start} - {event.end}</div>
                    <MarkdownContent content={event.description} className="text-sm text-gray-700 dark:text-gray-300" />
                  </>
                )}
            </div>
            {/* Hover tooltip for compact mode: show full details (rendered into body for top layering) */}
            {compact && hovered === idx && tooltipPos && createPortal(
              <div
                className="z-[9999] w-64 p-3 rounded border shadow"
                style={{
                  position: 'fixed',
                  top: `${tooltipPos.top}px`,
                  left: `${tooltipPos.left}px`,
                  background: '#f3f4f6', /* light gray */
                  color: '#111'
                }}
              >
                <div className="font-semibold mb-1" style={{ color }}>{event.title}</div>
                <div className="text-xs text-gray-600 mb-2">{event.start} - {event.end}</div>
                <MarkdownContent content={event.description} className="mb-2 text-sm text-gray-700 dark:text-gray-200" />
                <div className="flex flex-wrap gap-1">
                  {(event.tags || []).map((tg: string) => (
                    <div key={tg} className="text-xs px-2 py-0.5 rounded text-white" style={{ background: tagColors?.[tg] ?? '#9ca3af' }}>{tg}</div>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
