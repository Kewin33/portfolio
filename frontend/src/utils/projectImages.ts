export function extractDriveFileId(value?: string | null) {
  if (!value) return null;
  const match = value.match(/(?:id=|\/d\/|\/file\/d\/)([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

export function toProjectImageSrc(value: string | undefined, apiBase: string) {
  if (!value) return "";
  if (value.startsWith("blob:")) return value;
  if (value.startsWith("/api/projects/image/") || value.startsWith(`${apiBase}/api/projects/image/`)) {
    return value;
  }
  const fileId = extractDriveFileId(value);
  if (fileId) {
    return `${apiBase}/api/projects/image/${fileId}`;
  }
  return value;
}