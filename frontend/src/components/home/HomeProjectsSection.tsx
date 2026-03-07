"use client";

import { useTranslations } from "next-intl";
import HomeProjectCard from "./HomeProjectCard";
import type { HomeProject } from "./homeTypes";

interface HomeProjectsSectionProps {
  projects: HomeProject[];
}

export default function HomeProjectsSection({ projects }: HomeProjectsSectionProps) {
  const t = useTranslations("Index");
  const sortByIndex = (a: HomeProject, b: HomeProject) => (a.index ?? 9999) - (b.index ?? 9999);
  const mainProjects = projects.filter((project) => (project.section || "main") === "main").sort(sortByIndex);
  return (
    <section id="projects" className="relative flex snap-start items-center justify-center bg-gradient-to-b from-blue-50 via-slate-100 to-slate-200 px-6 py-24 md:py-32 dark:from-teal-950 dark:via-teal-900 dark:to-slate-950 md:px-12 lg:px-12">
      <div className="mx-auto w-full max-w-7xl grid md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.8fr)] gap-8">
        <div>
          <h2 className="mb-8 text-left text-[42px] leading-[1.05] font-bold text-blue-700 dark:text-teal-200">{t("projects")}</h2>
        </div>

        <div>
          <div className="space-y-28 md:space-y-32">
            {mainProjects.map((project, index) => (
              <HomeProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
