"use client";

import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Crown,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import SectionHeader from '@/components/content/SectionHeader';

type AuthResponse = {
  access_token?: string;
  detail?: string;
  [key: string]: unknown;
};

export default function LoginPage() {
  const t = useTranslations('Login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'register'|'admin'|'global'>('login');
  const [error, setError] = useState<string | null>(null);

  const modeOptions: Array<{
    key: 'login' | 'register' | 'admin' | 'global';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'login', label: t('modes.login'), icon: User },
    { key: 'register', label: t('modes.register'), icon: UserPlus },
    { key: 'admin', label: t('modes.admin'), icon: Crown },
    { key: 'global', label: t('modes.global'), icon: Globe2 },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    function isValidEmail(v: string) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:8000';
      let res;
      if (mode === 'register') {
        if (!isValidEmail(email)) {
          setError('Invalid email address');
          return;
        }
        res = await fetch(`${API_BASE}/api/users/register`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password, name}) });
      } else if (mode === 'admin') {
        res = await fetch(`${API_BASE}/api/auth/admin`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password}) });
      } else if (mode === 'global') {
        res = await fetch(`${API_BASE}/api/users/global`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password}) });
      } else {
        res = await fetch(`${API_BASE}/api/users/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password}) });
      }
      // Try to parse JSON; if server returned HTML/error page, show text
      let data: AuthResponse | null = null;
      const ctype = res.headers.get('content-type') || '';
      if (ctype.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        // if the response looks like HTML, include a helpful hint
        throw new Error(text.slice(0, 100) || 'Non-JSON response from server');
      }
      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));

      if (mode === 'register') {
        // Notify admin from frontend using EmailJS (service/template/public key)
        try {
          await emailjs.send(
            'service_xuj1r6n',
            'template_l3xfqun',
            { from_name: name || '', user_email: email || '' },
            'hZ3OHErA4WFvBQAf_'
          );
        } catch (e) {
          console.error('Frontend admin notification failed:', e);
          // continue anyway but inform the user
          alert(t('registerSuccess') || 'Registrierung eingegangen — warte auf Freigabe per E-Mail.\nHinweis: Admin-Benachrichtigung fehlgeschlagen.');
          router.push('/');
          return;
        }

        alert(t('registerSuccess') || 'Registrierung eingegangen — warte auf Freigabe per E-Mail.');
        router.push('/');
        return;
      }

      // store token
      if (!data?.access_token) {
        throw new Error(t('tokenMissing'));
      }
      localStorage.setItem('token', data.access_token);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError(String(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <SectionHeader title={t('title') || 'Login'} subtitle={t('subtitle')} compact />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]"
      >
        <aside className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-100 via-white to-slate-100 p-6 shadow-sm dark:border-blue-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-300/30 blur-2xl dark:bg-blue-500/10" />
          <div className="absolute -left-10 bottom-2 h-28 w-28 rounded-full bg-slate-300/40 blur-xl dark:bg-slate-500/15" />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/60 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-blue-800 dark:border-blue-700/40 dark:bg-slate-900/40 dark:text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              {t('sideTag')}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('sideTitle')}</h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t('sideDescription')}</p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <span>{t('sidePointOne')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <span>{t('sidePointTwo')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <LockKeyhole className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <span>{t('sidePointThree')}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const active = mode === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMode(option.key)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-blue-400 bg-blue-600 text-white shadow-sm dark:border-blue-500 dark:bg-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode !== 'admin' && mode !== 'global' && (
              <>
                {mode === 'register' && (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('nameLabel')}</span>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </label>
                )}

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('emailLabel')}</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('passwordLabel')}</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  type="password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-300/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </label>

            <button
              type="submit"
              className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {t('submit') || 'Submit'}
            </button>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}
          </form>
        </section>
      </motion.div>
    </div>
  );
}
