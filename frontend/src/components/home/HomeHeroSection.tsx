"use client";

import Image from "next/image";
import { Github, Linkedin, Mail, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import MarkdownContent from "../content/MarkdownContent";

interface HomeHeroSectionProps {
  typedText: string;
  locale: string;
  mounted: boolean;
  adminRole: string | null;
}

export default function HomeHeroSection({
  typedText,
  locale,
  mounted,
  adminRole,
}: HomeHeroSectionProps) {
  const t = useTranslations("Index");

  return (
    <section className="relative flex min-h-screen snap-start items-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-6 pb-12 pt-24 dark:from-teal-950 dark:via-slate-900 dark:to-teal-900 md:px-12 lg:px-12">
      <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.25)_1px,transparent_0)] [background-size:32px_32px] dark:opacity-20 dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-slate-900 dark:text-white">
          <p className="text-xl text-blue-700 dark:text-teal-200 md:text-2xl">{t("hello")}</p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">Alexander Chen.</h1>

          <p className="mt-8 text-2xl text-slate-700 dark:text-slate-100 md:text-3xl">
            {t("rolePrefix")} <span className="text-blue-600 dark:text-blue-300">{typedText}</span>
            <span className="animate-pulse text-blue-600 dark:text-blue-300">|</span>
          </p>

          <div className="mt-10 flex items-center gap-6 text-slate-600 dark:text-teal-100">
            <a href="https://github.com/kewin33" target="_blank" rel="noreferrer" className="transition hover:text-slate-900 dark:hover:text-white">
              <Github size={30} />
            </a>
            <a href="https://www.linkedin.com/in/alexander-chen-021562372/" target="_blank" rel="noreferrer" className="transition hover:text-slate-900 dark:hover:text-white">
              <Linkedin size={30} />
            </a>
            <a href="mailto:qingzhi1002@gmail.com" className="transition hover:text-slate-900 dark:hover:text-white">
              <Mail size={30} />
            </a>
          </div>

          {mounted && adminRole === "admin" && (
            <div className="mt-6 flex items-center gap-3">
              <a href={`/${locale}/admin`} className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700">{t("adminPanel")}</a>
            </div>
          )}
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative w-[260px] rotate-2 overflow-hidden rounded-[2.8rem] border-4 border-blue-200 bg-white shadow-2xl shadow-slate-300/70 dark:border-teal-200/90 dark:bg-slate-200 dark:shadow-black/30 sm:w-[320px]">
            <Image src="/hero-profile.png" alt="Alexander Chen" width={640} height={640} priority className="h-auto w-full object-cover" />
          </div>
        </div>
      </div>

      <a href="#about" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-blue-700 transition hover:text-slate-900 dark:text-teal-200 dark:hover:text-white" aria-label={t("scrollToAbout")}> 
        <ChevronDown size={34} />
      </a>
    </section>
  );
}
