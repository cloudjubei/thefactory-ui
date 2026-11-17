import { CHAT_FILE_KINDS, CHAT_FILE_UNKNOWN_KIND } from './chatFileChipConstants'
import type { ChatFileKind } from './chatFileChipTypes'

const extensionAt = (name: string): number => {
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1 ? dot : -1
}

/** A file's type in words, from its name's extension. */
export function chatFileKind(path: string): ChatFileKind {
  const name = path.split('/').pop() ?? path
  const dot = extensionAt(name)
  if (dot < 0) return CHAT_FILE_UNKNOWN_KIND
  const ext = name.slice(dot + 1).toLowerCase()
  const known = CHAT_FILE_KINDS[ext]
  if (known) return known
  const upper = ext.toUpperCase()
  return { short: upper, long: `${upper} file` }
}

/** A file's name without its extension, for when its type is said beside it. */
export function chatFileStem(name: string): string {
  const dot = extensionAt(name)
  return dot < 0 ? name : name.slice(0, dot)
}
