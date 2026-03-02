import React from "react";
import { motion } from "framer-motion";

export interface TimelineEvent {
  title: string;
  start: string; // ISO date
  end: string;   // ISO date
  description?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

function getTimelineRange(events: TimelineEvent[]) {
  const dates = events.flatMap(e => [new Date(e.start).getTime(), new Date(e.end).getTime()]);
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return { min, max };
}

export default function Timeline({ events }: TimelineProps) {
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
  const axisHeight = Math.max(760, totalDays * 12);
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
    ? Math.max(170, Math.min(300, Math.floor((preferredWidth - fixedOffset) / (laneCount - 1))))
    : 0;

  // Color palette for events
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

  return (
    <div
      className="relative py-8"
      style={{
        height: `${axisHeight}px`
      }}
    >
      {/* Vertical timeline axis */}
      <div className="absolute left-[3%] top-0 -translate-x-1/2 w-3 h-full bg-gray-300 dark:bg-gray-700 rounded" />
      {/* Events as vertical bars */}
      {normalized.map(({ event, start, end }, idx) => {
        const top = topPadding + ((start - min) / total) * drawableHeight;
        const height = Math.max(16, ((end - start) / total) * drawableHeight);
        const laneIndex = eventLanes[idx];
        const color = colors[idx % colors.length];
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="absolute"
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
              <div className="font-bold text-lg" style={{ color }}>{event.title}</div>
              <div className="text-sm text-gray-500 mb-1">{event.start} - {event.end}</div>
              <div className="text-gray-700 dark:text-gray-300">{event.description}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
