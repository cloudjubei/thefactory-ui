import { splitPath } from './path'

export type GitRenamePathSource = {
  path: string
  status?: string
  oldPath?: string
  renameFrom?: string
}

/** Keep the destination intact and shorten the source relative to their shared directory. */
export function gitRenamePath(file: GitRenamePathSource) {
  if (file.status !== 'R') return undefined
  const from = file.oldPath || file.renameFrom
  if (!from || from === file.path) return undefined

  const { dir } = splitPath(from)
  let sharedLength = 0
  for (let i = 0; i < dir.length && dir[i] === file.path[i]; i++) {
    if (dir[i] === '/' || dir[i] === '\\') sharedLength = i + 1
  }
  return { from: from.slice(sharedLength), title: `${from} → ${file.path}` }
}
