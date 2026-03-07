"use client";

import { useState } from 'react';
import AdminProjects from './AdminProjects';
import AdminUsers from './AdminUsers';

export default function AdminShell() {
  const [tab, setTab] = useState<'projects'|'users'>('projects');

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('projects')} className={`px-3 py-1 rounded ${tab==='projects' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Projects</button>
        <button onClick={() => setTab('users')} className={`px-3 py-1 rounded ${tab==='users' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Users</button>
      </div>

      <div>
        {tab === 'projects' && <AdminProjects />}
        {tab === 'users' && <AdminUsers />}
      </div>
    </div>
  );
}
