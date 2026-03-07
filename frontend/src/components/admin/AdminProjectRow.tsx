"use client";

import { GripVertical } from "lucide-react";
import { toProjectImageSrc } from "@/utils/projectImages";
import type { Project } from "./projectTypes";

export default function AdminProjectRow({
  project,
  apiBase,
  onEdit,
  onDelete,
  onPreview,
  onDragStart,
  onDrop,
  isDragging,
}: {
  project: Project;
  apiBase: string;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  isDragging?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`flex items-start gap-3 rounded border bg-white p-3 transition dark:border-slate-700 dark:bg-slate-800 ${isDragging ? "border-blue-500 ring-2 ring-blue-300/70 opacity-70" : ""}`}
    >
      <div className="flex h-16 items-center text-slate-400">
        <GripVertical className="h-5 w-5" />
      </div>
      <button type="button" onClick={onPreview} className="shrink-0 cursor-grab overflow-hidden rounded active:cursor-grabbing">
        {project.image ? (
          <img src={toProjectImageSrc(project.image, apiBase)} alt={project.title} className="h-16 w-16 rounded object-cover transition hover:scale-105" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-300">No image</div>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold dark:text-white">{project.title}</div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">{project.section || "main"}</span>
          <span className="text-[11px] text-slate-400">#{project.index ?? 0}</span>
        </div>
        <div className="truncate text-sm text-slate-500">{project.description}</div>
        {project.skills?.length ? <div className="mt-1 text-xs text-slate-400">{project.skills.join(", ")}</div> : null}
      </div>

      <div className="flex shrink-0 gap-2">
        <button onClick={onEdit} className="rounded bg-yellow-400 px-2 py-1 text-xs dark:bg-yellow-600">Edit</button>
        <button onClick={onDelete} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Delete</button>
      </div>
    </div>
  );
}