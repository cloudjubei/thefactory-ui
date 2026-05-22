/**
 * Builds the backend URL that serves a project file's raw bytes. Used by
 * the image / PDF / binary viewers, which fetch this URL with the auth
 * token (web as a blob, native via `Image` headers / a download).
 */
export function rawFileUrl(apiBaseUrl: string, projectId: string, path: string): string {
  const base = apiBaseUrl.replace(/\/+$/, '')
  return `${base}/api/v1/projects/${encodeURIComponent(projectId)}/files/raw?path=${encodeURIComponent(path)}`
}
