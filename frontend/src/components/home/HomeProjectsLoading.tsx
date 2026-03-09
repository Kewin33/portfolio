"use client";

import { useTranslations } from "next-intl";

type HomeProjectsLoadingProps = {
  showRenderCooldown: boolean;
};

export default function HomeProjectsLoading({
  showRenderCooldown,
}: HomeProjectsLoadingProps) {
  const t = useTranslations("Index.projectLoading");

  return (
    <section className="px-6 py-10 md:px-10" aria-live="polite">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
          <span className="h-3 w-3 animate-pulse rounded-full bg-blue-700 dark:bg-blue-400" />
          <p className="text-base font-medium">{t("title")}</p>
        </div>
        {showRenderCooldown && (
          <p className="max-w-2xl text-sm leading-6 text-amber-700 dark:text-amber-400">
            {t("renderCooldown")}
          </p>
        )}
      </div>
    </section>
  );
}