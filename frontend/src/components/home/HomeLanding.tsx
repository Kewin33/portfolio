"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Github, Linkedin, Mail, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

const techIcons = [
  { src: "/tech/raspberrypi.svg", alt: "Raspberry Pi" },
  { src: "/tech/angular.svg", alt: "Angular" },
  { src: "/tech/nodejs.svg", alt: "Node.js" },
  { src: "/tech/typescript.svg", alt: "TypeScript" },
  { src: "/tech/java.svg", alt: "Java" },
  { src: "/tech/cplusplus.svg", alt: "C++" }
];

export default function HomeLanding() {
  const t = useTranslations('Index');
  const roleItems = useMemo(() => t('roles').split(',').map(role => role.trim()), [t]);

  const [roleIndex, setRoleIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div className="w-full snap-y snap-mandatory">
      <section className="relative flex min-h-screen snap-start items-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-teal-950 dark:via-slate-900 dark:to-teal-900 px-6 pb-20 pt-24 md:px-12 lg:px-20">
        <div className="absolute inset-0 opacity-35 dark:opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.25)_1px,transparent_0)] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:32px_32px]" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-slate-900 dark:text-white">
            <p className="text-xl text-blue-700 dark:text-teal-200 md:text-2xl">{t('hello')}</p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">Alexander Chen.</h1>

            <p className="mt-8 text-2xl text-slate-700 dark:text-slate-100 md:text-3xl">
              {t('rolePrefix')} <span className="text-blue-600 dark:text-blue-300">{typedText}</span>
              <span className="animate-pulse text-blue-600 dark:text-blue-300">|</span>
            </p>

            <div className="mt-10 flex items-center gap-6 text-slate-600 dark:text-teal-100">
              <a href="https://github.com/kewin33" target="_blank" rel="noreferrer" className="transition hover:text-slate-900 dark:hover:text-white">
                <Github size={30} />
              </a>
              <a href="https://linkedin.com/in/alexander-chen" target="_blank" rel="noreferrer" className="transition hover:text-slate-900 dark:hover:text-white">
                <Linkedin size={30} />
              </a>
              <a href="mailto:qingzhi1002@gmail.com" className="transition hover:text-slate-900 dark:hover:text-white">
                <Mail size={30} />
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[260px] rotate-2 overflow-hidden rounded-[2.8rem] border-4 border-blue-200 dark:border-teal-200/90 bg-white dark:bg-slate-200 shadow-2xl shadow-slate-300/70 dark:shadow-black/30 sm:w-[320px]">
              <Image
                src="/hero-profile.png"
                alt="Alexander Chen"
                width={640}
                height={640}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>

        <a
          href="#projects"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-blue-700 dark:text-teal-200 transition hover:text-slate-900 dark:hover:text-white"
          aria-label="Scroll to projects"
        >
          <ChevronDown size={34} />
        </a>
      </section>

      <section
        id="projects"
        className="relative flex min-h-screen snap-start items-center justify-center bg-gradient-to-b from-blue-50 via-slate-100 to-slate-200 dark:from-teal-950 dark:via-teal-900 dark:to-slate-950 px-6 py-24 md:px-12"
      >
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="mb-12 text-center text-5xl font-bold text-blue-700 dark:text-teal-200 md:text-6xl">{t('projects')}</h2>

          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-slate-300/60 dark:border-teal-100/15 bg-white dark:bg-white/5 shadow-xl shadow-slate-300/60 dark:shadow-black/25">
              <Image
                src="/project-depictor.png"
                alt="Depictor project preview"
                width={1200}
                height={675}
                className="h-auto w-full object-cover"
              />
            </div>

            <div className="-mt-4 rounded-xl border border-slate-300 dark:border-teal-100/15 bg-white/95 dark:bg-teal-900/95 p-6 text-slate-900 dark:text-slate-100 shadow-lg md:mx-8 md:-mt-20 md:p-8">
              <h3 className="text-3xl font-semibold text-blue-700 dark:text-teal-200">{t('projectTitle')}</h3>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700 dark:text-teal-50/90">{t('projectDesc')}</p>

              <div className="mt-7 flex gap-6 text-lg text-blue-700 dark:text-teal-200">
                <a href="https://github.com/kewin33/depictor" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-slate-900 dark:hover:text-white">
                  {t('github')}
                </a>
                <a href="https://youtu.be/demo" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-slate-900 dark:hover:text-white">
                  {t('demo')}
                </a>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {techIcons.map((icon) => (
                <div
                  key={icon.alt}
                  className="flex h-11 w-11 items-center justify-center rounded-md border border-blue-400/70 dark:border-orange-400/80 bg-white dark:bg-slate-950/85 shadow-md"
                  title={icon.alt}
                  aria-label={icon.alt}
                >
                  <Image src={icon.src} alt={icon.alt} width={22} height={22} className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
