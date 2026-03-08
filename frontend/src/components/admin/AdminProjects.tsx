"use client";

import { useEffect, useState } from "react";
import { toProjectImageSrc } from "@/utils/projectImages";
import AdminImageModal from "./AdminImageModal";
import AdminProjectForm from "./AdminProjectForm";
import AdminProjectRow from "./AdminProjectRow";
import type { Project } from "./projectTypes";

export default function AdminProjects() {
  const [token] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''));
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || (process.env.NEXT_PUBLIC_BACKEND_URL as string) || '';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const mainProjects = projects.filter((project) => (project.section || 'main') === 'main');
  const otherProjects = projects.filter((project) => project.section === 'other');

  useEffect(() => { load(); /* load on mount */ }, []);

  async function api(path: string, opts: RequestInit = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') || token : token;
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    opts.headers = { ...(opts.headers || {}), ...headers };
    const full = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await fetch(full, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || JSON.stringify(json));
    return json;
  }

  async function load() {
    setLoading(true);
    try {
      const data = await api('/api/projects/');
      setProjects(data.projects || []);
      setMessage('Loaded ' + (data.projects?.length ?? 0) + ' projects');
    } catch (err: any) {
      setMessage('Load failed: ' + err.message);
    } finally { setLoading(false); }
  }

  

  async function createOrUpdate(proj: Partial<Project>) {
    setLoading(true);
    try {
      if (proj.id) {
        await api(`/api/projects/${proj.id}`, { method: 'PATCH', body: JSON.stringify(proj) });
        setMessage('Updated project');
      } else {
        await api('/api/projects/', { method: 'POST', body: JSON.stringify(proj) });
        setMessage('Created project');
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      setMessage('Save failed: ' + err.message);
      throw err;
    } finally { setLoading(false); }
  }

  async function saveOrder(nextProjects: Project[]) {
    setProjects(nextProjects);
    try {
      await api('/api/projects/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items: nextProjects.map((project) => ({ id: project.id, index: project.index ?? 0 })) }),
      });
      setMessage('Project order updated');
      await load();
    } catch (err: any) {
      setMessage('Reorder failed: ' + err.message);
    }
  }

  function handleDrop(targetId: string, section: 'main' | 'other') {
    if (!draggedId || draggedId === targetId) return;
    const sectionProjects = projects.filter((project) => (project.section || 'main') === section);
    const otherSectionProjects = projects.filter((project) => (project.section || 'main') !== section);
    const current = [...sectionProjects];
    const fromIndex = current.findIndex((project) => project.id === draggedId);
    const toIndex = current.findIndex((project) => project.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    setDraggedId(null);
    const reindexedSection = current.map((project, index) => ({ ...project, index, section }));
    const merged = [...otherSectionProjects, ...reindexedSection];
    void saveOrder(merged);
  }

  async function remove(id: string) {
    if (!confirm('Delete this project?')) return;
    setLoading(true);
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' });
      setMessage('Deleted');
      await load();
    } catch (err: any) {
      setMessage('Delete failed: ' + err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Admin: Projects</h2>

      {/* Admin token is read from localStorage silently; UI removed per requirements */}

      <div className="flex gap-2 mb-4">
        <button onClick={load} disabled={loading} className="px-3 py-1 bg-blue-700 text-white rounded text-sm disabled:opacity-50">Reload</button>
        <button onClick={() => setEditing({ id: '', title: '' })} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">+ New Project</button>
      </div>

      {message && <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{message}</p>}

      {editing && (
        <AdminProjectForm
          proj={editing}
          token={token}
          apiBase={API_BASE}
          onCancel={() => setEditing(null)}
          onSave={createOrUpdate}
          onPreviewImage={(src, title) => setSelectedImage({ src, title })}
        />
      )}

      <ProjectSectionBlock
        title="Main Projects"
        projects={mainProjects}
        apiBase={API_BASE}
        draggedId={draggedId}
        onEdit={(project) => setEditing(project)}
        onDelete={(project) => remove(project.id)}
        onPreview={(project) => setSelectedImage({ src: toProjectImageSrc(project.image, API_BASE), title: project.title })}
        onDragStart={(project) => setDraggedId(project.id)}
        onDrop={(project) => handleDrop(project.id, 'main')}
      />

      <ProjectSectionBlock
        title="Other Projects"
        projects={otherProjects}
        apiBase={API_BASE}
        draggedId={draggedId}
        onEdit={(project) => setEditing(project)}
        onDelete={(project) => remove(project.id)}
        onPreview={(project) => setSelectedImage({ src: toProjectImageSrc(project.image, API_BASE), title: project.title })}
        onDragStart={(project) => setDraggedId(project.id)}
        onDrop={(project) => handleDrop(project.id, 'other')}
      />

      {projects.length === 0 && !loading && <p className="text-sm text-slate-400">No projects yet.</p>}

      {selectedImage && (
        <AdminImageModal src={selectedImage.src} title={selectedImage.title} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}

function ProjectSectionBlock({
  title,
  projects,
  apiBase,
  draggedId,
  onEdit,
  onDelete,
  onPreview,
  onDragStart,
  onDrop,
}: {
  title: string;
  projects: Project[];
  apiBase: string;
  draggedId: string | null;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onPreview: (project: Project) => void;
  onDragStart: (project: Project) => void;
  onDrop: (project: Project) => void;
}) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="space-y-3">
        {projects.map((project) => (
          <AdminProjectRow
            key={project.id}
            project={project}
            apiBase={apiBase}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project)}
            onPreview={() => onPreview(project)}
            onDragStart={() => onDragStart(project)}
            onDrop={() => onDrop(project)}
            isDragging={draggedId === project.id}
          />
        ))}
        {projects.length === 0 && <p className="text-sm text-slate-400">No projects in this section.</p>}
      </div>
    </div>
  );
}
