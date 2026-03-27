'use client';

import { useEffect, useState } from 'react';
import { Languages, LogIn, LogOut, Moon, Sun, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useUser } from '@/hooks/auth/useUser';

type ControlsVariant = 'topbar' | 'sidebar' | 'footer';

interface AccountControlsProps {
  variant?: ControlsVariant;
  className?: string;
}

export default function AccountControls({ variant = 'topbar', className = '' }: AccountControlsProps) {
  const t = useTranslations('AccountControls');
  const { user, loading } = useUser();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // Keep first render SSR-safe; resolve persisted/system theme after mount.
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readTheme = () => (
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );

    const syncTheme = () => {
      setDarkMode(readTheme());
    };

    // Defer first client-side synchronization to avoid setState in effect body.
    queueMicrotask(syncTheme);

    window.addEventListener('storage', syncTheme);
    window.addEventListener('theme-change', syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('theme-change', syncTheme);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      window.dispatchEvent(new Event('theme-change'));
      return next;
    });
  };

  const switchLocale = () => {
    const nextLocale = locale === 'en' ? 'de' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_cache');
    router.push('/');
    window.dispatchEvent(new Event('storage'));
  };

  const identity = user?.name || user?.email || user?.sub || '';
  const username = identity.includes('@') ? identity.split('@')[0] : identity;
  const compact = variant === 'topbar';

  const wrapClass =
    variant === 'sidebar'
      ? 'flex flex-col gap-2'
      : compact
        ? 'flex items-center flex-wrap justify-end gap-1.5'
        : 'flex items-center flex-wrap justify-end gap-2';

  const btnClass =
    compact
      ? 'inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs leading-none transition-colors'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm transition-colors';

  return (
    <div className={`${wrapClass} ${className}`.trim()}>
      <button type="button" onClick={toggleTheme} className={btnClass} aria-label={t('toggleTheme')}>
        {darkMode ? <Moon size={compact ? 14 : 16} /> : <Sun size={compact ? 14 : 16} />}
        <span>{darkMode ? t('dark') : t('light')}</span>
      </button>

      <button type="button" onClick={switchLocale} className={btnClass} aria-label={t('switchLanguage')}>
        <Languages size={compact ? 14 : 16} />
        <span>{locale === 'en' ? 'DE' : 'EN'}</span>
      </button>

      {loading ? (
        <div className={`${compact ? 'h-6 w-20' : 'h-8 w-28'} rounded bg-slate-200 dark:bg-slate-700 animate-pulse`} />
      ) : user ? (
        <>
          <div className={`${compact ? 'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs leading-none' : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm'} border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80`}>
            <User size={compact ? 14 : 16} />
            <span className="font-medium">{username || t('userFallback')}</span>
          </div>
          <button type="button" onClick={logout} className={btnClass} aria-label={t('logout')}>
            <LogOut size={compact ? 14 : 16} />
            <span>{t('logout')}</span>
          </button>
        </>
      ) : (
        <Link href="/login" className={btnClass} aria-label={t('login')}>
          <LogIn size={compact ? 14 : 16} />
          <span>{t('login')}</span>
        </Link>
      )}
    </div>
  );
}
