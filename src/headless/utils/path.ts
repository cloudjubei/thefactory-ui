// Pure utilities for working with file paths and type hints. Shared between
// web's and native's file-display compounds so they classify the same names
// the same way.

export function splitPath(p: string): { dir: string; name: string } {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  if (idx === -1) return { dir: '', name: p }
  return { dir: p.slice(0, idx + 1), name: p.slice(idx + 1) }
}

export function extFromTypeOrName(type?: string | null, name?: string): string | null {
  if (type) {
    const parts = type.split('/')
    if (parts.length === 2 && parts[1]) return parts[1].toLowerCase()
    return type.toLowerCase()
  }
  if (name && name.includes('.')) {
    const ext = name.split('.').pop()
    if (ext) return ext.toLowerCase()
  }
  return null
}

const TEXT_LIKE_EXTS = new Set([
  'css',
  'js',
  'cjs',
  'mjs',
  'json',
  'log',
  'markdown',
  'md',
  'styles',
  'text',
  'ts',
  'tsx',
  'txt',
  'yaml',
  'yml',
])

export function isTextLikeExt(ext: string | null): boolean {
  return ext != null && TEXT_LIKE_EXTS.has(ext)
}

export function formatBytes(size?: number | null): string | null {
  if (size == null || Number.isNaN(size)) return null
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let s = size
  let i = 0
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024
    i++
  }
  return `${s % 1 === 0 ? s.toFixed(0) : s.toFixed(1)} ${units[i]}`
}

export function formatFileDate(input?: number | string | Date | null): string | null {
  if (!input && input !== 0) return null
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
