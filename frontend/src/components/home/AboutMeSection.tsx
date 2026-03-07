"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import MarkdownContent from "../content/MarkdownContent";

// highlights removed per request

export default function AboutMeSection() {
  const t = useTranslations("Index.about");
  const aboutContent = t("content");

  return (
    <section
      id="about"
      className="relative flex snap-start items-start bg-gradient-to-b from-slate-100 via-white to-blue-50 px-6 pt-[256px] pb-0 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 md:px-12 lg:px-12 pb-42"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-20 md:gap-24 md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.8fr)] lg:grid-cols-[minmax(250px,1fr)_minmax(0,2.3fr)]">
        <motion.div
          initial={{ x: -140, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center lg:justify-start"
        >
          <div className="relative w-full max-w-[260px] md:max-w-[300px] lg:max-w-[340px] xl:max-w-[380px]">
            {/* diamond-shaped border: rotate parent 45deg, rotate image back -45deg */}
            <div className="mx-auto aspect-square w-full relative">
              {/* glow removed; image mask only below */}

              {/* image masked by emoji diamond shape */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  WebkitMaskImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext x=%2250%22 y=%2250%22 font-size=%2290%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E%F0%9F%92%8E%3C/text%3E%3C/svg%3E')",
                  maskImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext x=%2250%22 y=%2250%22 font-size=%2290%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E%F0%9F%92%8E%3C/text%3E%3C/svg%3E')",
                  maskRepeat: "no-repeat",
                  maskSize: "contain",
                  maskPosition: "center",
                  zIndex: 10
                }}
              >
                <Image src="/hero-profile.png" alt={t("imageAlt")} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-teal-400/10 dark:from-blue-400/10 dark:to-teal-300/10" />
              </div>

              {/* subtle spark pulses around the diamond */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                <defs>
                  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" />
                  </filter>
                </defs>

                <circle cx="18%" cy="6%" r="3" fill="rgba(59,130,246,0.9)" filter="url(#blur)">
                  <animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" begin="0s" />
                  <animate attributeName="r" values="1;5;1" dur="2.2s" repeatCount="indefinite" begin="0s" />
                </circle>

                <circle cx="85%" cy="12%" r="2.5" fill="rgba(59,130,246,0.85)" filter="url(#blur)">
                  <animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite" begin="0.3s" />
                  <animate attributeName="r" values="1;6;1" dur="2.6s" repeatCount="indefinite" begin="0.3s" />
                </circle>

                <circle cx="92%" cy="62%" r="2" fill="rgba(96,165,250,0.8)" filter="url(#blur)">
                  <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" begin="0.6s" />
                  <animate attributeName="r" values="1;6;1" dur="3s" repeatCount="indefinite" begin="0.6s" />
                </circle>

                <circle cx="12%" cy="74%" r="2.5" fill="rgba(59,130,246,0.8)" filter="url(#blur)">
                  <animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite" begin="0.9s" />
                  <animate attributeName="r" values="1;5;1" dur="2.4s" repeatCount="indefinite" begin="0.9s" />
                </circle>

                <circle cx="50%" cy="-2%" r="2" fill="rgba(147,197,253,0.7)" filter="url(#blur)">
                  <animate attributeName="opacity" values="0;0.8;0" dur="3.2s" repeatCount="indefinite" begin="1.1s" />
                  <animate attributeName="r" values="1;7;1" dur="3.2s" repeatCount="indefinite" begin="1.1s" />
                </circle>
              </svg>

              {/* remove frame; use drop-shadow on mask for diamond glow */}
              {/* glow is handled via shadow on the outer masking div below */}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 140, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.12 }}
          className="min-w-0 text-slate-900 dark:text-white"
        >
          <p className="mb-6 text-left text-[42px] leading-[1.05] font-bold text-blue-700 dark:text-teal-200">{t("eyebrow")}</p>
          <div className="mt-4 text-slate-700 dark:text-slate-200">
            <MarkdownContent content={aboutContent} className="prose max-w-none dark:prose-invert" pClassName="text-lg md:text-xl" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
