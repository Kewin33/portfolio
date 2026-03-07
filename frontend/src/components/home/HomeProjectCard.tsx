"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useAnimation, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import type { HomeProject } from "./homeTypes";

const defaultTechIcons = [
  { src: "/next.svg", alt: "Next.js" },
  { src: "/tech/nodejs.svg", alt: "Node.js" },
  { src: "/tech/typescript.svg", alt: "TypeScript" },
];

const techLabelMap: Record<string, string> = {
  next: "Next.js",
  nodejs: "Node.js",
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  numpy: "NumPy",
  pytorch: "PyTorch",
  github: "GitHub",
  gitlab: "GitLab",
  angular: "Angular",
  esp32: "ESP32",
  espressif: "Espressif",
  csharp: "C#",
  c: "C",
  colab: "Google Colab",
  googlecolab: "Google Colab",
  react: "React",
  java: "Java",
};

function getTechLabel(src: string) {
  const baseName = src.split("/").pop()?.split(".")[0]?.toLowerCase() || "skill";
  return techLabelMap[baseName] || baseName.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

interface HomeProjectCardProps {
  project: HomeProject;
  index: number;
}

export default function HomeProjectCard({ project, index }: HomeProjectCardProps) {
  const t = useTranslations("Index");
  const isEven = index % 2 === 0;
  const skills = (project.skills || defaultTechIcons.map((item) => item.src)).filter(Boolean);
  const projectImage = project.image?.trim() || null;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(cardRef, { amount: 0.28 });
  const controls = useAnimation();

  useEffect(() => {
    controls.start(
      inView
        ? {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.55, ease: "easeOut" },
          }
        : {
            opacity: 0.18,
            scale: 0.86,
            y: 46,
            transition: { duration: 0.34, ease: "easeInOut" },
          },
    );
  }, [controls, inView]);

  return (
    <motion.div ref={cardRef} initial={{ opacity: 0.18, scale: 0.86, y: 46 }} animate={controls} className={`relative will-change-transform ml-6 md:ml-24 lg:ml-64 mr-auto max-w-[720px] px-3 md:px-4 lg:px-6 ${isEven ? "lg:-translate-x-8" : "lg:ml-128"}`}>
      <div className={`overflow-hidden rounded-xl border border-slate-300/60 bg-white shadow-xl shadow-slate-300/60 transform dark:border-teal-100/15 dark:bg-white/5 dark:shadow-black/25 ${isEven ? "lg:-translate-x-8" : "lg:translate-x-8"}`}>
        <div className="relative overflow-hidden rounded-t-xl shadow-[0_0_18px_rgba(59,130,246,0.06)] dark:shadow-none">
          {projectImage ? (
            <img
              src={projectImage}
              alt={`${project.title || project.id} project preview`}
              className="h-[220px] w-full object-cover sm:h-[260px] md:h-[320px] lg:h-[360px]"
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 text-sm text-slate-500 dark:from-slate-900 dark:to-teal-950 dark:text-slate-300 sm:h-[260px] md:h-[320px] lg:h-[360px]">
              {project.title || project.id}
            </div>
          )}

          {/* subtle overlay for improved contrast */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/6 dark:bg-black/20" />
        </div>
      </div>

      <div className={`relative z-20 -mt-4 rounded-xl border border-slate-300 bg-white/95 p-5 text-slate-900 shadow-lg dark:border-teal-100/15 dark:bg-teal-900/95 dark:text-slate-100 md:p-6 ${isEven ? "md:-mr-4 md:-mt-12 md:ml-6 lg:translate-x-6 lg:pl-6" : "md:-ml-4 md:-mt-12 md:mr-6 lg:-translate-x-6 lg:pr-6"}`}>
        <h3 className="text-3xl font-semibold text-black dark:text-white">{project.titleKey ? t(project.titleKey) : project.title}</h3>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700 dark:text-teal-50/90">
          {project.descriptionKey ? t(project.descriptionKey) : project.description}
        </p>

        <div className="mt-7 flex gap-6 text-lg text-blue-700 dark:text-teal-200">
          <a href={project.github} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-slate-900 dark:hover:text-white">
            {t("github")}
          </a>
          <a href={project.demo} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-slate-900 dark:hover:text-white">
            {t("demo")}
          </a>
        </div>

        <div className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 transform flex-wrap justify-center gap-3 items-end z-30 pointer-events-auto">
          {skills.map((src: string) => (
            <div key={src} className="group relative flex h-14 w-14 items-center justify-center rounded-md border border-blue-400/70 bg-white/90 shadow-md dark:border-orange-400/80 dark:bg-slate-950/90" aria-label={getTechLabel(src)}>
              <Image src={src} alt={getTechLabel(src)} width={28} height={28} className="h-7 w-7 filter dark:invert dark:brightness-125" />
              <span className="pointer-events-none absolute -top-8 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-800 opacity-0 shadow-lg shadow-slate-300/60 transition-all duration-150 group-hover:-translate-y-1 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-black/40">
                {getTechLabel(src)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
