"use client";

import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

type User = { id?: string; email: string; name?: string; role?: string; createdAt?: string; [key: string]: any };
type Project = { id: string; title: string; description?: string; image?: string; [key: string]: any };

export default function AdminUsers() {
  const t = useTranslations('Admin.users');
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''));
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || '';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { if (token) localStorage.setItem('token', token); }, [token]);

  async function api(path: string, opts: RequestInit = {}) {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    const currentToken = (typeof window !== 'undefined' ? localStorage.getItem('token') : null) || token;
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    opts.headers = { ...(opts.headers || {}), ...headers };
    const full = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(full, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || JSON.stringify(json));
    return json;
  }
  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api('/api/users/list');
      setUsers(data.users || []);
      setMessage(t('messages.loaded'));
    } catch (err: any) {
      setMessage(t('messages.loadFailed', { error: String(err.message || err) }));
    } finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function approve(email: string) {
    if (!confirm(t('confirmApprove', { email }))) return;
    setLoading(true);
    try {
      await api(`/api/users/approve?email=${encodeURIComponent(email)}`, { method: 'POST' });
      setMessage(t('messages.approved', { email }));
      await loadUsers();
    } catch (err: any) {
      setMessage(t('messages.approveFailed', { error: String(err.message || err) }));
    } finally { setLoading(false); }
  }

  async function deleteUser(email: string) {
    if (!confirm(t('confirmDelete', { email }))) return;
    setLoading(true);
    try {
      await api(`/api/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
      setMessage(t('messages.deleted', { email }));
      await loadUsers();
    } catch (err: any) {
      setMessage(t('messages.deleteFailed', { error: String(err.message || err) }));
    } finally { setLoading(false); }
  }

  async function updateUser(email: string, patch: Partial<User>) {
    setLoading(true);
    try {
      await api(`/api/users/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setMessage(t('messages.updated', { email }));
      await loadUsers();
    } catch (err: any) {
      setMessage(t('messages.updateFailed', { error: String(err.message || err) }));
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">{t('title')}</h2>

      <div className="mb-4 flex gap-2">
        <button onClick={() => loadUsers()} disabled={loading} className="px-3 py-1 bg-blue-700 text-white rounded text-sm disabled:opacity-50">{t('actions.reload')}</button>
        <div className="flex-1" />
      </div>

      {message && <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{message}</p>}

      <div className="space-y-3">
        {users.length === 0 && !loading && <p className="text-sm text-slate-400">{t('noUsersYet')}</p>}
        {users.map(u => (
          <UserRow
            key={u.email}
            user={u}
            onApprove={() => approve(u.email)}
            onDelete={() => deleteUser(u.email)}
            onUpdate={(patch) => updateUser(u.email, patch)}
            labels={{
              approve: t('actions.approve'),
              edit: t('actions.edit'),
              save: t('actions.save'),
              cancel: t('actions.cancel'),
              delete: t('actions.delete'),
              invalidEmail: t('invalidEmail'),
            }}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user, onApprove, onDelete, onUpdate, labels }: { user: User; onApprove: () => void; onDelete: () => void; onUpdate: (patch: Partial<User>) => void; labels: { approve: string; edit: string; save: string; cancel: string; delete: string; invalidEmail: string } }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');

  return (
    <div className="p-3 border rounded flex justify-between items-center">
      <div>
        <div className="font-semibold">{user.email} <span className="text-sm text-gray-500">{user.role || ''}</span></div>
        {!editing ? <div className="text-sm text-gray-600">{user.name || ''}</div> : (
          <div className="flex flex-col gap-2">
            <input value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <input value={email} onChange={e => setEmail(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {user.role === 'pending' && <button onClick={onApprove} className="px-2 py-1 bg-green-600 text-white rounded">{labels.approve}</button>}
        {!editing && <button onClick={() => { setEditing(true); setName(user.name || ''); }} className="px-2 py-1 bg-yellow-400 text-white rounded">{labels.edit}</button>}
        {editing && <button onClick={() => {
            const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            if (!isValidEmail(email)) { alert(labels.invalidEmail); return; }
            onUpdate({ name, email });
            setEditing(false);
          }} className="px-2 py-1 bg-blue-600 text-white rounded">{labels.save}</button>}
        {editing && <button onClick={() => setEditing(false)} className="px-2 py-1 bg-gray-200 rounded">{labels.cancel}</button>}
        <button onClick={onDelete} className="px-2 py-1 bg-red-600 text-white rounded">{labels.delete}</button>
      </div>
    </div>
  );
}
