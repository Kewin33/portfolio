"use client";

import { useEffect, useState } from "react";

type User = { id?: string; email: string; name?: string; role?: string; createdAt?: string; [key: string]: any };
type Project = { id: string; title: string; description?: string; image?: string; [key: string]: any };

export default function AdminUsers() {
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
      setMessage('Loaded users');
    } catch (err: any) {
      setMessage('Load failed: ' + (err.message || err));
    } finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function approve(email: string) {
    if (!confirm(`Approve ${email}?`)) return;
    setLoading(true);
    try {
      await api(`/api/users/approve?email=${encodeURIComponent(email)}`, { method: 'POST' });
      setMessage('Approved ' + email);
      await loadUsers();
    } catch (err: any) {
      setMessage('Approve failed: ' + (err.message || err));
    } finally { setLoading(false); }
  }

  async function deleteUser(email: string) {
    if (!confirm(`Delete user ${email}?`)) return;
    setLoading(true);
    try {
      await api(`/api/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
      setMessage('Deleted ' + email);
      await loadUsers();
    } catch (err: any) {
      setMessage('Delete failed: ' + (err.message || err));
    } finally { setLoading(false); }
  }

  async function updateUser(email: string, patch: Partial<User>) {
    setLoading(true);
    try {
      await api(`/api/users/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setMessage('Updated ' + email);
      await loadUsers();
    } catch (err: any) {
      setMessage('Update failed: ' + (err.message || err));
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Admin: Users</h2>

      <div className="mb-4 flex gap-2">
        <button onClick={() => loadUsers()} disabled={loading} className="px-3 py-1 bg-blue-700 text-white rounded text-sm disabled:opacity-50">Reload</button>
        <div className="flex-1" />
      </div>

      {message && <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{message}</p>}

      <div className="space-y-3">
        {users.length === 0 && !loading && <p className="text-sm text-slate-400">No users yet.</p>}
        {users.map(u => (
          <UserRow key={u.email} user={u} onApprove={() => approve(u.email)} onDelete={() => deleteUser(u.email)} onUpdate={(patch) => updateUser(u.email, patch)} />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user, onApprove, onDelete, onUpdate }: { user: User; onApprove: () => void; onDelete: () => void; onUpdate: (patch: Partial<User>) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || '');

  return (
    <div className="p-3 border rounded flex justify-between items-center">
      <div>
        <div className="font-semibold">{user.email} <span className="text-sm text-gray-500">{user.role || ''}</span></div>
        {!editing ? <div className="text-sm text-gray-600">{user.name || ''}</div> : (
          <input value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        )}
      </div>
      <div className="flex gap-2">
        {user.role === 'pending' && <button onClick={onApprove} className="px-2 py-1 bg-green-600 text-white rounded">Approve</button>}
        {!editing && <button onClick={() => { setEditing(true); setName(user.name || ''); }} className="px-2 py-1 bg-yellow-400 text-white rounded">Edit</button>}
        {editing && <button onClick={() => { onUpdate({ name }); setEditing(false); }} className="px-2 py-1 bg-blue-600 text-white rounded">Save</button>}
        {editing && <button onClick={() => setEditing(false)} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>}
        <button onClick={onDelete} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
      </div>
    </div>
  );
}
