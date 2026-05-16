/**
 * Defensive accessors used by the tool-call hover preview registry. Tool
 * payloads are loosely-typed — these helpers extract fields the SDK
 * doesn't promise (`result.diff.patch`, etc.) without throwing.
 *
 * Lifted from `overseer-local`'s `ToolCall/utils.ts` 1:1 so both apps
 * share one source of truth.
 */

export function tryString(v: unknown): string | undefined {
  if (v == null) return undefined
  try {
    if (typeof v === 'string') return v
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function extract(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    const parts = k.split('.')
    let cur: unknown = obj
    let ok = true
    for (const p of parts) {
      if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = (cur as Record<string, unknown>)[p]
      } else {
        ok = false
        break
      }
    }
    if (ok) return cur
  }
  return undefined
}

export function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export function toLines(value: unknown): string[] {
  if (value == null) return []
  let str: string
  if (typeof value === 'string') str = value
  else {
    try {
      str = JSON.stringify(value, null, 2)
    } catch {
      str = String(value)
    }
  }
  return str.split(/\r?\n/)
}

export function looksLikeDiffPatchText(text: string): boolean {
  const s = (text || '').trim()
  if (!s) return false
  if (s.includes('@@')) return true
  if (/^Index:\s+/m.test(s)) return true
  if (/^---\s+/m.test(s) && /^\+\+\+\s+/m.test(s)) return true
  return false
}

export function buildUnifiedDiffIfPresent(result: unknown): string | undefined {
  if (!result) return undefined
  const raw =
    (extract(result, ['diff']) as string | undefined) ||
    (extract(result, ['patch']) as string | undefined) ||
    (extract(result, ['unifiedDiff']) as string | undefined) ||
    (extract(result, ['result.patch']) as string | undefined) ||
    (extract(result, ['result.diff']) as string | undefined)
  if (typeof raw === 'string' && raw.trim()) return raw
  const nestedPatch = extract(result, ['diff.patch']) as string | undefined
  if (typeof nestedPatch === 'string' && nestedPatch.trim()) return nestedPatch
  if (typeof result === 'string' && result.includes('@@')) return result
  return undefined
}

export function isCompletelyNewFile(result: unknown, diff?: string): boolean {
  const before = extract(result, ['before', 'old', 'previous'])
  const after = extract(result, ['after', 'new'])
  if (!before && after) return true
  const isNewFlag = !!(extract(result, ['isNew']) || extract(result, ['newFile']))
  if (isNewFlag) return true
  if (typeof diff === 'string') {
    const lower = diff.toLowerCase()
    if (lower.includes('new file mode') || lower.includes('--- /dev/null')) return true
  }
  return false
}
