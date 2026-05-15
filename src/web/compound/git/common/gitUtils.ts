/**
 * Pulls one file's section out of a combined `diff --git` patch. Returns
 * `undefined` when the path isn't present so callers can render a "no
 * patch available" placeholder instead of blanking out.
 */
export function getFilePatch(diffPatch: string | undefined, path: string): string | undefined {
  if (!diffPatch) return undefined
  const blocks = diffPatch.split('\ndiff --git ')
  for (let i = 0; i < blocks.length; i++) {
    let block = blocks[i]
    if (i === 0) {
      if (!block.startsWith('diff --git ')) continue
      block = block.slice('diff --git '.length)
    }
    if (
      block.includes(` b/${path}\n`) ||
      block.includes(` b/${path}\r\n`) ||
      block.startsWith(`a/${path} b/${path}\n`)
    ) {
      return `diff --git ${block}`
    }
  }
  return undefined
}

/**
 * Cheap line-counter over a unified diff body. Skips file headers (`+++`,
 * `---`) and hunk headers (`@@`) so they don't get counted as additions or
 * deletions.
 */
export function countPatchAddDel(patch?: string): { add: number; del: number } {
  if (!patch) return { add: 0, del: 0 }
  let add = 0
  let del = 0
  const lines = patch.replace(/\r\n/g, '\n').split('\n')
  for (const ln of lines) {
    if (ln.startsWith('+++ ') || ln.startsWith('--- ') || ln.startsWith('@@')) continue
    if (ln.startsWith('+')) add += 1
    else if (ln.startsWith('-')) del += 1
  }
  return { add, del }
}
