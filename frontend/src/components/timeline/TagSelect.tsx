"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from 'next-intl';
import Tag from '@/components/timeline/Tag';

type TagItem = { tag: string; count: number; color?: string | null };

export default function TagSelect({
  availableTags,
  selected,
  onChange,
  onCreate,
  placeholder = "Tags",
  allowCreate = true
}: {
  availableTags: TagItem[];
  selected: string[];
  onChange: (s: string[]) => void;
  onCreate?: () => void;
  placeholder?: string;
  allowCreate?: boolean;
}) {
  const t = useTranslations('Timeline');
  const [open, setOpen] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  const _authHeaders = (extra?: Record<string, string>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const base: Record<string, string> = { ...(extra ?? {}) };
    if (token) base.Authorization = `Bearer ${token}`;
    return base;
  };

  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag));
    else onChange([...selected, tag]);
  };

  const generateColor = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    const r = (h & 0xff0000) >> 16;
    const g = (h & 0x00ff00) >> 8;
    const b = (h & 0x0000ff);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex((r + 80) & 0xff)}${toHex((g + 120) & 0xff)}${toHex((b + 40) & 0xff)}`;
  };

  const createTag = async (name?: string) => {
    const tagName = name ?? prompt(t('newTagPrompt'));
    if (!tagName) return;
    const color = generateColor(tagName);
    await fetch(`${apiBase}/api/storage/timeline/tags`, {
      method: "POST",
      headers: _authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ tag: tagName, color })
    });
    if (onCreate) await onCreate();
    onChange([...selected, tagName]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1 border rounded bg-white dark:bg-gray-900"
        aria-haspopup
      >
        <span className="text-sm text-gray-700 dark:text-gray-200">{placeholder}</span>
        <div className="flex gap-1">
          {selected.slice(0,3).map(s => (
            <Tag key={s} name={s} color={availableTags.find(a => a.tag === s)?.color || undefined} />
          ))}
          {selected.length > 3 && <div className="text-xs text-gray-500">+{selected.length - 3}</div>}
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-56 bg-white dark:bg-gray-800 rounded shadow p-2">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {availableTags.map(t => {
              const isSelected = selected.includes(t.tag);
              return (
                <button
                  key={t.tag}
                  onClick={() => toggle(t.tag)}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded transition ${isSelected ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <div className="flex-1 flex items-center gap-2">
                      <div style={{ width: 18, height: 18, background: t.color || '#9CA3AF' }} className="rounded-sm" />
                    <div className="text-sm text-gray-900 dark:text-gray-100">{t.tag}</div>
                  </div>
                  <div className="text-xs text-gray-500 mr-2">{t.count}</div>
                  {isSelected && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="11" fill="#059669" />
                      <path d="M7 12.5l2.5 2.5L17 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {allowCreate && (
            <div className="mt-2 border-t pt-2">
              <button className="w-full text-left text-sm text-blue-600" onClick={() => createTag()}>{t('newTagButton')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
