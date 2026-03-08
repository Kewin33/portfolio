"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, BookOpen, Music, Target, Activity, Settings, Lock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('Navigation');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const navItems = [
    { name: t('home'), path: '/', icon: <Home size={24} /> },
    { name: t('cv'), path: '/cv', icon: <BookOpen size={24} /> },
    { name: t('timeline'), path: '/timeline', icon: <BookOpen size={24} />, adminOnly: true },
    { name: t('chess'), path: '/chess', icon: <Target size={24} />, adminOnly: true },
    { name: t('music'), path: '/music', icon: <Music size={24} />, adminOnly: true },
    { name: t('studies'), path: '/studies', icon: <BookOpen size={24} />, adminOnly: true },
    { name: t('hobbies'), path: '/hobbies', icon: <Settings size={24} />, adminOnly: true },
    { name: t('sports'), path: '/sports', icon: <Activity size={24} />, adminOnly: true },
  ];

  // read role from localStorage token (set by login)
  const [role, setRole] = useState<string | null>(null);
  const isAdmin = role === 'admin';
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRole(localStorage.getItem('role'));
    }
  }, []);

  // update role when other tabs change localStorage
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'role') setRole(e.newValue);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    };
  }, []);

  // Dark mode toggle (Tailwind expects 'dark' class on <html>)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Sync dark mode class whenever mode changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode]);

  const handleDarkModeToggle = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      }
      return next;
    });
  };

  const switchLocale = () => {
    const nextLocale = locale === 'en' ? 'de' : 'en';
    router.replace(pathname, { locale: nextLocale });
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-6 left-6 z-50 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
      >
        <Menu size={24} className="text-gray-900 dark:text-gray-100" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 h-full w-80 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl shadow-2xl z-50 border-r border-gray-200 dark:border-gray-800 p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My portfolio</h2>
                  {role && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Role: {role}</div>
                  )}
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <nav className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar">
                {navItems.map((item, i) => (
                  (item as any).requiredRole && role && ((role !== 'admin' && role !== 'global' && role !== (item as any).requiredRole)) ? null : (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {(item as any).adminOnly && !isAdmin ? (
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-gray-300 p-4 text-lg font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                        <div className="flex items-center gap-4">
                          {item.icon}
                          <span>{item.name}</span>
                        </div>
                        <Lock size={18} />
                      </div>
                    ) : (
                      <Link 
                        href={item.path}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between gap-4 p-4 text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-4">
                          {item.icon}
                          <span>{item.name}</span>
                        </div>
                        {(item as any).adminOnly ? <Lock size={18} className="opacity-70" /> : null}
                      </Link>
                    )}
                  </motion.div>
                  )
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 text-center">
                {!isAdmin && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <Lock size={16} />
                      <span>{t('lockedTitle')}</span>
                    </div>
                    <p>{t('lockedDescription')}</p>
                  </div>
                )}
                <div className="flex justify-center gap-4 mb-4">
                  <button
                    onClick={handleDarkModeToggle}
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                  >
                    {darkMode ? '🌙 Dark' : '☀️ Light'}
                  </button>
                  <button
                    onClick={switchLocale}
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                  >
                    {locale === 'en' ? 'DE' : 'EN'}
                  </button>
                </div>
                <div className="flex justify-center gap-4 mb-2 items-center">
                  {role ? (
                    <>
                      <div className="text-sm text-gray-700 dark:text-gray-300">Signed in as <strong className="ml-1">{role}</strong></div>
                      <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('role'); setRole(null); setIsOpen(false); window.location.href = '/'; }} className="px-4 py-2 rounded bg-red-500 text-white">Logout</button>
                    </>
                  ) : (
                    <a href="/login" className="px-4 py-2 rounded bg-blue-600 text-white">Login</a>
                  )}
                </div>
                © {new Date().getFullYear()} Alexander Chen
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
