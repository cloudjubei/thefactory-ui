/**
 * Defensive accessors used by the tool-call preview registry on both web
 * and native. Tool payloads are loosely-typed — these helpers extract
 * fields the SDK doesn't promise (`result.diff.patch`, etc.) without
 * throwing. Shared between the web and native renderers so a single source
 * of truth governs extraction behaviour across platforms.
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

/** Default character cap for a rendered tool preview — big enough to be useful, small enough that
 *  serialising + syntax-highlighting it can never block the UI thread. */
export const MAX_TOOL_PREVIEW_CHARS = 20000

/**
 * Serialise a tool value to a display string and CAP it, so a multi-MB result can never freeze the chat UI
 * (a giant DOM node or a synchronous syntax-highlight pass). Strings pass through; everything else becomes
 * pretty JSON. When capped, a truncation marker is appended and `truncated` is set so callers can surface it.
 */
export function safePreviewString(
  v: unknown,
  maxChars: number = MAX_TOOL_PREVIEW_CHARS,
): { text: string; truncated: boolean; omittedChars: number } {
  let full: string
  if (typeof v === 'string') full = v
  else if (v == null) full = ''
  else {
    try {
      full = JSON.stringify(v, null, 2)
    } catch {
      full = String(v)
    }
  }
  if (full.length <= maxChars) return { text: full, truncated: false, omittedChars: 0 }
  const omittedChars = full.length - maxChars
  return {
    text: `${full.slice(0, maxChars)}\n… [${omittedChars.toLocaleString()} more characters truncated]`,
    truncated: true,
    omittedChars,
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

/** Tools whose `getToolHeaderPath` value is a single file path string.
 *  Used by native renderers to pick the dir-truncated `PathDisplay` chrome
 *  instead of plain monospace text. `renamePath` is intentionally absent:
 *  its header is a `src → dst` string, not a single path. Story / feature
 *  refs fall through to text. */
const FILE_PATH_TOOL_NAMES: ReadonlySet<string> = new Set([
  'writeFile',
  'readFileStructure',
  'listContents',
  'getAstOutline',
  'deletePath',
])

export function isFilePathTool(name?: string): boolean {
  return !!name && FILE_PATH_TOOL_NAMES.has(name)
}

/**
 * Optional "what does this tool operate on" line shown under the tool
 * title (web + mobile) and inside the preview header. For file tools we
 * surface the file path; for story/feature ops we surface the
 * `story <id> / feature <id>` reference. Single source of truth for both
 * platforms — keep in sync with what each client renders.
 */
export function getToolHeaderPath(toolCall: {
  name?: string
  arguments?: unknown
}): string | undefined {
  const args = asRecord(toolCall.arguments)
  switch (toolCall.name) {
    case 'writeFile':
    case 'readFileStructure':
    case 'listContents':
    case 'getAstOutline':
      return tryString(args.path)
    case 'deletePath':
      return tryString(args.path)
    case 'renamePath': {
      const src = tryString(args.src)
      const dst = tryString(args.dst)
      if (src && dst) return `${src} → ${dst}`
      return src ?? dst
    }
    case 'addFeature':
    case 'updateStory':
    case 'updateFeature':
    case 'reorderFeature':
    case 'finishFeature':
    case 'blockFeature': {
      const storyId = tryString(args.storyId)
      const featureId = tryString(args.featureId)
      if (storyId && featureId) return `story ${storyId} / feature ${featureId}`
      if (storyId) return `story ${storyId}`
      return undefined
    }
    default:
      return undefined
  }
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
