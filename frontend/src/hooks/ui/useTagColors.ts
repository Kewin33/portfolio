"use client";

import { useEffect, useState } from "react";

export default function useTagColors() {
  const [tagColors, setTagColors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/storage/timeline/events");
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const mapping = data?.tagColors || {};
        setTagColors(mapping);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { tagColors, loading } as const;
}
