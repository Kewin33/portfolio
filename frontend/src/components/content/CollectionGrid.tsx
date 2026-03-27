"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { Check } from 'lucide-react';

export type CollectionItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  badgeText?: string;
  badgeIcon?: React.ReactNode;
  solved?: boolean;
};

export type CollectionGridProps = {
  items: CollectionItem[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'default' | 'dense';
};

export default function CollectionGrid({ items, columns = 2, variant = 'dense' }: CollectionGridProps) {
  const gridColsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  };
  
  const columnsClass = gridColsMap[columns as keyof typeof gridColsMap] || gridColsMap[2];
  const gapClass = variant === 'dense' ? 'gap-3 md:gap-5' : 'gap-8';

  return (
    <div className={`grid ${columnsClass} ${gapClass}`}>
      {items.map((item, index) => {
        const href = item.href ?? '';
        const isExternal = href.startsWith('http');
        const previewLabel = (() => {
          if (!href) return item.title;
          try {
            const u = new URL(href, 'http://example.com');
            return u.pathname.replace(/^\//, '') || item.title;
          } catch {
            return item.title;
          }
        })();

        const DefaultCard = (
          <div className="relative flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
              <div className="w-[70%] h-[60%] bg-white/60 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <span className="text-slate-600 dark:text-slate-300 font-medium text-sm text-center px-4 truncate w-full">
                  {previewLabel}
                </span>
              </div>

              {(item.badgeIcon || item.badgeText) && (
                <div className="absolute right-4 bottom-[-18px] w-12 h-12 bg-blue-600 dark:bg-blue-400 text-white dark:text-slate-900 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-md z-10 text-lg">
                  {item.badgeIcon || <span className="text-xl">{item.badgeText}</span>}
                </div>
              )}
            </div>

            <div className="px-1 flex-grow flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );

        const DenseCard = (
          <div className="relative flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] py-8 px-4 shadow-[0_2px_8px_rgb(0,0,0,0.03)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            {item.solved && (
              <div className="absolute right-2 top-2 rounded-full bg-emerald-500 text-white p-1 shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
            <div className="text-3xl mb-4 text-slate-600 dark:text-slate-400 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300">
              {item.badgeIcon || item.badgeText}
            </div>
            <h3 className="text-[14px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center">
              {item.title}
            </h3>
          </div>
        );

        const CardContent = variant === 'dense' ? DenseCard : DefaultCard;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="h-full"
          >
            {item.onClick ? (
              <button type="button" onClick={item.onClick} className="block h-full w-full text-left cursor-pointer outline-none">
                {CardContent}
              </button>
            ) : isExternal ? (
              <a href={href} target="_blank" rel="noreferrer" className="block h-full outline-none">
                {CardContent}
              </a>
            ) : href ? (
              <Link href={href} className="block h-full cursor-pointer outline-none">
                {CardContent}
              </Link>
            ) : (
              <div className="block h-full outline-none">{CardContent}</div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
