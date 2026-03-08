"use client";

import { useTranslations } from "next-intl";
import HomeOtherProjectCard from "./HomeOtherProjectCard";
import type { HomeProject } from "./homeTypes";

interface HomeOtherProjectsSectionProps {
  projects: HomeProject[];
}

export default function HomeOtherProjectsSection({ projects }: HomeOtherProjectsSectionProps) {
  const t = useTranslations("Index");
  const sortByIndex = (a: HomeProject, b: HomeProject) => (a.index ?? 9999) - (b.index ?? 9999);
  const otherProjects = projects.filter((project) => project.section === "other").sort(sortByIndex);

  if (otherProjects.length === 0) return null;

  return (
    <section id="other-projects" className="relative flex snap-start items-center justify-center bg-gradient-to-b from-blue-50 via-slate-100 to-slate-200 px-6 py-24 md:py-32 dark:from-teal-950 dark:via-teal-900 dark:to-slate-950 md:px-12 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <div>
          <h3 className="mb-3 text-left text-[42px] leading-[1.05] font-bold text-blue-700 dark:text-teal-200">{t("otherProjects")}</h3>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{t('otherProjectsNote')}</p>
        </div>

        <div>
          <div className="grid gap-6 md:grid-cols-2">
            {otherProjects.map((project) => (
              <HomeOtherProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
