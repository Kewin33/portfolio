"use client";

import { useRef, useState } from "react";
import { useTranslations } from 'next-intl';
import TechIconSelect from "@/components/admin/TechIconSelect";
import { toProjectImageSrc } from "@/utils/projectImages";
import type { Project, ProjectSection } from "./projectTypes";

export default function AdminProjectForm({
  proj,
  token,
  apiBase,
  onCancel,
  onSave,
  onPreviewImage,
}: {
  proj: Partial<Project>;
  token: string;
  apiBase: string;
  onCancel: () => void;
  onSave: (p: Partial<Project>) => Promise<void>;
  onPreviewImage: (src: string, title: string) => void;
}) {
  const t = useTranslations('Admin.projects.form');
  const [state, setState] = useState<Partial<Project>>(proj);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setState((s) => ({ ...s, [k]: v }));

  function handleFileSelect(file: File) {
    const blobUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setLocalPreview(blobUrl);
    set("image", "");
  }

  function handleCancel() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    onCancel();
  }

  async function handleSave() {
    if (!state.title?.trim()) {
      setError(t('errors.titleRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let imageUrl = state.image || "";
      if (pendingFile) {
        const form = new FormData();
        form.append("file", pendingFile);
        form.append("projectTitle", state.title?.trim() || "project-image");
        const headers: Record<string, string> = {};
        const freshToken = (typeof window !== "undefined" ? localStorage.getItem("token") : null) || token;
        if (freshToken) headers["Authorization"] = `Bearer ${freshToken}`;
        const res = await fetch(`${apiBase}/api/projects/upload-image`, { method: "POST", headers, body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.detail || t('errors.imageUploadFailed'));
        imageUrl = json.url;
        if (localPreview) URL.revokeObjectURL(localPreview);
      }
      await onSave({ ...state, image: imageUrl || undefined, section: (state.section as ProjectSection) || "main" });
    } catch (err: any) {
      setError(err.message || t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = localPreview || toProjectImageSrc(state.image, apiBase) || null;

  return (
    <div className="mb-6 rounded border bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 font-semibold dark:text-white">{state.id ? t('editProject') : t('newProject')}</h3>
      <div className="grid gap-2">
        <input className="rounded border p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder={t('placeholders.title')} value={state.title || ""} onChange={(e) => set("title", e.target.value)} />
        <textarea className="h-20 rounded border p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder={t('placeholders.description')} value={state.description || ""} onChange={(e) => set("description", e.target.value)} />
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded border p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder={t('placeholders.github')} value={state.github || ""} onChange={(e) => set("github", e.target.value)} />
          <input className="rounded border p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder={t('placeholders.demo')} value={state.demo || ""} onChange={(e) => set("demo", e.target.value)} />
        </div>
        <select className="rounded border p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={state.section || "main"} onChange={(e) => set("section", e.target.value as ProjectSection)}>
          <option value="main">{t('section.main')}</option>
          <option value="other">{t('section.other')}</option>
        </select>
        <TechIconSelect value={state.skills || []} onChange={(next) => set("skills", next)} />
        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">{t('projectImage')}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFileSelect(f); }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded bg-slate-200 px-2 py-1 text-sm dark:bg-slate-700">{t('actions.choose')}</button>
            {previewSrc && (
              <button type="button" onClick={() => onPreviewImage(previewSrc, state.title || t('projectImageAlt'))} className="overflow-hidden rounded">
                <img src={previewSrc} alt={t('previewAlt')} className="h-12 w-20 rounded object-cover transition hover:scale-105" />
              </button>
            )}
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button disabled={saving} onClick={handleSave} className="rounded bg-blue-600 px-3 py-1 text-white">{t('actions.save')}</button>
          <button onClick={handleCancel} className="rounded bg-gray-200 px-3 py-1">{t('actions.cancel')}</button>
        </div>
      </div>
    </div>
  );
}