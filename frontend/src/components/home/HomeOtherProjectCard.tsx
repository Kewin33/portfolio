"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useAnimation, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import type { HomeProject } from "./homeTypes";
import MarkdownContent from "../content/MarkdownContent";

function getLabel(src: string) {
  return src.split("/").pop()?.split(".")[0]?.replace(/[-_]+/g, " ") || "skill";
}

export default function HomeOtherProjectCard({ project }: { project: HomeProject }) {
  const t = useTranslations("Index");
  const skills = (project.skills || []).slice(0, 6);
  const [open, setOpen] = useState(false);
  const title = project.titleKey ? t(project.titleKey) : project.title;
  const description = project.descriptionKey ? t(project.descriptionKey) : project.description;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(cardRef, { amount: 0.25 });
  const controls = useAnimation();

  useEffect(() => {
    controls.start(
      inView
        ? {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" },
          }
        : {
            opacity: 0.22,
            scale: 0.88,
            y: 30,
            transition: { duration: 0.3, ease: "easeInOut" },
          },
    );
  }, [controls, inView]);

  return (
    <>
      <motion.div ref={cardRef} initial={{ opacity: 0.22, scale: 0.88, y: 30 }} animate={controls} className="will-change-transform">
        <button type="button" onClick={() => setOpen(true)} className="w-full rounded-xl border border-slate-300/70 bg-white/95 p-3 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-teal-100/15 dark:bg-slate-900/80">
        <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_10px_rgba(59,130,246,0.05)] dark:border-slate-700 dark:bg-slate-800">
          {project.image ? (
            <img src={project.image} alt={project.title || project.id} className="h-24 w-full object-cover" />
          ) : (
            <div className="flex h-24 items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">{project.title}</div>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/6 dark:bg-black/20 rounded-lg" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <div className="flex flex-wrap justify-end gap-2">
            {skills.map((src) => (
              <div key={src} className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-300/70 bg-white dark:border-orange-400/50 dark:bg-slate-950" title={getLabel(src)}>
                <Image src={src} alt={getLabel(src)} width={16} height={16} className="h-4 w-4 filter dark:invert dark:brightness-125" />
              </div>
            ))}
          </div>
        </div>
        </button>
      </motion.div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded bg-slate-200 px-3 py-1 text-sm dark:bg-slate-700 dark:text-white">Close</button>
            </div>

            {project.image ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_0_14px_rgba(59,130,246,0.06)] dark:border-slate-700 dark:bg-slate-900">
                <img src={project.image} alt={project.title || project.id} className="max-h-72 w-full object-cover" />
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/6 dark:bg-black/20 rounded-xl" />
              </div>
            ) : null}

            <MarkdownContent content={description} className="text-sm text-slate-700 dark:text-slate-200" />

            <div className="mt-5 flex flex-wrap gap-3">
              {project.demo && <a href={project.demo} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">{t("demo")}</a>}
              {project.github && <a href={project.github} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-800 dark:border-slate-600 dark:text-white">{t("github")}</a>}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((src) => (
                <div key={src} className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                  <Image src={src} alt={getLabel(src)} width={16} height={16} className="h-4 w-4 filter dark:invert dark:brightness-125" />
                  <span>{getLabel(src)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}