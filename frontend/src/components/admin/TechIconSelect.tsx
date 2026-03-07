"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

type IconItem = {
  src: string;
  label: string;
};

export default function TechIconSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetch("/api/tech-icons")
      .then((res) => res.json())
      .then((data) => {
        const list: IconItem[] = (data.icons || []).slice();
        list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
        setIcons(list);
      })
      .catch(() => setIcons([{ src: "/next.svg", label: "next" }]));
  }, []);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return icons.filter((icon) => !value.includes(icon.src) && (q === "" || icon.label.toLowerCase().includes(q)));
  }, [icons, value, query]);

  const filteredAvailable = available; // alias for clarity

  function addIconImmediate(src: string) {
    if (!src || value.includes(src)) return;
    onChange([...value, src]);
  }

  function removeIcon(src: string) {
    onChange(value.filter((item) => item !== src));
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500 dark:text-slate-400">Tech Icons</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="w-full text-left rounded border p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white flex items-center justify-between"
            aria-haspopup="listbox"
            aria-expanded={showSearch}
          >
            <span className="text-sm text-slate-800 dark:text-slate-200">Select icon</span>
            <ChevronDown size={16} className={`transition-transform ${showSearch ? 'rotate-180' : ''}`} />
          </button>

          {showSearch && (
            <div className="absolute left-0 right-0 mt-1 rounded bg-white dark:bg-slate-800 border z-40">
              {/* Search input as the first list element */}
              <div className="p-2 border-b dark:border-slate-700">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full rounded px-2 py-1 text-sm dark:bg-slate-800 dark:text-white"
                  onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                />
              </div>

              <div className="max-h-[280px] overflow-auto">
                {filteredAvailable.length === 0 && (
                  <div className="p-2 text-sm text-slate-500">No results</div>
                )}
                {filteredAvailable.map((icon) => (
                  <button
                    key={icon.src}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addIconImmediate(icon.src);
                      setQuery("");
                      setShowSearch(false);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    style={{ minHeight: 36 }}
                  >
                    <Image src={icon.src} alt={icon.label} width={18} height={18} className="h-4 w-4" />
                    <span className="text-sm">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map((src) => {
          const icon = icons.find((item) => item.src === src);
          return (
            <button
              key={src}
              type="button"
              onClick={() => removeIcon(src)}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              title="Remove icon"
            >
              <Image src={src} alt={icon?.label || src} width={16} height={16} className="h-4 w-4" />
              <span>{icon?.label || src.split("/").pop()?.split(".")[0] || src}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}