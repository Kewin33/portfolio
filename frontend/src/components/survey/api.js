const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:8000';

function getAuthHeaders() {
  if (typeof window === 'undefined') {
    return { 'Content-Type': 'application/json' };
  }
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJsonOrThrow(res, fallbackMessage) {
  const payload = await res.json().catch(() => null);
  if (res.ok) {
    return payload;
  }
  const message = payload?.detail || payload?.error || fallbackMessage;
  throw new Error(message);
}

export async function listSchemas() {
  const res = await fetch(`${API_BASE}/api/survey/schemas`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  const payload = await parseJsonOrThrow(res, 'Schemas konnten nicht geladen werden');
  return payload?.files || [];
}

export async function loadSchema(filename) {
  const res = await fetch(
    `${API_BASE}/api/survey/schema?filename=${encodeURIComponent(filename)}`,
    {
      headers: getAuthHeaders(),
      cache: 'no-store',
    }
  );
  return parseJsonOrThrow(res, `Schema ${filename} konnte nicht geladen werden`);
}

export async function saveSchema({ filename, data, oldFilename }) {
  const res = await fetch(`${API_BASE}/api/survey/schema`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ filename, data, oldFilename }),
  });
  return parseJsonOrThrow(res, `Schema ${filename} konnte nicht gespeichert werden`);
}
