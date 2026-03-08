"use client";

import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('Login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'register'|'admin'|'global'>('login');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || 'http://localhost:8000';
      let res;
      if (mode === 'register') {
        res = await fetch(`${API_BASE}/api/users/register`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password, name}) });
      } else if (mode === 'admin') {
        res = await fetch(`${API_BASE}/api/auth/admin`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password}) });
      } else if (mode === 'global') {
        res = await fetch(`${API_BASE}/api/users/global`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password}) });
      } else {
        res = await fetch(`${API_BASE}/api/users/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password}) });
      }
      // Try to parse JSON; if server returned HTML/error page, show text
      let data: any = null;
      const ctype = res.headers.get('content-type') || '';
      if (ctype.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        // if the response looks like HTML, include a helpful hint
        throw new Error(text.slice(0, 100) || 'Non-JSON response from server');
      }
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));

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

      // store token and role
      const role = mode === 'admin' ? 'admin' : (mode === 'global' ? 'global' : 'friend');
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', role);
      router.push('/');
    } catch (err: any) {
      setError(String(err.message || err));
    }
  }

  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">{t('title') || 'Login'}</h1>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode('login')} className={`px-3 py-1 rounded ${mode==='login'?'bg-blue-600 text-white':'bg-gray-200'}`}>Login</button>
        <button onClick={() => setMode('register')} className={`px-3 py-1 rounded ${mode==='register'?'bg-blue-600 text-white':'bg-gray-200'}`}>Register</button>
        <button onClick={() => setMode('admin')} className={`px-3 py-1 rounded ${mode==='admin'?'bg-blue-600 text-white':'bg-gray-200'}`}>Admin</button>
        <button onClick={() => setMode('global')} className={`px-3 py-1 rounded ${mode==='global'?'bg-blue-600 text-white':'bg-gray-200'}`}>Global</button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode !== 'admin' && mode !== 'global' && (
            <>
              {mode === 'register' && (
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="p-2 border rounded" />
              )}
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded" />
            </>
        )}
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="p-2 border rounded" />
        <button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">{t('submit') || 'Submit'}</button>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    </div>
  );
}
