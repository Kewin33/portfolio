"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from 'next-intl';
import { useTranslations } from "next-intl";
import { toProjectImageSrc } from "@/utils/projectImages";
import AboutMeSection from "@/components/home/AboutMeSection";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeProjectsLoading from "@/components/home/HomeProjectsLoading";
import HomeProjectsSection from "@/components/home/HomeProjectsSection";
import HomeOtherProjectsSection from "@/components/home/HomeOtherProjectsSection";
import type { HomeProject } from "@/components/home/homeTypes";

export default function HomeLanding() {
  const t = useTranslations("Index");
  const roleItems = useMemo(() => t("roles").split(",").map((role) => role.trim()), [t]);

  const [roleIndex, setRoleIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const locale = useLocale();

  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showRenderCooldown, setShowRenderCooldown] = useState(false);


  useEffect(() => {
    const currentWord = roleItems[roleIndex % roleItems.length];
    const timeout = window.setTimeout(
      () => {
        if (!isDeleting && typedText.length < currentWord.length) {
          setTypedText(currentWord.slice(0, typedText.length + 1));
          return;
        }

        if (!isDeleting && typedText.length === currentWord.length) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && typedText.length > 0) {
          setTypedText(currentWord.slice(0, typedText.length - 1));
          return;
        }

        setIsDeleting(false);
        setRoleIndex((prev) => (prev + 1) % roleItems.length);
      },
      !isDeleting && typedText.length === currentWord.length ? 1300 : isDeleting ? 45 : 90
    );

    return () => window.clearTimeout(timeout);
  }, [typedText, isDeleting, roleIndex, roleItems]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkRole = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || '';
          const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setAdminRole(data.role);
          } else {
            localStorage.removeItem('token');
          }
        } catch {
          // ignore
        }
      };
      checkRole();
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    // load projects from backend (Drive)
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || '';
    let cooldownTimer: number | undefined;
    setLoadingProjects(true);
    setShowRenderCooldown(false);
    // If loading takes longer than 5s, show Render cooldown hint
    if (typeof window !== 'undefined') {
      cooldownTimer = window.setTimeout(() => setShowRenderCooldown(true), 5000);
    }

    fetch(`${API_BASE}/api/projects/`)
      .then(r => r.json())
      .then(j => setProjects(j.projects || []))
      .catch(() => setProjects([]))
      .finally(() => {
        if (typeof window !== 'undefined' && cooldownTimer) window.clearTimeout(cooldownTimer);
        setShowRenderCooldown(false);
        setLoadingProjects(false);
      });

    return () => {
      if (typeof window !== 'undefined' && cooldownTimer) window.clearTimeout(cooldownTimer);
    };
  }, []);

  useEffect(() => {
    // Resolve Drive folder links into the first file and proxy Drive file URLs via backend
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || '';
    async function resolveFolders() {
      let changed = false;
      const updated = await Promise.all(projects.map(async (p) => {
        const img = p.image || '';
        if (typeof img === 'string' && img.includes('/folders/')) {
          const m = img.match(/folders\/([a-zA-Z0-9_-]+)/);
          const fid = m ? m[1] : null;
          if (fid) {
            try {
              const res = await fetch(`${API_BASE}/api/storage/drive/folder-files?folderId=${encodeURIComponent(fid)}`);
              const json = await res.json();
              if (json.files && json.files.length) {
                const firstImage = json.files.find((file: { mimeType?: string }) => file.mimeType?.startsWith('image/')) || json.files[0];
                const nextImage = `${API_BASE}/api/projects/image/${firstImage.id}`;
                if (nextImage !== img) changed = true;
                return { ...p, image: nextImage };
              }
            } catch (_) {
              return p;
            }
          }
        }
        const nextImage = toProjectImageSrc(img, API_BASE);
        if (nextImage !== img) changed = true;
        return { ...p, image: nextImage };
      }));
      if (changed) setProjects(updated);
    }
    if (projects.length) resolveFolders();
  }, [projects]);

  // sync removed: projects are managed exclusively on Drive

  return (
    <div className="w-full snap-y snap-mandatory relative">
      <div className="relative z-20">
        <HomeHeroSection typedText={typedText} locale={locale} mounted={mounted} adminRole={adminRole} />
        <AboutMeSection />
        {loadingProjects ? (
          <HomeProjectsLoading showRenderCooldown={showRenderCooldown} />
        ) : (
          <>
            <HomeProjectsSection projects={projects} />
            <HomeOtherProjectsSection projects={projects} />
          </>
        )}
      </div>
    </div>
  );
}
