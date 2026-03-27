"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, BookOpen, Music, Crown, Activity, Settings, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import AccountControls from '@/components/core/auth/AccountControls';
import { useUser } from '@/hooks/auth/useUser';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('Navigation');
  const { user } = useUser();
  
  const navItems: NavItem[] = [
    { name: t('home'), path: '/', icon: <Home size={24} /> },
    { name: t('cv'), path: '/cv', icon: <BookOpen size={24} /> },
    { name: t('chess'), path: '/chess', icon: <Crown size={24} /> },
    { name: t('timeline'), path: '/timeline', icon: <BookOpen size={24} />, adminOnly: true },
    { name: t('music'), path: '/music', icon: <Music size={24} />, adminOnly: true },
    { name: t('studies'), path: '/studies', icon: <BookOpen size={24} />, adminOnly: true },
    { name: t('hobbies'), path: '/hobbies', icon: <Settings size={24} />, adminOnly: true },
    { name: t('sports'), path: '/sports', icon: <Activity size={24} />, adminOnly: true },
  ];

  const role = user?.role || null;
  const isAdmin = role === 'admin';

  // update role when other tabs change token
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'token') {
        if (e.newValue) {
          window.location.reload();
        }
      }
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

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-[84px] left-16 z-50 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('portfolioTitle')}</h2>
                  {role && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('roleLabel')}: {role}</div>
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
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {item.adminOnly && !isAdmin ? (
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
                        {item.adminOnly ? <Lock size={18} className="opacity-70" /> : null}
                      </Link>
                    )}
                  </motion.div>
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
                <AccountControls variant="sidebar" className="mb-3 text-left" />
                © {new Date().getFullYear()} Alexander Chen
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
